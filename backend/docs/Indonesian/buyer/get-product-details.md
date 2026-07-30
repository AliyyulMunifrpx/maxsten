# Get Product Details (Buyer)

Ambil detail lengkap dari satu produk secara spesifik. Endpoint ini memuat informasi dasar produk, daftar varian, pilihan _add-on_, status ketersediaan stok, dan jumlah produk yang sudah terjual.

## Endpoint

```
GET /api/stores/:storeId/products/:productId

```

- `:storeId` adalah `public_id` milik toko.
- `:productId` adalah `id` internal produk.

## Auth

Tidak perlu otentikasi (Public Endpoint). Bisa diakses oleh pembeli tanpa harus memiliki _cookie_ sesi.

## Request

| Param       | Lokasi    | Tipe          | Required | Keterangan                                      |
| ----------- | --------- | ------------- | -------- | ----------------------------------------------- |
| `storeId`   | URL param | string (UUID) | ✅       | `public_id` dari toko yang memiliki produk ini. |
| `productId` | URL param | string (UUID) | ✅       | `id` produk yang ingin dilihat detailnya.       |

## Contoh Request

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/products/123e4567-e89b-12d3-a456-426614174000"

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Kopi Susu Gula Aren",
    "price": 18000,
    "is_available": true,
    "total_sold": 150,
    "description": "Paduan espresso murni dengan gula aren asli nusantara.",
    "image_url": "https://example.com/images/kopi-susu.jpg",
    "variants": [
      {
        "id": "var-uuid-123",
        "name": "Normal Ice",
        "additional_price": 0
      },
      {
        "id": "var-uuid-456",
        "name": "Less Ice",
        "additional_price": 0
      }
    ],
    "addon_groups": [
      {
        "id": "ag-uuid-789",
        "name": "Topping Pilihan",
        "addons": [
          {
            "id": "addon-uuid-001",
            "name": "Extra Boba",
            "price": 3000
          },
          {
            "id": "addon-uuid-002",
            "name": "Cream Cheese",
            "price": 5000
          }
        ]
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                                             | `errors`                  |
| ------ | --------------------------------------------------------------------------------------------------- | ------------------------- |
| 400    | Parameter `storeId` atau `productId` bukan dalam format UUID yang valid.                            | Pesan validasi (dari Joi) |
| 404    | Produk tidak ditemukan, produk sudah terhapus (`is_delete`), atau bukan milik toko yang disebutkan. | `Product not found`       |
| 404    | Toko yang disebutkan (`storeId`) tidak ditemukan atau sudah dihapus.                                | `Product not found`       |

## Catatan

- **Aman dari Data Sampah:** Varian, grup _add-on_, dan _add-on_ yang sudah dihapus oleh kasir/owner (`is_delete: true`) otomatis disaring dan tidak akan muncul dalam balasan JSON.
- **Handling Stok Habis:** Jika `is_available` bernilai `false`, Frontend **wajib** menampilkan UI yang menandakan barang habis (misal: tombol "Tambah ke Keranjang" di-_disable_ atau diubah menjadi warna abu-abu).
- **Akurasi `total_sold`:** Nilai terjual dihitung secara _real-time_ langsung dari _database_ HANYA dari antrean yang berstatus `"SELESAI"`. Antrean yang masih diproses, belum dibayar, atau dibatalkan sama sekali tidak akan dihitung.
- **Ketergantungan URL:** ID toko (`storeId`) harus disertakan di URL sebagai pengaman ganda (_guard clause_). Jika pembeli iseng menggunakan `productId` yang valid tapi dimasukkan ke URL toko milik orang lain, sistem akan dengan cerdas mereturn `404 Not Found`.
