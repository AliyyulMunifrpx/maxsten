# Update Cancel Reason Template

## Endpoint

```
PATCH /api/seller/cancel-reasons/:reasonId
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field    | Tipe   | Required | Keterangan                                                                      |
| -------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `reason` | string | ✅       | Maksimal 255 karakter. Harus unik di antara template aktif milik toko yang sama |

## Contoh Request

```bash
curl -X PATCH https://example.com/api/seller/cancel-reasons/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Stok bahan baku habis"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Stok bahan baku habis",
    "created_at": "2026-07-27T10:00:00.000Z"
  }
}
```

### Error

| Status | Kondisi                                                                          | `errors`                                               |
| ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 400    | `reason` tidak dikirim atau lebih dari 255 karakter                              | pesan Joi                                              |
| 401    | Tidak login / session expired                                                    | `Unauthorized`                                         |
| 404    | `reasonId` tidak ditemukan, sudah dihapus, atau bukan milik toko user yang login | `Reason template not found or you do not have access`  |
| 409    | Teks alasan baru ini sudah dipakai template aktif lain di toko yang sama         | `A cancellation reason with this text already exists.` |
