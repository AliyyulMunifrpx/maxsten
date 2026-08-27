# Dokumentasi WebSocket Events

Dokumentasi ini menjelaskan event real-time berbasis **Socket.IO** yang digunakan oleh sistem di luar REST API standar.

---

## 1. Koneksi & Autentikasi

Client terhubung ke server **Socket.IO** menggunakan base URL yang sama dengan REST API.

Autentikasi dilakukan **satu kali saat koneksi Socket.IO dibuat** melalui payload `socket.handshake.auth`.

> Sistem menggunakan arsitektur **100% cookie-less**, sehingga autentikasi tidak menggunakan cookie maupun `withCredentials`.

### Pemetaan Sumber Data Autentikasi

| Data             | Field pada Auth Payload | Deskripsi                                     |
| ---------------- | ----------------------- | --------------------------------------------- |
| **Access Token** | `token`                 | Digunakan untuk autentikasi Seller            |
| **Guest ID**     | `guestId`               | Digunakan untuk identifikasi Buyer tanpa akun |

### Contoh Koneksi dari Frontend

```javascript
const socket = io(SOCKET_URL, {
  auth: {
    token: accessToken, // Khusus Seller
    guestId: guestId,   // Khusus Buyer
  },
});
```

> Untuk koneksi Buyer, `token` dapat dikosongkan atau tidak dikirim.
> Untuk koneksi Seller, `guestId` tidak perlu dikirim.

Setelah autentikasi berhasil, server menyimpan identitas pengguna pada memori koneksi melalui:

```javascript
socket.user;
```

Frontend **tidak perlu mengirim ulang data identitas pada setiap event**.

---

# 2. Aturan Autentikasi

## 2.1 Autentikasi Buyer (Guest)

Jika `token` tidak tersedia pada payload autentikasi, server akan memperlakukan koneksi tersebut sebagai **Buyer/Guest**.

Server hanya membaca identitas guest dari:

```javascript
auth.guestId;
```

Jika `guestId` kosong atau tidak dikirim, koneksi akan langsung ditolak dengan pesan:

```text
Unauthorized: Missing auth tokens and guest identity
```

Jika autentikasi berhasil, server akan menginisialisasi user sebagai berikut:

```javascript
socket.user = {
  id: guestId,
  role: "buyer",
  name: "Guest",
};
```

---

## 2.2 Autentikasi Seller

Seller wajib mengirimkan access token melalui payload:

```javascript
auth: {
  token: accessToken,
}
```

Server kemudian akan:

1. Memvalidasi token melalui Supabase Auth.
2. Mencari user terkait di database berdasarkan `supabase_id`.
3. Menyimpan data user ke `socket.user`.

Contoh hasilnya:

```javascript
socket.user = {
  ...prismaUser,
  role: "seller",
};
```

---

## 2.3 Penanganan Access Token Kedaluwarsa

> **Penting untuk Frontend**

Socket.IO server **tidak melakukan auto-refresh token**. Hal ini dilakukan untuk mencegah potensi *race condition* pada proses autentikasi dan koneksi.

Jika token yang dikirim sudah kedaluwarsa atau tidak valid, koneksi socket akan langsung ditolak.

Frontend bertanggung jawab untuk:

1. Mendeteksi error autentikasi.
2. Memanggil REST API Refresh Token.
3. Menyimpan token baru.
4. Memperbarui token Socket.IO.
5. Melakukan koneksi ulang.

Endpoint refresh token:

```text
POST /api/users/refresh
```

---

## 2.4 Penanganan Error Koneksi

Frontend wajib memasang listener untuk menangkap kegagalan koneksi Socket.IO.

```javascript
socket.on("connect_error", async (error) => {
  console.error("Socket Error:", error.message);

  if (
    error.message.includes("Invalid token") ||
    error.message.includes("Expired")
  ) {
    // 1. Panggil REST API refresh token
    // 2. Simpan token baru
    // 3. Update socket.auth
    // 4. Lakukan reconnect
  }
});
```

