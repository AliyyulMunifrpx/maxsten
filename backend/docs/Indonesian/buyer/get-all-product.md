# Get Store Catalog (Buyer)

Ambil informasi detail toko beserta daftar produknya. Endpoint ini bersifat publik (untuk pembeli) dan sudah dilengkapi dengan fitur _pagination_, _prefetch_ halaman berikutnya, serta pencarian produk yang mentoleransi salah ketik (_Fuzzy Search_).

## Endpoint

```
GET /api/stores/:storeId/products

```

`:storeId` adalah `public_id` milik toko (bukan `id` internal toko di database).

## Auth

Tidak perlu otentikasi (Public Endpoint). Bisa diakses oleh siapa saja tanpa _cookie_ login.

## Request

| Param     | Lokasi    | Tipe          | Required | Keterangan                                                               |
| --------- | --------- | ------------- | -------- | ------------------------------------------------------------------------ |
| `storeId` | URL param | string (UUID) | ✅       | `public_id` toko                                                         |
| `page`    | query     | number        | ❌       | Default `1`. 20 produk per halaman                                       |
| `keyword` | query     | string        | ❌       | Kata kunci pencarian nama produk (mendukung toleransi _typo_ / _fuzzy_). |

## Contoh Request

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/products?page=1&keyword=Ayam Bakar"

```

## Response

### 200 OK

```json
{
  "data": {
    "store": {
      "name": "Warung Makan Enak",
      "description": "Tempat nongkrong asik",
      "logo_url": "https://example.com/logo.png",
      "is_open": true,
      "street_address": "Jl. Pembeli 1",
      "village": "Desa",
      "district": "Kecamatan",
      "city": "Kota",
      "province": "Provinsi",
      "postal_code": "12345",
      "latitude": -7.0,
      "longitude": 110.0
    },
    "currentPage": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Ayam Bakar Madu Spesial",
        "price": 25000,
        "image_url": "https://example.com/ayam.jpg",
        "is_available": true,
        "total_sold": 15
      }
    ],
    "nextPage": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Ayam Goreng Mentega",
        "price": 22000,
        "image_url": null,
        "is_available": false,
        "total_sold": 8
      }
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

| Status | Kondisi                                                            | `errors`                  |
| ------ | ------------------------------------------------------------------ | ------------------------- |
| 400    | `storeId` bukan format UUID valid, atau `page` bukan angka positif | pesan validasi (dari Joi) |
| 404    | Toko tidak ditemukan, atau status toko sudah dihapus (`is_delete`) | `Store not found`         |

## Catatan

- **`nextPage` adalah data prefetch buat halaman setelahnya** (kalau minta `page=1`, `nextPage` isinya halaman 2). Tujuannya biar FE bisa langsung tampilkan halaman berikutnya secara instan begitu user klik "Next" atau nge-scroll ke bawah (_Infinite Scroll_) tanpa loading ambil data.
- Kalau `nextPage` berupa array kosong (`[]`), itu artinya `currentPage` yang diminta sudah halaman terakhir.
- Properti `is_open` pada toko **dihitung secara real-time** setiap ada _request_, menyesuaikan jadwal operasional toko (`operational_hours`) atau _override_ manual dari sistem.
- Jika FE mengirimkan query `keyword`, sistem menggunakan _Fuzzy Search_ (Fuse.js) yang memaklumi salah ketik ringan (misal: "Ayan Bkar" tetap akan menemukan "Ayam Bakar").
- Jika produk memiliki `is_available: false`, FE wajib menampilkan visual bahwa produk tersebut "Stok Habis" dan _disable_ tombol beli.
- `total_sold` di tiap produk **bukan** kolom database — dihitung real-time tiap _request_, merepresentasikan jumlah total `quantity` dari antrean/transaksi berstatus `SELESAI` untuk produk tersebut.
