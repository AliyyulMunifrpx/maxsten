# Get Store (Me)

Ambil data toko milik user yang sedang login.

## Endpoint

```
GET /api/stores/me
```

## Auth

Cookie-based auth (`access_token`/`refresh_token`, `httpOnly`). `userId` diambil dari middleware.

## Request

Tidak ada parameter tambahan — cukup cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/stores/me \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Toko Sumber Rejeki",
    "description": "Toko kelontong harian",
    "city": "Bogor",
    "province": "Jawa Barat",
    "village": "Sukamaju",
    "district": "Cibinong",
    "street_address": "Jl. Mawar No. 12",
    "postal_code": "16916",
    "logo_url": "/uploads/logo-1234567890.png",
    "timezone": "Asia/Jakarta",
    "manual_status": null,
    "manual_updated_at": null,
    "operational_hours": [
      {
        "day": 0,
        "is_active": false,
        "open_time": "08:00",
        "close_time": "20:00"
      },
      {
        "day": 1,
        "is_active": true,
        "open_time": "08:00",
        "close_time": "20:00"
      }
    ],
    "payment_timeout": 15,
    "is_open": true
  }
}
```

`operational_hours` selalu terurut dari `day: 0` (Minggu) sampai `day: 6` (Sabtu).

### Error

| Status | Kondisi                                                         | `errors`                                                   |
| ------ | --------------------------------------------------------------- | ---------------------------------------------------------- |
| 401    | Tidak login / session expired                                   | `Unauthorized` atau `Session Expired. Please login again.` |
| 404    | User belum punya toko aktif (termasuk kalau toko sudah dihapus) | `Store not found`                                          |
| 500    | Server/database error                                           | —                                                          |

```json
{
  "errors": "Store not found"
}
```

## Catatan

- `id` internal (Prisma) sengaja tidak diikutkan di response — yang dipakai FE adalah `public_id`.
- `is_open` **bukan** kolom di database — dihitung ulang real-time tiap request, berdasarkan jam sekarang di timezone toko (`timezone`), dicocokkan ke `operational_hours`, dengan `manual_status` sebagai override kalau ada.
- **Aturan `manual_status` sebagai override:**
  - Hanya berlaku kalau di-set **di hari yang sama** (menurut timezone toko, bukan timezone server). Override dari hari sebelumnya otomatis diabaikan dan sistem balik mengikuti jadwal normal.
  - Nilai yang dikenali cuma `"OPEN"` dan `"CLOSED"`. Kalau `manual_status` gosong lain, ini artinya override tidak aktif — FE tidak akan pernah menerima nilai selain dua ini dari sistem, jadi cukup expect salah satu dari dua string ini atau `null`.
- **Jadwal yang melewati tengah malam didukung** (misal buka jam 20:00, tutup jam 02:00 dini hari) — `is_open` tetap konsisten baik sebelum maupun sesudah tengah malam selama masih dalam sesi tersebut.
- Kalau `timezone` toko kosong atau tidak valid, sistem otomatis fallback ke `Asia/Jakarta` untuk perhitungan `is_open` — tidak pernah menyebabkan error.
- `payment_timeout` dalam satuan menit.
- Toko yang sudah dihapus (`is_delete: true`) tidak akan pernah muncul di endpoint ini — akan dianggap sama seperti user belum punya toko (`404`).