Kemungkinan pesan error dari server:

* `Unauthorized: Missing auth tokens and guest identity`
* `Unauthorized: Invalid token`
* `User database mismatch`

---

# 3. Event Client → Server

| Event              | Digunakan Oleh | Payload   | Fungsi                             |
| ------------------ | -------------- | --------- | ---------------------------------- |
| `JOIN_STORE_ROOM`  | Seller         | —         | Bergabung ke room store miliknya   |
| `JOIN_QUEUE_ROOM`  | Buyer          | `queueId` | Bergabung ke room antrean tertentu |
| `LEAVE_QUEUE_ROOM` | Buyer          | `queueId` | Keluar dari room antrean tertentu  |

---

## 3.1 `JOIN_STORE_ROOM`

Digunakan oleh Seller untuk bergabung ke room store miliknya sendiri.

Frontend tidak perlu mengirim `storeId` karena server menggunakan identitas dari:

```javascript
socket.user;
```

Format room:

```text
TOKO_<store.id>
```

### Penggunaan

```javascript
socket.emit("JOIN_STORE_ROOM");
```

---

## 3.2 `JOIN_QUEUE_ROOM`

Digunakan oleh Buyer untuk bergabung ke room antrean tertentu.

Sebelum mengizinkan user bergabung, server akan memverifikasi bahwa antrean tersebut benar-benar dimiliki oleh guest yang sedang terhubung.

Contoh validasi:

```javascript
const queue = await prisma.queue.findFirst({
  where: {
    id: queueId,
    guest_id: socket.user.id,
  },
});
```

Validasi ini bertujuan mencegah Buyer mengakses atau menerima update antrean milik pengguna lain.

Jika valid, socket akan bergabung ke room:

```text
ANTREAN_<queueId>
```

Jika antrean tidak ditemukan atau tidak dimiliki oleh user tersebut, server akan mengirim event:

```text
ROOM_ERROR
```

### Penggunaan

```javascript
socket.emit("JOIN_QUEUE_ROOM", "uuid-antrean-123");
```

---

## 3.3 `LEAVE_QUEUE_ROOM`

Digunakan ketika Buyer meninggalkan halaman detail status pesanan.

Tujuannya agar client tidak lagi menerima update yang tidak relevan dan membantu mengurangi penggunaan resource pada browser maupun server.

### Penggunaan

```javascript
socket.emit("LEAVE_QUEUE_ROOM", "uuid-antrean-123");
```

---

# 4. Event Server → Client

| Event            | Room Target                               | Dipicu Oleh                | Payload                                |
| ---------------- | ----------------------------------------- | -------------------------- | -------------------------------------- |
| `NEW_QUEUE`      | `TOKO_<store.id>`                         | Buyer membuat antrean baru | Objek antrean baru                     |
| `STATUS_UPDATED` | `ANTREAN_<queueId>` dan `TOKO_<store_id>` | Perubahan status antrean   | `{ id, status, reason, triggered_by }` |
| `ROOM_ERROR`     | Socket pengirim                           | Gagal bergabung ke room    | `{ errors: string }`                   |

---

## 4.1 `NEW_QUEUE`

Event ini dikirim ke room store ketika Buyer berhasil membuat antrean baru.

Target room:

```text
TOKO_<store.id>
```

Sebelum data dikirim, field `store` akan dihapus dari objek antrean.

Event ini dapat digunakan Seller untuk:

* Menampilkan notifikasi real-time.
* Memutar notifikasi suara.
* Memperbarui daftar antrean.
* Menampilkan indikator pesanan baru pada dashboard.

---

## 4.2 `STATUS_UPDATED`

Event ini digunakan untuk memberi tahu perubahan status antrean secara real-time.

Event dikirim ke:

```text
ANTREAN_<queueId>
```

dan:

```text
TOKO_<store_id>
```

### Struktur Payload

```json
{
  "id": "uuid-antrean-123",
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}
```

### Variasi `triggered_by`

#### Dibatalkan oleh Seller

