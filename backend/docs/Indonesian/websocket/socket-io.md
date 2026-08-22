# Dokumentasi WebSocket Events

Dokumentasi event real-time (Socket.IO) yang digunakan sistem di luar REST API standar.

---

## Koneksi & Autentikasi

Terhubung ke server Socket.IO yang sama dengan base URL REST API.

Autentikasi dilakukan **satu kali saat koneksi Socket.IO dibuat** melalui `socket.handshake.auth`.

### Prioritas Sumber Autentikasi

Urutan pengambilan data oleh server:

1. `socket.handshake.auth`
2. Cookie di `socket.handshake.headers.cookie`

#### Tabel Pemetaan Sumber Data

| Data | Sumber Auth | Fallback Cookie | Deskripsi |
| --- | --- | --- | --- |
| **Access Token** | `token` | `access_token` | Digunakan untuk autentikasi user |
| **Refresh Token** | `refreshToken` | `refresh_token` | Digunakan untuk memperbarui access token yang kedaluwarsa |
| **Guest ID** | `guestId` | `guest_id` | Digunakan untuk identifikasi buyer guest |

---

### Contoh Koneksi dari Frontend

```javascript
const socket = io(SOCKET_URL, {
  withCredentials: true,
  auth: {
    token: accessToken,
    refreshToken: refreshToken,
    guestId: guestId,
  },
});
```

*Catatan: Frontend tidak wajib mengirim ulang data identitas di setiap event. Setelah autentikasi berhasil, identitas disimpan oleh server di `socket.user`.*

---

### Aturan Autentikasi

#### 1. Autentikasi Buyer Guest

* Jika `access_token` maupun `refresh_token` tidak ada, server memperlakukan koneksi sebagai **guest**.
* Server membutuhkan `guest_id` dari `socket.handshake.auth.guestId` atau cookie `guest_id`.
* Jika keduanya tidak tersedia, koneksi ditolak dengan pesan:
> `Unauthorized: Missing auth tokens and guest identity`

* Jika berhasil, server akan mengeset:
```javascript
socket.user = {
  id: guestId,
  role: "buyer",
  name: "Guest",
};
```

*(Guest tidak perlu login untuk menggunakan fitur antrean).*

#### 2. Autentikasi Seller

* Seller mengirim access token melalui `auth: { token, refreshToken }` atau cookie `access_token`.
* Setelah validasi lewat Supabase Auth, server mencari user terkait di database berdasarkan `supabase_id`.
* Jika ditemukan, server mengeset:
```javascript
socket.user = {
  ...prismaUser,
  role: "seller",
};
```

#### 3. Refresh Access Token

* Jika access token sudah kedaluwarsa tapi refresh token masih valid, server melakukan refresh session lewat Supabase.
* Token baru dikirim ke client melalui event `token_refreshed`.
* **Payload:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

* **Listener di Client:**
```javascript
socket.on("token_refreshed", (newTokens) => {
  localStorage.setItem("access_token", newTokens.accessToken);
  localStorage.setItem("refresh_token", newTokens.refreshToken);
});
```

* Jika gagal, koneksi ditolak dengan pesan:
> `Session Expired. Please login again.`

#### 4. Penanganan Error Koneksi

```javascript
socket.on("connect_error", (error) => {
  console.error(error.message);
});
```

**Kemungkinan pesan error:**

* `Unauthorized: Missing auth tokens and guest identity`
* `Unauthorized: Invalid token`
* `Session Expired. Please login again.`
* `User database mismatch`

---

## Event yang Dikirim: Client → Server

| Event | Digunakan Oleh | Payload | Efek |
| --- | --- | --- | --- |
| **`JOIN_STORE_ROOM`** | Seller | — (kosong) | Bergabung ke room `TOKO_<store.id>` milik store-nya sendiri |
| **`JOIN_QUEUE_ROOM`** | Buyer | `queueId` (number) | Bergabung ke room `ANTREAN_<queueId>` setelah validasi kepemilikan |
| **`LEAVE_QUEUE_ROOM`** | Buyer | `queueId` (number) | Keluar dari room `ANTREAN_<queueId>` |

