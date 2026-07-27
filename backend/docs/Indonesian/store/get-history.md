# Store History & Analytics

Ambil ringkasan penjualan, grafik, riwayat transaksi, dan produk terlaris toko untuk periode bulan tertentu.

## Endpoint

```
GET /api/stores/history
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Query parameters, semuanya opsional:

| Param      | Tipe   | Default                           | Keterangan                                                           |
| ---------- | ------ | --------------------------------- | -------------------------------------------------------------------- |
| `month`    | number | bulan sekarang (di timezone toko) | `1`–`12`                                                             |
| `year`     | number | tahun sekarang (di timezone toko) | —                                                                    |
| `status`   | string | `"ALL"`                           | `"ALL"` \| `"SELESAI"` \| `"DIBATALKAN"` — filter tabel `history`    |
| `page`     | number | `1`                               | Halaman untuk `history`                                              |
| `limit`    | number | `10`                              | Jumlah baris per halaman untuk `history`,        maksimal `100`             |
| `topPage`  | number | `1`                               | Halaman untuk `topSelling.rankings`                                  |
| `topLimit` | number | `10`                              | Jumlah baris per halaman untuk `topSelling.rankings`, maksimal `100` |

> ⚠️ Kalau `page` dikirim string non-angka (misal `"abc"`), request **tidak error** — otomatis jatuh ke `page: 1`. Tapi kalau dikirim angka negatif (misal `-5`), request **ditolak (400)**. Perilaku ini asimetris — sebaiknya FE selalu kirim angka valid, jangan mengandalkan fallback ini.

## Contoh Request

```bash
curl -G https://example.com/api/stores/history \
  -b "access_token=<token>; refresh_token=<token>" \
  -d month=7 -d year=2026 -d status=SELESAI -d page=1 -d limit=10
```

## Response

### 200 OK

```json
{
  "data": {
    "meta": {
      "selectedMonth": 7,
      "selectedYear": 2026,
      "currentMonth": 7,
      "currentYear": 2026,
      "isCurrentMonth": true,
      "storeCreatedAt": "2026-01-10T02:00:00.000Z",
      "timezone": "Asia/Jakarta"
    },
    "summary": {
      "totalOmzet": 1500000,
      "totalPesanan": 42,
      "totalBatal": 3,
      "cancellationRate": 6.67,
      "averageOrderValue": 35714,
      "averageWaitTimeMinutes": 12,
      "trend": {
        "omzet": 15.2,
        "pesanan": 8.0,
        "batal": -20.0
      },
      "peakTraffic": {
        "peakHour": "12:00 - 13:00",
        "peakDay": "Sabtu"
      }
    },
    "charts": {
      "revenueDaily": [{ "label": "01", "omzet": 50000, "pesanan": 2 }],
      "trafficHourlyByDate": {
        "01": [0, 0, 0, 1, 2, 0]
      },
      "trafficDaily": [{ "label": "Minggu", "pesanan": 5 }]
    },
    "pagination": {
      "totalRows": 42,
      "totalPages": 5,
      "currentPage": 1,
      "limit": 10
    },
    "history": [
      {
        "id": 101,
        "status": "SELESAI",
        "total_price": 50000,
        "created_at": "2026-07-05T05:00:00.000Z",
        "completed_at": "2026-07-05T05:15:00.000Z",
        "queueDetails": [
          {
            "product": { "id": 1, "name": "Es Teh" },
            "variant": null,
            "quantity": 2
          }
        ]
      }
    ],
    "topSelling": {
      "rankings": [
        { "rank": 1, "product_id": 1, "name": "Es Teh", "totalQuantity": 40 }
      ],
      "pagination": {
        "totalRows": 12,
        "totalPages": 2,
        "currentPage": 1,
        "limit": 10
      }
    },
    "topAddons": [{ "name": "Less Ice", "totalQuantity": 18 }]
  }
}
```

### Error

| Status | Kondisi                                                                 | `errors`                                                             |
| ------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 400    | `month`/`year` tidak valid (`month` di luar `1`–`12`, atau bukan angka) | `Invalid month/year parameters`                                      |
| 400    | `status` bukan salah satu dari `ALL`/`SELESAI`/`DIBATALKAN`             | `Invalid status parameter. Allowed values: ALL, SELESAI, DIBATALKAN` |
| 400    | `page`/`limit`/`topPage`/`topLimit` bukan bilangan bulat positif        | `page, limit, topPage, and topLimit must be positive integers`       |
| 400    | `limit`/`topLimit` melebihi `100`                                       | `limit and topLimit must not exceed 100`                             |
| 401    | Tidak login / session expired                                           | `Unauthorized`                                                       |
| 404    | User belum punya toko                                                   | `Store not found`                                                    |

## Catatan

- **`history` dan `topSelling.rankings` punya pagination masing-masing, terpisah** — jangan pakai `pagination` di root buat nge-paging `topSelling`, itu cuma buat `history`. Pakai `topSelling.pagination` sendiri.
- Kalau `isCurrentMonth: true` (query bulan berjalan), rentang data yang dihitung cuma sampai **waktu sekarang**, bukan sampai akhir bulan — jadi angka `summary`/`charts` akan terus berubah/bertambah selama bulan itu masih berjalan, ini bukan snapshot final. Bulan yang sudah lewat (`isCurrentMonth: false`) datanya sudah final, tidak berubah lagi.
- `trend` di `summary` membandingkan periode yang dipilih dengan periode sebelumnya (bulan lalu) — kalau `isCurrentMonth: true`, perbandingannya adil (bulan lalu dipotong sampai tanggal yang sama dengan hari ini), bukan dibandingkan ke bulan lalu penuh.
- `peakTraffic` (jam & hari tersibuk) dihitung **hanya dari transaksi berstatus `SELESAI`**, transaksi yang dibatalkan tidak ikut dihitung sebagai traffic.
- Semua perhitungan tanggal/jam mengikuti `timezone` milik toko (ada di `meta.timezone`), bukan timezone server maupun timezone browser user.
