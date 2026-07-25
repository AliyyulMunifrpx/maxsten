# Set Store Status (Buka/Tutup Manual)

Override status buka/tutup toko secara manual, di luar jadwal `operational_hours`.

## Endpoint

```
PATCH /api/stores/:storeId/status
```

`:storeId` diisi dengan `public_id` toko (bukan `id` internal).

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai buat memastikan toko yang diubah memang milik user yang login.

## Request

Content-Type: `application/json`

| Field | Tipe | Required | Keterangan |
|---|---|---|---|
| `manual_status` | string | ✅ | Hanya boleh `"OPEN"` atau `"CLOSED"` |

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/str_8kd93jf82j/status \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"manual_status": "CLOSED"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "message": "Successfully closed the store",
    "manual_status": "CLOSED"
  }
}
```

### Error

| Status | Kondisi | `errors` |
|---|---|---|
| 400 | `manual_status` kosong atau bukan `"OPEN"`/`"CLOSED"` | `The status can only be 'OPEN' or 'CLOSED'` atau `Status must be filled in` |
| 400 | Toko masih punya antrean aktif (status `BELUM_BAYAR` atau `DIPROSES`) | `You still have active queues` |
| 401 | Tidak login / session expired | `Unauthorized` |
| 404 | `storeId` tidak ditemukan, atau ditemukan tapi bukan milik user yang login | `Store not found` |

## Catatan

- **Tidak bisa ganti status `CLOSED` selama toko masih punya antrean dengan status `BELUM_BAYAR` atau `DIPROSES`.** Selesaikan/batalkan dulu antrean yang aktif sebelum toko bisa ditutup statusnya.
- Override ini **hanya berlaku untuk hari itu juga** (mengikuti timezone toko). Kalau besok belum di-override ulang, status toko otomatis balik mengikuti jadwal normal di `operational_hours` — bukan berlaku permanen sampai diubah manual lagi.
- Perubahan lewat endpoint ini langsung tercermin di `is_open` pada `GET /api/stores/me` — tidak perlu request tambahan apa pun.
- `storeId` di URL memakai `public_id`, konsisten dengan endpoint lain yang mengembalikan `public_id` sebagai identifier toko (bukan `id` internal database).