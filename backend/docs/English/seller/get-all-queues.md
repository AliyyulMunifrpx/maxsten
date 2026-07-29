# Get Store Queues (Live Antrean)

Ambil daftar antrean aktif hari ini untuk toko, plus status buka/tutup toko saat ini. Dipakai buat halaman kasir/dashboard live antrean.

## Endpoint

```
GET /api/stores/queues/:storeId
```

`:storeId` adalah `public_id` toko.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan toko yang diminta memang milik user yang login.

## Request

| Param     | Lokasi    | Tipe                      | Required | Keterangan                          |
| --------- | --------- | ------------------------- | -------- | ----------------------------------- |
| `storeId` | URL param | string (UUID/`public_id`) | ✅       | —                                   |
| `page`    | query     | number                    | ❌       | Default `1`. 20 antrean per halaman |

## Contoh Request

```bash
curl -X GET "https://example.com/api/stores/queues/str_8kd93jf82j?page=1" \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "storeStatus": {
      "is_open": true,
      "timezone": "Asia/Jakarta"
    },
    "currentPage": [
      {
        "id": 501,
        "queue_number": 12,
        "total_price": 15000,
        "status": "DIPROSES",
        "created_at": "2026-07-27T10:00:00.000Z",
        "expired_at": "2026-07-27T11:00:00.000Z",
        "note": null,
        "queueDetails": [
          {
            "id": 900,
            "quantity": 1,
            "selected_addons": null,
            "product": {
              "id": 1,
              "name": "Kopi",
              "price": 15000,
              "image_url": null
            },
            "variant": null
          }
        ]
      }
    ],
    "nextPage": [
      "...20 antrean halaman berikutnya, atau [] kalau sudah habis..."
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 25,
      "totalPages": 2
    }
  }
}
```

### Error

| Status | Kondisi                                                     | `errors`                                   |
| ------ | ----------------------------------------------------------- | ------------------------------------------ |
| 401    | Tidak login / session expired                               | `Unauthorized`                             |
| 404    | `storeId` tidak ditemukan, atau bukan milik user yang login | `Store not found or you don't have access` |

## Catatan

- **Hanya antrean berstatus `BELUM_BAYAR` atau `DIPROSES` yang muncul** di sini — antrean yang sudah `SELESAI`/`DIBATALKAN` tidak ditampilkan (untuk itu, pakai `GET /api/stores/history`).
- **Tidak ada batasan tanggal** — antrean dari sesi malam kemarin yang masih berlangsung (belum diselesaikan/dibayar) tetap muncul, meskipun sekarang sudah lewat tengah malam. Ini penting untuk toko yang jam operasionalnya menyeberang tengah malam (misal buka 20:00, tutup 04:00) — kasir tetap bisa melihat & menyelesaikan antrean dari sesi sebelumnya tanpa kehilangan datanya begitu tanggal berganti.
- Pembersihan antrean yang sudah basi/kedaluwarsa (misal `BELUM_BAYAR` yang melewati `expired_at`) dilakukan oleh proses terpisah (cron job, berjalan tiap 1 menit) yang mengubah statusnya jadi `DIBATALKAN` — bukan disembunyikan lewat query di endpoint ini. Karena itu, ada jeda maksimal ±1 menit antara sebuah antrean melewati `expired_at` dan statusnya benar-benar berubah — selama jeda itu, antrean tersebut masih akan muncul di endpoint ini apa adanya.
- `expired_at` tiap antrean adalah **snapshot** yang dihitung sekali saat antrean dibuat, berdasarkan `payment_timeout` toko yang berlaku _saat itu_ — bukan nilai dinamis yang ikut berubah kalau `payment_timeout` toko diubah setelahnya. Jadi antrean-antrean lama di list ini bisa saja punya durasi tenggat yang berbeda-beda kalau toko pernah mengubah `payment_timeout` di antara waktu pembuatannya.
- Data diurutkan **FIFO** (`created_at` ascending, yang paling lama dibuat muncul duluan) — cocok buat tampilan antrean kasir yang harus dilayani berurutan.
- Sama seperti `GET /api/stores/all-products/:publicId`, `nextPage` adalah data prefetch buat halaman setelahnya — pakai pola caching yang sama di FE biar transisi antar halaman instan.
- **`storeStatus.is_open` tidak memengaruhi apakah antrean ditampilkan.** Antrean tetap muncul penuh meskipun toko sedang tutup (manual atau di luar jadwal) — kasir tetap perlu bisa melihat & menyelesaikan antrean yang sudah masuk sebelumnya, terlepas dari status buka/tutup toko saat ini.
