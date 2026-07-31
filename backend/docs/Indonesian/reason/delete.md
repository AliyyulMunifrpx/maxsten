# Delete Cancel Reason Template

Soft-delete 1 template alasan pembatalan.

## Endpoint

```
DELETE /api/seller/cancel-reasons/:reasonId
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Tidak ada body — cukup `reasonId` di URL dan cookie auth valid.

## Contoh Request

```bash
curl -X DELETE https://example.com/api/seller/cancel-reasons/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

### Error

| Status | Kondisi                                                                          | `errors`                                 |
| ------ | -------------------------------------------------------------------------------- | ---------------------------------------- |
| 400    | `reasonId` bukan format UUID valid                                               | pesan validasi                           |
| 401    | Tidak login / session expired                                                    | `Unauthorized`                           |
| 404    | User belum punya toko                                                            | `Store not found`                        |
| 404    | `reasonId` tidak ditemukan, sudah dihapus, atau bukan milik toko user yang login | `Cancellation reason template not found` |

## Catatan

- Menghapus template alasan **tidak memengaruhi** riwayat pembatalan yang sudah pernah memakai teks alasan ini sebelumnya — `cancellation_reason` yang tersimpan di data antrean lama adalah teks bebas yang sudah "dicopy" saat itu, bukan referensi ke template ini. Menghapus template tidak mengubah/menghapus data riwayat apa pun.
