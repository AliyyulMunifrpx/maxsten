```markdown
# WebSocket Events Documentation

Dokumentasi event real-time (Socket.IO) yang dipakai sistem di luar REST API biasa.

---

## Koneksi & Autentikasi

Connect ke server Socket.IO yang sama dengan *base URL* REST API.

Autentikasi dilakukan **sekali saat koneksi Socket.IO dibuka** melalui `socket.handshake.auth`.

### Prioritas Sumber Autentikasi

Urutan pengambilan data oleh server:
1. `socket.handshake.auth`
2. Cookie pada `socket.handshake.headers.cookie`

#### Tabel Pemetaan Sumber Data

| Data | Sumber Auth | Fallback Cookie | Keterangan |
| :--- | :--- | :--- | :--- |
| **Access Token** | `token` | `access_token` | Digunakan untuk autentikasi user |
| **Refresh Token** | `refreshToken` | `refresh_token` | Digunakan untuk memperbarui access token yang *expired* |
| **Guest ID** | `guestId` | `guest_id` | Digunakan untuk mengidentifikasi *buyer guest* |

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

*Catatan: Frontend tidak wajib mengirim ulang identitas pada setiap event. Setelah autentikasi berhasil, identitas disimpan oleh server pada `socket.user`.*

---

### Aturan Autentikasi

#### 1. Autentikasi Buyer Guest

* Jika tidak terdapat `access_token` maupun `refresh_token`, server akan menganggap koneksi sebagai **guest**.
* Server membutuhkan `guest_id` dari `socket.handshake.auth.guestId` atau *cookie* `guest_id`.
* Jika keduanya tidak tersedia, koneksi ditolak dengan pesan:
> `Unauthorized: Missing auth tokens and guest identity`


* Jika berhasil, server menetapkan:
```javascript
socket.user = {
  id: guestId,
  role: "buyer",
  name: "Guest",
};

```


*(Guest tidak perlu login untuk menggunakan fitur antrean).*

#### 2. Autentikasi Seller

* Seller mengirim access token melalui `auth: { token, refreshToken }` atau *cookie* `access_token`.
* Setelah divalidasi melalui Supabase Auth, server mencari *user* terkait di database berdasarkan `supabase_id`.
* Jika ditemukan, server menetapkan:
```javascript
socket.user = {
  ...prismaUser,
  role: "seller",
};

```



#### 3. Refresh Access Token

* Jika *access token* sudah *expired* tetapi *refresh token* masih valid, server melakukan *refresh session* melalui Supabase.
* Token baru dikirim ke *client* melalui event `token_refreshed`.
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

## Event yang Dikirim: Client $\rightarrow$ Server

| Event | Siapa yang Pakai | Payload | Efek |
| --- | --- | --- | --- |
| **`JOIN_STORE_ROOM`** | Seller | — (kosong) | Join ke room `TOKO_<store.id>` milik toko sendiri |
| **`JOIN_QUEUE_ROOM`** | Buyer | `queueId` (number) | Join ke room `ANTREAN_<queueId>` setelah validasi kepemilikan |
| **`LEAVE_QUEUE_ROOM`** | Buyer | `queueId` (number) | Keluar dari room `ANTREAN_<queueId>` |

### Detail Event Client $\rightarrow$ Server

#### `JOIN_STORE_ROOM`

* Digunakan oleh *seller* untuk bergabung ke room tokonya. Server menggunakan identitas dari `socket.user` sehingga tidak memerlukan `storeId` dari payload.
* **Room:** `TOKO_<store.id>`
* **Penggunaan:**
```javascript
socket.emit("JOIN_STORE_ROOM");

```



#### `JOIN_QUEUE_ROOM`

* Digunakan *buyer* untuk bergabung ke room antrean tertentu setelah server memverifikasi kepemilikan antrean di database:
```javascript
const queue = await prisma.queue.findFirst({
  where: {
    id: queueId,
    guest_id: socket.user.id,
  },
});

```


* Jika valid, masuk ke room `ANTREAN_<queueId>`. Jika tidak valid/ditemukan, server membalas dengan event `ROOM_ERROR`.
* **Penggunaan:**
```javascript
socket.emit("JOIN_QUEUE_ROOM", 42);

```



#### `LEAVE_QUEUE_ROOM`

* Digunakan ketika *buyer* meninggalkan halaman detail status pesanan agar tidak terus menerima *update* yang tidak relevan.
* **Penggunaan:**
```javascript
socket.emit("LEAVE_QUEUE_ROOM", 42);

```



---

## Event yang Dikirim: Server $\rightarrow$ Client

| Event | Room Tujuan | Dipicu Oleh | Payload |
| --- | --- | --- | --- |
| **`NEW_QUEUE`** | `TOKO_<store.id>` | Buyer membuat antrean baru | Objek antrean baru |
| **`STATUS_UPDATED`** | `ANTREAN_<queueId>` & `TOKO_<store_id>` | Perubahan status antrean | `{ id, status, reason, triggered_by }` |
| **`ROOM_ERROR`** | Socket pengirim | Gagal *join* room | `{ errors: string }` |
| **`token_refreshed`** | Socket pengirim | Pembaruan token sukses | `{ accessToken, refreshToken }` |

### Detail Event Server $\rightarrow$ Client

#### `NEW_QUEUE`

* Dikirim ke room toko ketika *buyer* berhasil membuat antrean baru (field `store` di-destructure/dihilangkan sebelum dikirim). Digunakan *seller* untuk memperbarui *dashboard*.

#### `STATUS_UPDATED`

* Digunakan untuk seluruh perubahan status antrean.
* **Payload Dasar:**
```json
{
  "id": 42,
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}

```


* **Contoh Variasi `triggered_by` & `reason`:**
* **Pembatalan oleh Seller:**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Stok habis", "triggered_by": "seller" }

```


* **Pembatalan oleh Buyer:**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Lama banget", "triggered_by": "buyer" }

```


* **Pembatalan Otomatis (Sistem):**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Pesanan telah melewati batas pembayaran", "triggered_by": "system" }

```





#### `ROOM_ERROR`

* Dikirim hanya kepada *socket* yang meminta ketika gagal bergabung ke sebuah room.
* **Payload:**
```json
{
  "errors": "Queue not found or unauthorized access."
}

```



---

## Catatan Penting untuk Frontend (FE)

1. **Bukan Sumber Kebenaran Utama:** Socket.IO bukan sumber data utama; database/REST API tetap menjadi acuan utama (*source of truth*).
2. **Trigger untuk Sinkronisasi:** Gunakan `STATUS_UPDATED` sebagai *trigger* untuk memanggil ulang API (misalnya menggunakan React Query):
```javascript
socket.on("STATUS_UPDATED", (payload) => {
  queryClient.invalidateQueries({
    queryKey: ["queue", payload.id],
  });
});

```


3. **Waktu Eksekusi `JOIN_QUEUE_ROOM`:** Buyer disarankan melakukan `JOIN_QUEUE_ROOM` sesaat setelah *create queue* berhasil dan ketika membuka halaman detail antrean.

```

```
