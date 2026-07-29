# Get Queue Details (Buyer)

Mengambil detail dari satu antrean spesifik milik pembeli. Endpoint ini akan mereturn status antrean, rincian pesanan (termasuk _snapshot add-on_), dan waktu _server_ untuk kalkulasi _countdown_ pembayaran.

## Endpoint

```
GET /api/:publicId/queue/:queueId

```

- `:publicId` adalah `public_id` milik toko (format UUID).
- `:queueId` adalah `id` antrean (format Angka/Integer).

## Auth

Cookie-based auth otomatis. Sistem akan membaca cookie `guest_id` dari browser pembeli untuk memastikan bahwa antrean tersebut benar-benar milik pembeli yang sedang mengaksesnya.

## Request

| Param      | Lokasi    | Tipe          | Required | Keterangan                                   |
| ---------- | --------- | ------------- | -------- | -------------------------------------------- |
| `publicId` | URL param | string (UUID) | ✅       | `public_id` toko tempat pembeli memesan.     |
| `queueId`  | URL param | number        | ✅       | ID internal dari antrean yang ingin dilihat. |

## Contoh Request

```bash
curl -X GET "https://example.com/api/f47ac10b-58cc-4372-a567-0e02b2c3d479/queue/10" \
  -H "Cookie: guest_id=11111111-2222-3333-4444-555555555555"

```

## Response

### 200 OK

```json
{
  "data": {
    "id": 10,
    "guest_id": "11111111-2222-3333-4444-555555555555",
    "queue_number": 15,
    "status": "BELUM_BAYAR",
    "note": "Jangan pedes ya bang",
    "total_price": 45000,
    "created_at": "2026-07-28T15:00:00.000Z",
    "expired_at": "2026-07-28T15:30:00.000Z",
    "server_now": "2026-07-28T15:05:00.000Z",
    "queueDetails": [
      {
        "id": "detail-uuid-1",
        "queue_id": 10,
        "product_id": "prod-uuid-1",
        "variant_id": "var-uuid-1",
        "quantity": 2,
        "selected_addons": [
          {
            "id": "addon-uuid-1",
            "name": "Keju",
            "price": 3000
          },
          {
            "id": "addon-uuid-2",
            "name": "Boba",
            "price": 2000
          }
        ],
        "product": {
          "id": "prod-uuid-1",
          "name": "Mie Goreng",
          "price": 15000,
          "image_url": "https://example.com/mie.jpg",
          "description": "mie goreng khas jawa timur"
        },
        "variant": {
          "id": "var-uuid-1",
          "name": "Pedas Mampus",
          "additional_price": 2000
        }
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                                          | `errors`                  |
| ------ | ------------------------------------------------------------------------------------------------ | ------------------------- |
| 400    | Parameter `publicId` bukan UUID yang valid, atau `queueId` bukan angka positif.                  | Pesan validasi (dari Joi) |
| 401    | Pembeli tidak mengirimkan cookie `guest_id` (sesi tidak ditemukan).                              | `Unauthorized`            |
| 404    | Antrean tidak ditemukan.                                                                         | `No queue found`          |
| 404    | Antrean ada, tapi pembeli mencoba mengaksesnya pakai `publicId` toko lain (Keamanan silang).     | `No queue found`          |
| 404    | Antrean ada, tapi `guest_id` di cookie tidak cocok dengan pemilik antrean aslinya (_Anti-Hack_). | `No queue found`          |

## Catatan Tambahan (Untuk Frontend)

- **Aman dari Perubahan Harga/Menu:** Data `selected_addons` yang dikembalikan sudah berbentuk _snapshot_ (mengunci nama dan harga pada saat _checkout_). Jika pemilik toko menghapus _add-on_ atau mengubah harga di kemudian hari, struk antrean ini tidak akan berubah dan tidak akan menyebabkan _error_.
- **Timer Countdown:** Gunakan selisih waktu antara `server_now` dan `expired_at` untuk menampilkan sisa waktu pembayaran secara presisi di layar pembeli. Jangan menggunakan waktu lokal OS _device_ pembeli karena rawan dimanipulasi/tidak sinkron.
