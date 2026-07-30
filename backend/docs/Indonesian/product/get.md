# Get Product Detail

Ambil detail 1 produk milik toko user yang sedang login.

## Endpoint

```
GET /api/stores/products/:productId
```

`:productId` adalah UUID milik produk.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan produk yang diambil memang milik toko user yang login.

## Request

Tidak ada body — cukup `productId` di URL dan cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "description": "Nasi goreng dengan telur dan ayam",
    "price": 20000,
    "image_url": "/uploads/product-1234567890.png",
    "is_available": true,
    "productAddonGroups": [
      {
        "addon_group": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Level Pedas",
          "addons": [
            { "id": 1, "name": "Tidak Pedas", "price": 0 },
            { "id": 2, "name": "Sangat Pedas", "price": 2000 }
          ]
        }
      }
    ],
    "variants": [
      { "id": 1, "name": "Pedas", "additional_price": 2000 },
      { "id": 2, "name": "Sedang", "additional_price": 0 }
    ],
    "total_sold": 12
  }
}
```

### Error

| Status | Kondisi                                                                      | `errors`            |
| ------ | ---------------------------------------------------------------------------- | ------------------- |
| 400    | `productId` bukan format UUID valid                                          | pesan validasi      |
| 401    | Tidak login / session expired                                                | `Unauthorized`      |
| 404    | Produk tidak ditemukan, sudah dihapus, atau bukan milik toko user yang login | `Product not found` |

## Catatan

- `total_sold` **bukan** kolom database — dihitung real-time tiap request, jumlah total `quantity` dari semua transaksi berstatus `SELESAI` yang mengandung produk ini.
- Varian dan grup add-on yang sudah dihapus (`is_delete: true`) otomatis disaring dari response — tidak akan pernah muncul, meski produknya masih ada transaksi lama yang memakainya.
- `404 Product not found` juga dipakai untuk kasus "produk ini ada, tapi punya toko lain" — pesan errornya tidak membedakan keduanya (sengaja, demi keamanan, supaya user tidak bisa menebak produk mana saja yang ada di toko lain lewat percobaan ID).
