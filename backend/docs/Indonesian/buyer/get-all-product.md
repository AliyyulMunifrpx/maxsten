# Get Store Catalog (Buyer)

Ambil informasi detail toko beserta daftar produknya. Endpoint ini bersifat publik (untuk pembeli) dan sudah dilengkapi dengan fitur _pagination_, _prefetch_ halaman berikutnya, serta pencarian produk yang mentoleransi salah ketik (_Fuzzy Search_).

## Endpoint

```text
GET /api/stores/:storeId/products

```

`:storeId` adalah `public_id` milik toko (bukan `id` internal toko di database).

## Auth

Tidak perlu otentikasi (Public Endpoint). Bisa diakses oleh siapa saja tanpa _cookie_ login.

## Request

| Param     | Lokasi    | Tipe          | Required | Keterangan                                                                                                                |
| --------- | --------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `storeId` | URL param | string (UUID) | ✅       | `public_id` toko                                                                                                          |
| `page`    | query     | number        | ❌       | Default `1`. 20 produk per halaman                                                                                        |
| `keyword` | query     | string        | ❌       | Kalau diisi, pencarian menggunakan **Fuzzy Search** (toleran salah ketik/typo) pada nama produk — lihat catatan di bawah. |

## Contoh Request

```bash
# Tanpa pencarian
curl "https://example.com/api/stores/str_8kd93jf82j/products?page=1"

# Dengan pencarian
curl "https://example.com/api/stores/str_8kd93jf82j/products?keyword=ayam%20bakar"

```

## Response

### 200 OK

```json
{
  "data": {
    "store": {
      "name": "Warung Makan Enak",
      "description": "Testing API Pembeli",
      "logo_url": "/uploads/logo-123.png",
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
        "id": "prod-uuid-1",
        "name": "Ayam Bakar Madu Spesial",
        "description": "ayam bakar enak",
        "price": 25000,
        "image_url": null,
        "is_available": true,
        "total_sold": 3
      }
    ],
    "nextPage": [
      "...20 produk halaman berikutnya, atau [] kalau sudah habis..."
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 22,
      "totalPages": 2
    }
  }
}
```

Kalau `keyword` diisi tapi tidak ada produk yang cukup mirip/relevan, `currentPage`/`nextPage` akan berupa array kosong `[]`.

### Error

| Status | Kondisi                                                            | `errors`          |
| ------ | ------------------------------------------------------------------ | ----------------- |
| 400    | `storeId` bukan format UUID valid, atau `page` bukan angka positif | pesan validasi    |
| 404    | Toko tidak ditemukan / sudah dihapus                               | `Store not found` |

## Catatan

- **`store` di response ini adalah versi ringkas**, khusus untuk ditampilkan ke publik — tidak menyertakan `payment_timeout`, `manual_status`, `operational_hours` mentah, atau `id` internal. `is_open` sudah dihitung otomatis (sama logikanya seperti `GET /api/stores/me`), jadi FE tinggal pakai langsung tanpa perlu hitung ulang.
- **`is_available` disertakan di setiap produk** — FE bisa menandai produk yang sedang habis (`is_available: false`) langsung di katalog, tanpa perlu request tambahan.
- **Pencarian (`keyword`) menggunakan Fuzzy Search (Toleran Typo)** — pencarian mencocokkan kemiripan teks pada nama produk. Jika ada salah ketik kecil (misal _user_ mengetik "aym bakar" untuk mencari "Ayam Bakar"), sistem masih bisa menemukannya. Jika tingkat kemiripan terlalu rendah, hasilnya kosong (bukan berarti sistem error).
- **Kalau `keyword` diisi, mekanisme pagination berubah** — sistem akan mengambil seluruh hasil pencocokan dari algoritma _fuzzy_, lalu memotongnya per halaman secara manual di memori (20 item/halaman). `totalRows` akan merepresentasikan jumlah total produk yang _cocok_ dengan kata kunci pencarian.
- `total_sold` per produk dihitung dari transaksi berstatus `SELESAI` saja — sama seperti endpoint produk lain, transaksi yang dibatalkan tidak ikut dihitung.
- Sama seperti `GET /api/stores/:publicId/products`, `nextPage` adalah data prefetch untuk memuat halaman berikutnya lebih cepat di FE.
