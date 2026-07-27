# Update Product Image

Ganti gambar produk yang sudah ada.

## Endpoint

```
PATCH /api/stores/products/:productId/image
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan produk yang diubah memang milik toko user yang login.

## Request

Content-Type: `multipart/form-data`

| Field   | Tipe | Required | Keterangan                                       |
| ------- | ---- | -------- | ------------------------------------------------ |
| `image` | file | ✅       | Field wajib — request ditolak (400) kalau kosong |

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000/image \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "image=@/path/to/new-product.png"
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "image_url": "/uploads/product-1721654321-987654321.png"
  }
}
```

> ⚠️ Response ini **hanya** berisi `id`, `name`, dan `image_url` — beda dari `PATCH /api/stores/logo` (logo toko) yang balikin data toko lengkap. Kalau FE butuh data produk lain yang ter-update (misal `price`, `variants`) setelah ganti gambar, panggil `GET /api/product/:productId` secara terpisah.

### Error

| Status | Kondisi                                                            | `errors`                       |
| ------ | ------------------------------------------------------------------ | ------------------------------ |
| 400    | Tidak ada file `image` yang dikirim                                | `No image files were uploaded` |
| 401    | Tidak login / session expired                                      | `Unauthorized`                 |
| 404    | `productId` tidak ditemukan, atau bukan milik toko user yang login | `Product not found`            |
| 413    | Ukuran file melebihi batas multer                                  | —                              |

## Catatan

- Gambar lama otomatis dihapus dari server setelah gambar baru berhasil tersimpan — FE tidak perlu melakukan apa pun terkait file lama.
- Kalau `productId` tidak valid/bukan milik toko sendiri, file yang **sudah terlanjur ter-upload** oleh request itu otomatis dibersihkan dari server juga — tidak akan tertinggal sebagai file yatim (orphan).
