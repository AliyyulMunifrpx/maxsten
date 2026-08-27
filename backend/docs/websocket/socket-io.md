---

# Dokumentasi WebSocket Events

## Dokumentasi event real-time (Socket.IO) yang digunakan sistem di luar REST API standar.

## Koneksi & Autentikasi

Terhubung ke server Socket.IO yang sama dengan base URL REST API.

Autentikasi dilakukan **satu kali saat koneksi Socket.IO dibuat** melalui payload `socket.handshake.auth`.

### Prioritas Sumber Autentikasi

Berdasarkan arsitektur keamanan terbaru (Bearer Token), JWT hanya diterima dari payload auth. Cookie sama sekali tidak digunakan untuk autentikasi user/seller. Cookie (secara fallback) hanya digunakan jika Frontend gagal menyertakan `guestId` di payload untuk pembeli tanpa akun (Guest).

#### Tabel Pemetaan Sumber Data

| Data | Sumber Auth (Payload) | Fallback Cookie | Deskripsi |
| --- | --- | --- | --- |
| **Access Token** | `token` | ❌ *(Tidak Ada)* | Digunakan untuk autentikasi user (Seller) |
| **Guest ID** | `guestId` | `guest_id` | Digunakan untuk identifikasi pembeli tanpa akun (Buyer) |

---

### Contoh Koneksi dari Frontend

```javascript
const socket = io(SOCKET_URL, {
  withCredentials: true, // Wajib true HANYA jika mengandalkan fallback cookie guest_id
  auth: {
    token: accessToken, // Khusus Seller (kosongkan jika Guest)
    guestId: guestId,   // Khusus Buyer (opsional jika mengandalkan cookie)
  },
});

```

*Catatan: Frontend tidak wajib mengirim ulang data identitas di setiap event. Setelah autentikasi berhasil, identitas disimpan oleh server di memori koneksi (`socket.user`).*

---

### Aturan Autentikasi

#### 1. Autentikasi Buyer (Guest)

* Jika `token` tidak ada di payload, server memperlakukan koneksi sebagai **guest** (pembeli).
* Server membutuhkan `guest_id` dari payload `auth.guestId` ATAU dari cookie `guest_id`.
* Jika keduanya tidak tersedia, koneksi ditolak dengan pesan:
> `Unauthorized: Missing auth tokens and guest identity`


* Jika berhasil, server menginisiasi sesi:

```javascript
socket.user = {
  id: guestId,
  role: "buyer",
  name: "Guest",
};

```

*(Guest tidak perlu login untuk menggunakan fitur antrean).*

#### 2. Autentikasi Seller

* Seller **WAJIB** mengirim access token secara manual melalui `auth: { token }`.
* Setelah validasi lewat Supabase Auth, server mencari user terkait di database berdasarkan `supabase_id`.
* Jika ditemukan, server mengeset:

```javascript
socket.user = {
  ...prismaUser,
  role: "seller",
};

```

#### 3. Penanganan Akses Kedaluwarsa (Expired Token)

* **PENTING UNTUK FRONTEND:** Socket.IO server **TIDAK** melakukan auto-refresh token.
* Jika `token` yang dikirim sudah kedaluwarsa atau tidak valid, koneksi socket akan langsung ditolak/diputus.
* Frontend harus mendengarkan event error ini. Jika terjadi *Unauthorized* pada socket, Frontend bertanggung jawab memanggil API REST khusus Refresh Token (`POST /api/auth/refresh`), mendapatkan token baru, dan menginisiasi ulang (*reconnect*) koneksi Socket.IO menggunakan token yang baru tersebut.

#### 4. Penanganan Error Koneksi

Frontend wajib memasang *listener* untuk menangkap kegagalan koneksi:

```javascript
socket.on("connect_error", (error) => {
  console.error("Socket Error:", error.message);
  
  // Contoh penanganan Auto-Refresh dari sisi Frontend:
  if (error.message.includes("Invalid token") || error.message.includes("Expired")) {
      // 1. Panggil REST API Refresh Token
      // 2. Update localStorage/State
      // 3. Panggil socket.connect() ulang dengan token baru
  }
});

```

**Kemungkinan pesan error dari server:**