### Detail Event Client → Server

#### `JOIN_STORE_ROOM`

* Digunakan seller untuk bergabung ke room store mereka. Server menggunakan identitas dari `socket.user`, sehingga tidak perlu `storeId` di payload.
* **Room:** `TOKO_<store.id>`
* **Penggunaan:**
```javascript
socket.emit("JOIN_STORE_ROOM");
```

#### `JOIN_QUEUE_ROOM`

* Digunakan buyer untuk bergabung ke room antrean tertentu setelah server memverifikasi kepemilikan antrean di database:
```javascript
const queue = await prisma.queue.findFirst({
  where: {
    id: queueId,
    guest_id: socket.user.id,
  },
});
```

* Jika valid, akan join ke room `ANTREAN_<queueId>`. Jika tidak valid atau tidak ditemukan, server membalas dengan event `ROOM_ERROR`.
* **Penggunaan:**
```javascript
socket.emit("JOIN_QUEUE_ROOM", 42);
```

#### `LEAVE_QUEUE_ROOM`

* Digunakan saat buyer meninggalkan halaman detail status pesanan, agar tidak lagi menerima update yang tidak relevan.
* **Penggunaan:**
```javascript
socket.emit("LEAVE_QUEUE_ROOM", 42);
```

---

## Event yang Dikirim: Server → Client

| Event | Room Target | Dipicu Oleh | Payload |
| --- | --- | --- | --- |
| **`NEW_QUEUE`** | `TOKO_<store.id>` | Buyer membuat antrean baru | Objek antrean baru |
| **`STATUS_UPDATED`** | `ANTREAN_<queueId>` & `TOKO_<store_id>` | Perubahan status antrean | `{ id, status, reason, triggered_by }` |
| **`ROOM_ERROR`** | Socket pengirim | Gagal bergabung ke room | `{ errors: string }` |
| **`token_refreshed`** | Socket pengirim | Refresh token berhasil | `{ accessToken, refreshToken }` |

### Detail Event Server → Client

#### `NEW_QUEUE`

* Dikirim ke room store saat buyer berhasil membuat antrean baru (field `store` di-destructure/dihapus sebelum dikirim). Digunakan seller untuk update dashboard secara real-time.

#### `STATUS_UPDATED`

* Digunakan untuk semua perubahan status antrean.
* **Payload Dasar:**
```json
{
  "id": 42,
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}
```

* **Variasi `triggered_by` & `reason`:**
* **Dibatalkan oleh Seller:**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Stok habis", "triggered_by": "seller" }
```

* **Dibatalkan oleh Buyer:**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Lama banget", "triggered_by": "buyer" }
```

* **Dibatalkan Otomatis (Sistem):**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Pesanan telah melewati batas pembayaran", "triggered_by": "system" }
```

#### `ROOM_ERROR`

* Dikirim khusus ke socket yang meminta, saat gagal bergabung ke room.
* **Payload:**
```json
{
  "errors": "Queue not found or unauthorized access."
}
```

---

## Catatan Penting untuk Frontend (FE)

1. **Bukan Sumber Kebenaran Utama:** Socket.IO bukan sumber data utama; database dan REST API tetap menjadi sumber kebenaran utama (source of truth).
2. **Trigger Sinkronisasi:** Gunakan `STATUS_UPDATED` sebagai trigger untuk refetch data lewat API (misalnya pakai React Query):
```javascript
socket.on("STATUS_UPDATED", (payload) => {
  queryClient.invalidateQueries({
    queryKey: ["queue", payload.id],
  });
});
```

3. **Waktu Eksekusi `JOIN_QUEUE_ROOM`:** Buyer disarankan memanggil `JOIN_QUEUE_ROOM` segera setelah pembuatan antrean berhasil, dan saat membuka halaman detail antrean.
