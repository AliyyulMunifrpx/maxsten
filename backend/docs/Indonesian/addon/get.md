# Get Addon Group

Ambil detail 1 grup add-on beserta daftar add-on aktif di dalamnya.

## Endpoint

```
GET /api/stores/addon-groups/:addonGroupId
```

`:addonGroupId` adalah UUID grup add-on.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan grup add-on yang diambil memang milik toko user yang login.

## Request

Tidak ada body — cukup `addonGroupId` di URL dan cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Topping Minuman",
    "created_at": "2026-07-01T00:00:00.000Z",
    "addons": [
      {
        "id": "addon-uuid-1",
        "name": "Boba",
        "price": 3000,
        "created_at": "2026-07-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                    | `errors`                                                    |
| ------ | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 400    | `addonGroupId` bukan format UUID valid                                     | pesan validasi                                              |
| 401    | Tidak login / session expired                                              | `Unauthorized`                                              |
| 404    | Grup tidak ditemukan, sudah dihapus, atau bukan milik toko user yang login | `The add-on group was not found, or you do not have access` |

## Catatan

- **Add-on yang sudah dihapus (`is_delete: true`) otomatis disaring** dari `addons` — kalau semua add-on dalam grup itu sudah dihapus, `addons` akan berupa array kosong `[]`, bukan error, selama grupnya sendiri masih aktif.
- **`404` dipakai untuk 3 skenario berbeda** (grup tidak ada sama sekali, grup sudah di-soft-delete, atau grup milik toko lain) — pesannya sengaja disamakan, konsisten dengan pola ownership-check di endpoint lain (`Product not found`, `Store not found`, dst): tidak membocorkan mana dari ketiganya yang sebenarnya terjadi.