```json
{
  "id": "uuid-antrean-123",
  "status": "DIBATALKAN",
  "reason": "Stok habis",
  "triggered_by": "seller"
}
```

#### Dibatalkan oleh Buyer

```json
{
  "id": "uuid-antrean-123",
  "status": "DIBATALKAN",
  "reason": "Lama banget",
  "triggered_by": "buyer"
}
```

#### Dibatalkan Otomatis oleh Sistem

```json
{
  "id": "uuid-antrean-123",
  "status": "DIBATALKAN",
  "reason": "Pesanan telah melewati batas pembayaran",
  "triggered_by": "system"
}
```

---

## 4.3 `ROOM_ERROR`

Event ini dikirim **hanya ke socket yang melakukan request** ketika proses bergabung ke room gagal.

Contohnya:

* `queueId` tidak ditemukan.
* Antrean bukan milik Buyer yang sedang terhubung.
* User tidak memiliki akses ke room tersebut.

### Struktur Payload

```json
{
  "errors": "Queue not found or unauthorized access."
}
```

Contoh listener di frontend:

```javascript
socket.on("ROOM_ERROR", (payload) => {
  console.error("Room Error:", payload.errors);
});
```

---

# 5. Rekomendasi Implementasi Frontend

## 5.1 Socket Bukan Source of Truth

Socket.IO hanya berfungsi sebagai **trigger untuk notifikasi dan sinkronisasi real-time**.

Sumber kebenaran utama tetap:

* Database
* REST API

Jangan menjadikan payload Socket.IO sebagai satu-satunya sumber data aplikasi.

---

## 5.2 Gunakan Event sebagai Trigger Sinkronisasi

Disarankan menggunakan event `STATUS_UPDATED` untuk memicu pengambilan ulang data melalui REST API.

Contoh menggunakan React Query:

```javascript
socket.on("STATUS_UPDATED", (payload) => {
  queryClient.invalidateQueries({
    queryKey: ["queue", payload.id],
  });
});
```

Dengan pendekatan ini, Socket.IO hanya memberi sinyal bahwa data berubah, sedangkan data terbaru tetap diambil dari API.

---

## 5.3 Waktu Memanggil `JOIN_QUEUE_ROOM`

Buyer disarankan memanggil `JOIN_QUEUE_ROOM` pada kondisi berikut:

1. Setelah berhasil membuat antrean melalui REST API.
2. Saat membuka halaman detail antrean.
3. Saat halaman di-refresh dan data antrean masih aktif.

Contoh:

```javascript
socket.emit("JOIN_QUEUE_ROOM", queueId);
```

Ketika user meninggalkan halaman detail antrean:

```javascript
socket.emit("LEAVE_QUEUE_ROOM", queueId);
```

---

# 6. Ringkasan Alur

```text
SELLER
  │
  ├── Connect Socket
  │     └── auth: { token }
  │
  └── JOIN_STORE_ROOM
        └── TOKO_<store.id>
              │
              ├── NEW_QUEUE
              └── STATUS_UPDATED


BUYER / GUEST
  │
  ├── Connect Socket
  │     └── auth: { guestId }
  │
  └── JOIN_QUEUE_ROOM(queueId)
        │
        └── Server Validasi Kepemilikan
              │
              └── ANTREAN_<queueId>
                    │
                    └── STATUS_UPDATED
```

## Prinsip Utama

* Autentikasi Socket.IO dilakukan melalui `socket.handshake.auth`.
* Sistem tidak menggunakan cookie.
* Seller menggunakan `token`.
* Buyer/Guest menggunakan `guestId`.
* Identitas user disimpan pada `socket.user`.
* Socket.IO digunakan sebagai mekanisme notifikasi dan trigger sinkronisasi.
* Database dan REST API tetap menjadi **source of truth**.
* Akses room antrean harus selalu divalidasi berdasarkan kepemilikan `guest_id`.
* Frontend bertanggung jawab melakukan refresh token dan reconnect ketika token Socket.IO kedaluwarsa.
