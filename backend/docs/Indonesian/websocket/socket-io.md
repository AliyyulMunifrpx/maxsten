# WebSocket Events

Dokumentasi event real-time (Socket.IO) yang dipakai sistem — di luar REST API biasa.

## Koneksi & Autentikasi

Connect ke server socket yang sama dengan base URL REST API. Autentikasi terjadi otomatis **sekali saat koneksi dibuka**, lewat cookie yang sama seperti REST API (bukan lewat payload event).

| Role                      | Cookie yang dibaca | Kalau tidak ada                                           |
| ------------------------- | ------------------ | --------------------------------------------------------- |
| Seller (sudah login)      | `access_token`     | Fallback dicoba sebagai guest                             |
| Buyer (tidak perlu login) | `guest_id`         | Koneksi ditolak: `"Unauthorized: Missing guest identity"` |

- `guest_id` didapat otomatis dari respons `POST` create queue — server men-generate dan menyimpannya sebagai cookie `httpOnly` kalau buyer belum punya. FE tidak perlu membuat `guest_id` sendiri.
- Kalau autentikasi gagal, event `connect_error` akan ter-trigger di sisi client dengan pesan error.
- Setelah berhasil connect, identitas user otomatis tersedia di sisi server sebagai `socket.user` — FE tidak perlu mengirim ulang identitas di tiap event.

## Event yang dikirim CLIENT → SERVER

| Event              | Siapa yang pakai | Payload               | Efek                                                                                                                                                                                                               |
| ------------------ | ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `JOIN_STORE_ROOM`  | Seller           | — (tidak ada payload) | Join ke room `TOKO_<store.id>` milik toko sendiri. Dipakai agar seller menerima notifikasi antrean baru & perubahan status secara real-time di dashboard.                                                          |
| `JOIN_QUEUE_ROOM`  | Buyer            | `queueId` (number)    | Join ke room `ANTREAN_<queueId>`, **hanya kalau** antrean tersebut memang milik `guest_id` yang sedang connect. Kalau bukan miliknya/tidak ditemukan, server balas `ROOM_ERROR` (lihat di bawah), tidak jadi join. |
| `LEAVE_QUEUE_ROOM` | Buyer            | `queueId` (number)    | Keluar dari room `ANTREAN_<queueId>` — panggil ini saat buyer meninggalkan halaman status pesanan, supaya tidak terus menerima update yang tidak relevan lagi.                                                     |

## Event yang dikirim SERVER → CLIENT

| Event            | Room tujuan                                     | Dipicu oleh                                                                                                                 | Payload                                                                                                                                           |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEW_QUEUE`      | `TOKO_<store.id>`                               | Buyer berhasil membuat antrean baru                                                                 | Objek antrean baru lengkap — **tidak** menyertakan field `store` sama sekali (sudah di-destructure sebelum emit, bukan cuma dikosongkan sebagian) |
| `STATUS_UPDATED` | `ANTREAN_<queueId>` **dan** `TOKO_<store_id>`   | Status antrean berubah — dari seller, buyer, atau sistem (cron auto-cancel)                                                 | `{ id, status, reason, triggered_by }` — lihat detail di bawah                                                                       |
| `ROOM_ERROR`     | Balik ke socket pengirim saja (bukan broadcast) | Gagal `JOIN_QUEUE_ROOM` / `JOIN_STORE_ROOM` (antrean/toko tidak ditemukan atau bukan milik yang connect, atau error server) | `{ errors: string }`                                                                                                                              |

### Detail payload `STATUS_UPDATED`

Semua pemicu sekarang memakai **event yang sama** dan **bentuk payload yang sama** — cukup dengarkan 1 event ini untuk semua perubahan status. `reason` selalu ada di payload, isinya `null` kalau perubahan status bukan pembatalan (misal transisi ke `DIPROSES`/`SELESAI`):

```json
{
  "id": 42,
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}
```

```json
{
  "id": 42,
  "status": "DIBATALKAN",
  "reason": "Stok habis",
  "triggered_by": "seller"
}
```

```json
{
  "id": 42,
  "status": "DIBATALKAN",
  "reason": "Lama banget",
  "triggered_by": "buyer"
}
```

```json
{
  "id": 42,
  "status": "DIBATALKAN",
  "reason": "queue is expired",
  "triggered_by": "system"
}
```

`triggered_by` salah satu dari:

| Nilai      | Artinya                                                           | `reason` yang mungkin muncul                                                                                |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `"seller"` | Diubah manual oleh penjual lewat dashboard                        | Diisi kalau seller membatalkan dengan alasan, `null` kalau transisi lain (DIPROSES/SELESAI) atau dibatalkan tanpa alasan |
| `"buyer"`  | Dibatalkan sendiri oleh pembeli                                   | Diisi kalau buyer menyertakan alasan saat cancel, `null` kalau tidak diisi                                               |
| `"system"` | Dibatalkan otomatis oleh cron job karena `expired_at` sudah lewat | Selalu `"Pesanan telah melewati batas pembayaran"`                                                                       |

Payload ini **selalu minimal** (`id`, `status`, `reason`, `triggered_by` saja) — tidak menyertakan `queueDetails`, dsb. Kalau FE butuh detail lengkap setelah menerima event ini, cukup update field yang relevan pada data antrean yang sudah ada di state (dicocokkan lewat `id`), tidak perlu refetch penuh kecuali memang butuh field lain yang tidak ada di payload ini.