* `Unauthorized: Missing auth tokens and guest identity`
* `Unauthorized: Invalid token`
* `User database mismatch`

---

## Event yang Dikirim: Client → Server

| Event | Digunakan Oleh | Payload | Efek |
| --- | --- | --- | --- |
| **`JOIN_STORE_ROOM`** | Seller | — (kosong) | Bergabung ke room `TOKO_<store.id>` milik store-nya sendiri |
| **`JOIN_QUEUE_ROOM`** | Buyer | `queueId` (string) | Bergabung ke room `ANTREAN_<queueId>` setelah validasi kepemilikan |
| **`LEAVE_QUEUE_ROOM`** | Buyer | `queueId` (string) | Keluar dari room `ANTREAN_<queueId>` |

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
    guest_id: socket.user.id, // Keamanan ketat agar tidak bisa intip pesanan orang lain
  },
});

```

* Jika valid, akan join ke room `ANTREAN_<queueId>`. Jika tidak valid atau tidak ditemukan, server membalas dengan event `ROOM_ERROR`.
* **Penggunaan:**

```javascript
socket.emit("JOIN_QUEUE_ROOM", "uuid-antrean-123");

```

#### `LEAVE_QUEUE_ROOM`

* Digunakan saat buyer meninggalkan halaman detail status pesanan, agar tidak lagi menerima update yang tidak relevan (menghemat memori browser dan server).
* **Penggunaan:**

```javascript
socket.emit("LEAVE_QUEUE_ROOM", "uuid-antrean-123");

```

---

## Event yang Dikirim: Server → Client

| Event | Room Target | Dipicu Oleh | Payload |
| --- | --- | --- | --- |
| **`NEW_QUEUE`** | `TOKO_<store.id>` | Buyer membuat antrean baru | Objek antrean baru |
| **`STATUS_UPDATED`** | `ANTREAN_<queueId>` & `TOKO_<store_id>` | Perubahan status antrean | `{ id, status, reason, triggered_by }` |
| **`ROOM_ERROR`** | Socket pengirim | Gagal bergabung ke room | `{ errors: string }` |

### Detail Event Server → Client

#### `NEW_QUEUE`

* Dikirim ke room store saat buyer berhasil membuat antrean baru (field `store` di-destructure/dihapus sebelum dikirim). Digunakan seller untuk memicu notifikasi suara/visual di dashboard secara real-time.

#### `STATUS_UPDATED`

* Digunakan untuk semua perubahan status antrean.
* **Payload Dasar:**

```json
{
  "id": "uuid-antrean-123",
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}

```

* **Variasi `triggered_by` & `reason`:**
* **Dibatalkan oleh Seller:** `status: "DIBATALKAN", reason: "Stok habis", triggered_by: "seller"`
* **Dibatalkan oleh Buyer:** `status: "DIBATALKAN", reason: "Lama banget", triggered_by: "buyer"`
* **Dibatalkan Otomatis (Sistem):** `status: "DIBATALKAN", reason: "Pesanan telah melewati batas pembayaran", triggered_by: "system"`



#### `ROOM_ERROR`

* Dikirim khusus ke socket yang meminta, saat gagal bergabung ke room (misalnya karena `queueId` tidak ada atau bukan miliknya).
* **Payload:**

```json
{
  "errors": "Queue not found or unauthorized access."
}

```

---

## Catatan Penting untuk Frontend (FE)

1. **Bukan Sumber Kebenaran Utama:** Socket.IO hanya bertindak sebagai *trigger* notifikasi; database dan REST API tetap menjadi sumber kebenaran utama (*source of truth*).
2. **Trigger Sinkronisasi:** Sangat disarankan menggunakan `STATUS_UPDATED` sebagai trigger untuk melakukan re-fetch data lewat API (misalnya menggunakan fungsi Invalidate dari React Query / SWR):

```javascript
socket.on("STATUS_UPDATED", (payload) => {
  queryClient.invalidateQueries({
    queryKey: ["queue", payload.id],
  });
});

```

3. **Waktu Eksekusi `JOIN_QUEUE_ROOM`:** Buyer disarankan memanggil `JOIN_QUEUE_ROOM` segera setelah mendapat respon sukses dari API pembuatan antrean, dan saat me-refresh/membuka halaman detail antrean.
