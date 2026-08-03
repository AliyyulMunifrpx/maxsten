# Update Product

Update data produk, termasuk varian dan grup add-on-nya.

## Endpoint

```text
PATCH /api/stores/products/:productId

```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

**Content-Type:** `application/json`

| Field             | Tipe                 | Required | Keterangan                                                                                          |
| ----------------- | -------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `name`            | string               | ❌       | Maksimal 100 karakter. **Disimpan huruf kecil semua** setelah di-trim. Harus unik di dalam toko ini |
| `description`     | string               | ❌       | —                                                                                                   |
| `price`           | number               | ❌       | Harus lebih dari 0 kalau dikirim                                                                    |
| `variants`        | array<object>        | ❌       | **Full replace**, bukan partial — lihat aturan di bawah                                             |
| `addon_group_ids` | array<string (UUID)> | ❌       | **Full replace**, bukan partial — lihat aturan di bawah                                             |

### Aturan `variants` (Full replace berdasarkan `id`)

```json
[
  { "id": "existing-variant-id", "name": "Pedas", "additional_price": 1500 },
  { "name": "Varian Baru", "additional_price": 3000 }
]
```

- Item **dengan `id**` yang cocok dengan varian yang sudah ada → di-**update**.
- Item **tanpa `id**` → dianggap varian **baru**, otomatis dibuat.
- Varian lama yang **tidak disertakan** di array ini sama sekali → otomatis **dihapus** (soft-delete).
- Nama varian tidak boleh ada yang kembar di dalam satu produk yang sama.
- Kirim `id` yang tidak ada / bukan milik produk ini → request ditolak (400), tidak ada perubahan tersimpan.

### Aturan `addon_group_ids` (Full replace)

Sama seperti `variants` — array ini menyatakan **daftar akhir** addon group yang terpasang di produk. Grup yang sebelumnya terpasang tapi tidak ikut dikirim akan **dilepas** dari produk (bukan dihapus grupnya, cuma dilepas relasinya).

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nasi Goreng Spesial (Baru)",
    "price": 22000,
    "variants": [
      { "id": "variant-lama-id", "name": "Pedas", "additional_price": 2000 },
      { "name": "Extra Pedas", "additional_price": 4000 }
    ],
    "addon_group_ids": ["addon-group-id-1"]
  }'

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "nasi goreng spesial (baru)",
    "price": 22000,
    "description": "...",
    "updated_at": "2026-08-03T10:00:00.000Z",
    "variants": [
      {
        "id": "variant-lama-id",
        "name": "pedas",
        "additional_price": 2000,
        "is_delete": false
      },
      {
        "id": "variant-baru-id",
        "name": "extra pedas",
        "additional_price": 4000,
        "is_delete": false
      }
    ],
    "productAddonGroups": [
      {
        "addon_group": {
          "id": "addon-group-id-1",
          "name": "level pedas",
          "addons": [{ "id": "addon-1", "name": "tidak pedas", "price": 0 }]
        }
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                                                         | `errors`                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400    | Format field salah (misal `price` bukan angka positif).                                                         | _Pesan Joi_                                                                                   |
| 400    | Ada nama varian yang duplikat di dalam _array_ `variants` yang dikirim pada request yang sama.                  | `Variant names within a product must be unique`                                               |
| 400    | Ada `variants[].id` yang tidak ditemukan / bukan milik produk ini.                                              | `Some variants are invalid or do not belong to this product.`                                 |
| 400    | Ada `addon_group_ids` yang tidak valid / bukan milik toko ini.                                                  | `Some add-on groups are invalid for this product.`                                            |
| 400    | Produk sedang punya **antrean aktif**, dan request mencoba mengubah `price`, `variants`, atau `addon_group_ids` | `This product has an active order in progress. Only the name and description can be updated.` |
| 401    | Tidak login / session expired.                                                                                  | `Unauthorized`                                                                                |
| 404    | Toko tidak ditemukan, atau `productId` tidak ditemukan/bukan milik toko ini.                                    | `Store not found` atau `Product not found or not owned by you`                                |
| 409    | Nama produk yang baru diinput sudah dipakai oleh produk aktif lain di toko ini.                                 | `A product with this name already exists in your store.`                                      |
| 409    | Ada nama varian baru yang bentrok dengan varian aktif lain di produk ini di database.                           | `A variant with this name already exists in this product.`                                    |
| 409    | Ada _update_ lain yang bentrok di waktu yang bersamaan (_race condition_ generik).                              | `This change conflicts with another update in progress, please try again.`                    |

## Catatan

- **Transformasi _Lowercase_:** Nama produk (`name`) dan nama varian (`variants[].name`) secara otomatis disimpan dalam bentuk **huruf kecil semua** setelah di-_trim_. Jika Frontend ingin menampilkan dengan huruf kapital, harap gunakan CSS (`text-transform: capitalize`).
- **Partial Update:** Semua field bersifat opsional — cukup kirim field yang ingin diubah. Kalau `price` tidak dikirim, harga tetap dengan nilai sebelumnya.
- **Pembatasan Antrean Aktif:** Kalau produk sedang punya antrean aktif (status pesanan belum selesai/dibatalkan), **hanya `name` dan `description` yang boleh berubah**. Kalau kamu tetap mengirim `price`, `variants`, atau `addon_group_ids` dengan nilai yang _berbeda_ dari yang tersimpan sekarang, request akan ditolak. _(Kirim nilai yang persis sama seperti sekarang—atau jangan sertakan field itu sama sekali—kalau memang tidak ingin mengubahnya)._
- `productId` yang dikirim otomatis diperiksa kepemilikannya terhadap toko milik user yang login — memasukkan `productId` milik toko lain akan selalu berakhir `404`, tidak pernah bisa mengubah produk orang lain.
