# Update Product Availability

Toggle status tersedia/habis untuk 1 produk, tanpa mengubah data produk lainnya.

## Endpoint

```
PATCH /api/stores/products/:productId/availability
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan produk yang diubah memang milik toko user yang login.

## Request

Content-Type: `application/json`

| Field          | Tipe    | Required | Keterangan                                        |
| -------------- | ------- | -------- | ------------------------------------------------- |
| `is_available` | boolean | ✅       | `true` = tersedia, `false` = habis/tidak tersedia |

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000/availability \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"is_available": false}'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "is_available": false
  }
}
```

### Error

| Status | Kondisi                                                            | `errors`            |
| ------ | ------------------------------------------------------------------ | ------------------- |
| 400    | `is_available` tidak dikirim, atau bukan boolean                   | pesan validasi      |
| 401    | Tidak login / session expired                                      | `Unauthorized`      |
| 404    | `productId` tidak ditemukan, atau bukan milik toko user yang login | `Product not found` |

## Catatan

- Endpoint ini **tidak terpengaruh** oleh status antrean aktif — beda dari `PATCH /api/stores/products/:productId` (update info produk) yang membekukan `price`/`variants`/`addon_group_ids` saat ada antrean berjalan. Toggle ketersediaan boleh dilakukan kapan saja, termasuk saat produk sedang dipesan.
- Response hanya berisi `id`, `name`, dan `is_available` — bukan data produk lengkap.
