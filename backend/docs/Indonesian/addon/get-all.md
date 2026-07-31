# List Addon Groups

Ambil semua grup add-on milik toko user yang sedang login, beserta add-on aktif di dalamnya.

## Endpoint

```
GET /api/stores/addon-groups
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Tidak ada parameter — cukup cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/stores/addon-groups \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "topping minuman",
      "created_at": "2026-07-01T00:00:00.000Z",
      "addons": [
        {
          "id": "addon-uuid-1",
          "name": "boba",
          "price": 3000,
          "created_at": "2026-07-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

`data` selalu berupa array — kalau toko belum punya grup add-on sama sekali, hasilnya `[]` (bukan error). Grup diurutkan dari yang **paling lama dibuat**, add-on di dalam tiap grup juga diurutkan sama (paling lama duluan).

### Error

| Status | Kondisi                       | `errors`          |
| ------ | ----------------------------- | ----------------- |
| 401    | Tidak login / session expired | `Unauthorized`    |
| 404    | User belum punya toko         | `Store not found` |

## Catatan

- **Tidak ada pagination di endpoint ini** — semua grup add-on aktif diambil sekaligus dalam 1 response.
- Grup dan add-on yang sudah dihapus (`is_delete: true`) otomatis disaring — konsisten dengan `GET /api/stores/addon-groups/:addonGroupId`.
