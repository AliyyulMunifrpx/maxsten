# Create Addon Group

Membuat grup add-on baru beserta daftar add-on di dalamnya sekaligus.

## Endpoint

```
POST /api/stores/addon-groups
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json` atau `multipart/form-data`

| Field            | Tipe            | Required | Keterangan                                                                                                                                                          |
| ---------------- | --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`           | string          | ✅       | Maksimal 100 karakter. Harus unik di antara grup add-on **aktif** milik toko yang sama. Disimpan dalam bentuk **huruf kecil semua** setelah di-trim (lihat catatan) |
| `addons`         | array\<object\> | ✅       | Minimal 1 item                                                                                                                                                      |
| `addons[].name`  | string          | ✅       | Maksimal 100 karakter. Harus unik di dalam grup ini (tidak case-sensitive). Disimpan dalam bentuk huruf kecil semua setelah di-trim                                 |
| `addons[].price` | number          | ✅       | Tidak boleh negatif (boleh `0`)                                                                                                                                     |

Kalau dikirim lewat `multipart/form-data`, `addons` dikirim sebagai **JSON string**, sama seperti `operational_hours`/`variants` di endpoint lain:

```
addons: '[{"name":"Boba","price":3000},{"name":"Less Ice","price":0}]'
```

## Contoh Request

```bash
curl -X POST https://example.com/api/stores/addon-groups \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Topping Minuman",
    "addons": [
      { "name": "Boba", "price": 3000 },
      { "name": "Less Ice", "price": 0 }
    ]
  }'
```

## Response

### 201 Created

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Topping Minuman",
    "created_at": "2026-07-27T10:00:00.000Z",
    "addons": [
      {
        "id": "addon-uuid-1",
        "name": "Boba",
        "price": 3000,
        "created_at": "2026-07-27T10:00:00.000Z"
      }
    ]
  }
}
```

Shape response ini sekarang konsisten dengan `GET /api/stores/addon-groups/:addonGroupId` — field yang dikembalikan sama persis.

### Error

| Status | Kondisi                                                                                                                    | `errors`                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 400    | `name`/`addons` tidak dikirim atau format salah (`price` negatif, `addons` kosong, dll)                                    | pesan Joi                                                |
| 400    | `addons` dikirim sebagai string tapi bukan JSON valid                                                                      | `Invalid addons data format. Must be a valid JSON array` |
| 400    | Ada nama add-on yang duplikat di dalam request yang sama (tidak case-sensitive, misal `"Boba"` dan `"boba"` dianggap sama) | `Add-on names within a group must be unique`             |
| 401    | Tidak login / session expired                                                                                              | `Unauthorized`                                           |
| 404    | User belum punya toko                                                                                                      | `Store not found`                                        |
| 409    | Nama grup sudah dipakai grup add-on **aktif** lain di toko yang sama                                                       | `An add-on group with this name already exists`          |

## Catatan

- **Nama grup boleh dipakai ulang kalau grup sebelumnya sudah dihapus** — pengecekan keunikan nama hanya berlaku terhadap grup yang masih aktif (`is_delete: false`) di toko yang sama, bukan seluruh histori grup yang pernah ada.
- ⚠️ **`name` grup dan `addons[].name` disimpan dalam bentuk huruf kecil semua** (`"Topping Minuman"` yang diketik user tersimpan sebagai `"topping minuman"`), bukan persis seperti yang diketik user — ini termasuk yang dikembalikan lagi di response dan yang akan tampil ke buyer di katalog. Kalau tampilan ke buyer perlu huruf kapital yang rapi (misal "Topping Minuman", bukan "topping minuman"), FE perlu menerapkan title-case sendiri saat menampilkan (`text-transform: capitalize` atau setara), karena backend tidak lagi menyimpan casing asli yang diketik user.
