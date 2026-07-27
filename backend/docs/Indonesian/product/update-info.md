# Update Product

Update data produk, termasuk varian dan grup add-on-nya.

## Endpoint

```
PATCH /api/stores/products/:productId
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field             | Tipe                   | Required | Keterangan                                              |
| ----------------- | ---------------------- | -------- | ------------------------------------------------------- |
| `name`            | string                 | ❌       | Maksimal 100 karakter                                   |
| `description`     | string                 | ❌       | —                                                       |
| `price`           | number                 | ❌       | Harus lebih dari 0 kalau dikirim                        |
| `variants`        | array\<object\>        | ❌       | **Full replace**, bukan partial — lihat aturan di bawah |
| `addon_group_ids` | array\<string (UUID)\> | ❌       | **Full replace**, bukan partial — lihat aturan di bawah |

### Aturan `variants` (full replace berdasarkan `id`)

```json
[
  { "id": "existing-variant-id", "name": "Pedas", "additional_price": 1500 },
  { "name": "Varian Baru", "additional_price": 3000 }
]
```

- Item **dengan `id`** yang cocok dengan varian yang sudah ada → di-**update**.
- Item **tanpa `id`** → dianggap varian **baru**, otomatis dibuat.
- Varian lama yang **tidak disertakan** di array ini sama sekali → otomatis **dihapus** (soft-delete).
- Kirim `id` yang tidak ada / bukan milik produk ini → request ditolak (400), tidak ada perubahan tersimpan.

> ⚠️ Ini beda dari `operational_hours` di endpoint toko, yang partial (hari yang tidak disertakan tetap tidak berubah). Di sini, `variants` itu **pernyataan keadaan akhir penuh** — kirim ulang semua varian yang ingin dipertahankan, bukan cuma yang berubah.

### Aturan `addon_group_ids` (full replace)

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
    "name": "Nasi Goreng Spesial (Baru)",
    "price": 22000,
    "description": "...",
    "variants": [
      {
        "id": "variant-lama-id",
        "name": "Pedas",
        "additional_price": 2000,
        "is_delete": false
      },
      {
        "id": "variant-baru-id",
        "name": "Extra Pedas",
        "additional_price": 4000,
        "is_delete": false
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                                                         | `errors`                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400    | Format field salah (misal `price` bukan angka positif)                                                          | pesan Joi                                                                                     |
| 400    | Ada `variants[].id` yang tidak ditemukan / bukan milik produk ini                                               | `Some variants are invalid or do not belong to this product.`                                 |
| 400    | Ada `addon_group_ids` yang tidak valid / bukan milik toko ini                                                   | `Some add-on groups are invalid for this product.`                                            |
| 400    | Produk sedang punya **antrean aktif**, dan request mencoba mengubah `price`, `variants`, atau `addon_group_ids` | `This product has an active order in progress. Only the name and description can be updated.` |
| 401    | Tidak login / session expired                                                                                   | `Unauthorized`                                                                                |
| 404    | Toko tidak ditemukan, atau `productId` tidak ditemukan/bukan milik toko ini                                     | `Store not found` atau `Product not found or not owned by you`                                |
| 409    | Ada update lain yang bentrok di waktu yang bersamaan                                                            | `This change conflicts with another update in progress, please try again.`                    |

## Catatan

- Semua field bersifat partial update — cukup kirim field yang ingin diubah. Kalau `price` tidak dikirim, harga tetap dengan nilai sebelumnya.
- **Kalau produk sedang punya antrean aktif** (status pesanan belum selesai/dibatalkan), hanya `name` dan `description` yang boleh berubah. Kalau kamu tetap mengirim `price`, `variants`, atau `addon_group_ids` dengan nilai yang **berbeda** dari yang tersimpan sekarang, request akan ditolak. Kirim nilai yang persis sama seperti sekarang (atau jangan sertakan field itu sama sekali) kalau memang tidak ingin mengubahnya — field yang benar-benar tidak berubah nilainya tidak akan memicu error ini.
- `productId` yang dikirim otomatis diperiksa kepemilikannya terhadap toko milik user yang login — memasukkan `productId` milik toko lain akan selalu berakhir `404`, tidak pernah bisa mengubah produk orang lain.
