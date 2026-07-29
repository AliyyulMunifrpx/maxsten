# Store Dashboard

Ringkasan cepat kondisi toko untuk halaman utama dashboard seller — status buka/tutup, produk & add-on terbaru, antrean yang paling lama menunggu, dan metrik hari ini (dibandingkan kemarin di jam yang sama).

## Endpoint

```
GET /api/stores/dashboard
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dashboard selalu untuk toko milik user yang login, tidak menerima parameter toko apa pun dari luar.

## Request

Tidak ada parameter — cukup cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/stores/dashboard \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "store": {
      "public_id": "8kd93jf82j",
      "name": "Warung Sumber Rejeki",
      "description": "Toko kelontong harian",
      "logo_url": "/uploads/logo-123.png",
      "is_open": true
    },
    "lists": {
      "latest_products": [
        {
          "id": "prod-uuid-1",
          "name": "Es Teh",
          "price": 5000,
          "image_url": null,
          "is_available": true
        }
      ],
      "latest_addons": [
        {
          "id": 1,
          "name": "Extra Gula",
          "price": 1000,
          "addon_group_id": "addon-group-uuid-1"
        }
      ],
      "oldest_active_queues": [
        {
          "id": 42,
          "queue_number": 3,
          "status": "BELUM_BAYAR",
          "total_price": 15000,
          "created_at": "2026-07-27T10:00:00.000Z"
        }
      ]
    },
    "today": {
      "omzet": { "value": 150000, "trend": 12.4 },
      "pesanan_selesai": { "value": 8, "trend": 33.3 },
      "pesanan_batal": { "value": 1, "trend": -50.0 },
      "aov": { "value": 18750, "trend": -5.2 },
      "peak_hour": "12:00 - 13:00",
      "hourly_traffic": [
        0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 2, 3, 5, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  }
}
```

### Error

| Status | Kondisi                       | `errors`               |
| ------ | ----------------------------- | ---------------------- |
| 401    | Tidak login / session expired | `Unauthorized`         |
| 404    | User belum punya toko         | `Toko tidak ditemukan` |

## Catatan

- **`lists` selalu maksimal 5 item**, tidak bisa diatur/dipagination — ini murni ringkasan untuk landing page dashboard, bukan pengganti `GET /api/stores/all-products/:publicId` atau `GET /api/stores/queues/:storeId` yang punya data lengkap + pagination.
- **`latest_addons[].addon_group_id` disertakan** supaya FE bisa langsung tahu addon itu berada di grup add-on yang mana, tanpa perlu request tambahan (misal untuk membuat link "lihat grup addon ini").
- **`oldest_active_queues` cuma berisi status `BELUM_BAYAR`/`DIPROSES`**, diurutkan dari yang **paling lama menunggu** — supaya kasir langsung lihat antrean mana yang paling butuh segera ditangani.
- **Semua metrik di `today` dibandingkan dengan KEMARIN, di jam-menit yang sama persis** — bukan dibandingkan bulan lalu. Kalau sekarang jam 14:30, "kemarin" yang dipakai sebagai pembanding juga cuma dihitung sampai jam 14:30 kemarin, bukan kemarin penuh sehari — supaya perbandingannya adil (rentang waktu yang dibandingkan sama panjang persis).
- **`aov.trend` dihitung dari rasio omzet/pesanan yang belum dibulatkan**, baru nilai `aov.value` yang ditampilkan dibulatkan — supaya trend persentasenya tidak bias akibat pembulatan ganda.
- `peak_hour` dan `hourly_traffic` cuma dihitung dari transaksi **hari ini** yang berstatus `SELESAI` (transaksi yang dibatalkan tidak ikut dihitung). Karena ini data hari yang sedang berjalan, jam-jam **setelah** waktu sekarang otomatis bernilai `0` di `hourly_traffic` — itu wajar (belum terjadi), bukan berarti sepi. FE sebaiknya menampilkan bagian jam yang belum lewat sebagai "belum ada data", bukan "sepi".
