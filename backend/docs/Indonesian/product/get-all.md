# Get All Products

Ambil semua produk dari 1 toko milik user yang sedang login, dengan pagination + prefetch halaman berikutnya.

## Endpoint

```
GET /api/stores/all-products/:publicId
```

`:publicId` adalah `public_id` milik toko (bukan `id` internal produk maupun toko).

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan toko yang diminta memang milik user yang login.

## Request

| Param      | Lokasi    | Tipe          | Required | Keterangan                         |
| ---------- | --------- | ------------- | -------- | ---------------------------------- |
| `publicId` | URL param | string (UUID) | ✅       | `public_id` toko                   |
| `page`     | query     | number        | ❌       | Default `1`. 20 produk per halaman |

## Contoh Request

```bash
curl -X GET "https://example.com/api/stores/all-products/f47ac10b-58cc-4372-a567-0e02b2c3d479?page=1" \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "currentPage": [
      {
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
              "addons": [{ "id": 1, "name": "Tidak Pedas", "price": 0 }]
            }
          }
        ],
        "variants": [{ "id": 1, "name": "Pedas", "additional_price": 2000 }],
        "total_sold": 12
      }
    ],
    "nextPage": [
      { "id": "...", "name": "Produk halaman berikutnya", "total_sold": 3 }
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 45,
      "totalPages": 3
    }
  }
}
```

### Error

| Status | Kondisi                                                               | `errors`          |
| ------ | --------------------------------------------------------------------- | ----------------- |
| 400    | `publicId` bukan format UUID valid, atau `page` bukan angka positif   | pesan validasi    |
| 401    | Tidak login / session expired                                         | `Unauthorized`    |
| 404    | Toko tidak ditemukan, atau ditemukan tapi bukan milik user yang login | `Store not found` |

## Catatan

- **`nextPage` adalah data prefetch buat halaman setelahnya** (kalau minta `page=1`, `nextPage` isinya halaman 2). Tujuannya biar FE bisa langsung tampilkan halaman berikutnya secara instan begitu user klik "Next", sambil di background FE tetap boleh manggil endpoint ini lagi dengan `page` yang baru untuk data ter-update + prefetch halaman selanjutnya lagi.
- Kalau `nextPage` berupa array kosong (`[]`), itu artinya `currentPage` yang diminta sudah halaman terakhir.
- `total_sold` di tiap produk **bukan** kolom database — dihitung real-time tiap request, jumlah total `quantity` dari semua transaksi berstatus `SELESAI` yang mengandung produk tersebut, sama seperti di `GET /api/product/:productId`.
- Karena endpoint ini selalu memfilter berdasarkan `user_id` yang login, `publicId` yang dikirim **wajib** milik toko sendiri.
- Varian dan grup add-on yang sudah dihapus (`is_delete: true`) otomatis disaring dari tiap produk.
