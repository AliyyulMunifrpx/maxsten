# Create Product

Menambahkan produk baru ke toko milik user yang sedang login.

## Endpoint

```
POST /api/stores/products
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `multipart/form-data` (karena ada upload `image`). Bisa juga `application/json` kalau tidak menyertakan gambar.

| Field | Tipe | Required | Keterangan |
|---|---|---|---|
| `name` | string | ✅ | Maksimal 100 karakter. Harus unik per toko |
| `price` | number | ✅ | Harus lebih dari 0 |
| `description` | string | ❌ | — |
| `variants` | array\<object\> | ❌ | Lihat struktur di bawah |
| `addon_group_ids` | array\<string (UUID)\> | ❌ | ID grup add-on yang sudah ada, harus milik toko yang sama |
| `image` | file | ❌ | Field name harus `image` (bukan `logo`) |

### Struktur `variants`

```json
[
  { "name": "Pedas", "additional_price": 2000 },
  { "name": "Sedang" }
]
```

| Field | Tipe | Required | Keterangan |
|---|---|---|---|
| `.name` | string | ✅ | Maksimal 100 karakter |
| `.additional_price` | number | ❌ | Default `0` kalau tidak diisi. Tidak boleh negatif |

Karena dikirim lewat `multipart/form-data`, `variants` dan `addon_group_ids` dikirim sebagai **JSON string**, sama seperti `operational_hours` di endpoint create store.

## Contoh Request

```bash
curl -X POST https://example.com/api/stores/products \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "name=Nasi Goreng Spesial" \
  -F "price=20000" \
  -F "description=Nasi goreng dengan telur dan ayam" \
  -F 'variants=[{"name":"Pedas","additional_price":2000},{"name":"Sedang"}]' \
  -F 'addon_group_ids=["550e8400-e29b-41d4-a716-446655440000"]' \
  -F "image=@/path/to/product.png"
```

## Response

### 201 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "description": "Nasi goreng dengan telur dan ayam",
    "price": 20000,
    "image_url": "/uploads/product-1234567890.png",
    "store_id": 5,
    "variants": [
      { "id": 1, "name": "Pedas", "additional_price": 2000 },
      { "id": 2, "name": "Sedang", "additional_price": 0 }
    ],
    "productAddonGroups": [
      {
        "addon_group_id": "550e8400-e29b-41d4-a716-446655440000",
        "addon_group": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Level Pedas",
          "addons": [
            { "id": 1, "name": "Tidak Pedas" },
            { "id": 2, "name": "Sangat Pedas" }
          ]
        }
      }
    ]
  }
}
```

### Error

| Status | Kondisi | `errors` |
|---|---|---|
| 400 | `name` atau `price` tidak dikirim, atau format salah | pesan Joi, misal `"name" is required` |
| 400 | Salah satu `addon_group_ids` bukan format UUID valid | `"addon_group_ids[0]" must be a valid GUID` |
| 400 | `variants` tidak sesuai struktur (misal `name` kosong) | pesan Joi terkait index yang gagal |
| 400 | `variants`/`addon_group_ids` dikirim sebagai string tapi bukan JSON valid | `Format data variants tidak valid` / `Format data addon_group_ids tidak valid` |
| 400 | Nama produk sudah dipakai produk lain di toko yang sama | `A product named '<nama>' already exists in this store` |
| 400 | Ada `addon_group_ids` yang tidak ditemukan / bukan milik toko ini | `Some add-on groups are not valid for this store.` |
| 401 | Tidak login / session expired | `Unauthorized` |
| 404 | User belum punya toko | `Store not found` |

## Catatan

- Nama produk harus **unik per toko** — toko lain boleh punya produk dengan nama yang sama, tapi tidak boleh duplikat di toko yang sama.
- Kalau salah satu `addon_group_ids` yang dikirim tidak valid (tidak ada, sudah dihapus, atau punya toko lain), **seluruh request ditolak** — tidak ada produk yang setengah-setengah tersimpan tanpa addon groupnya.