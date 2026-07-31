# List Cancel Reason Templates

Ambil semua template alasan pembatalan milik toko user yang sedang login.

## Endpoint

```
GET /api/seller/cancel-reasons
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Tidak ada parameter — cukup cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/seller/cancel-reasons \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "reason": "Stok habis",
      "created_at": "2026-07-27T10:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "reason": "Toko mau tutup",
      "created_at": "2026-07-20T08:00:00.000Z"
    }
  ]
}
```

`data` selalu berupa array — kalau belum ada template sama sekali, hasilnya `[]`. Diurutkan dari yang **paling baru dibuat**.

### Error

| Status | Kondisi                       | `errors`          |
| ------ | ----------------------------- | ----------------- |
| 401    | Tidak login / session expired | `Unauthorized`    |
| 404    | User belum punya toko         | `Store not found` |

## Catatan

- Tidak ada pagination — semua template aktif diambil sekaligus. karena jumlah template alasan biasanya sangat sedikit (beberapa saja per toko).
