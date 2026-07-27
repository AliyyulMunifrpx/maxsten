# Delete Product

Soft-delete produk beserta seluruh variannya.

## Endpoint

```
PATCH /api/stores/product/delete/:productId
```



`:productId` adalah UUID milik produk.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan produk yang dihapus memang milik toko user yang login.

## Request

Tidak ada body — cukup `productId` di URL dan cookie auth valid.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/product/delete/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

> Sama seperti `PATCH /api/delete-store`, `data` di sini cuma string `"OK"`, bukan object produk.

### Error

| Status | Kondisi | `errors` |
|---|---|---|
| 400 | `productId` bukan format UUID valid | pesan validasi |
| 400 | Produk masih punya antrean aktif (status `BELUM_BAYAR` atau `DIPROSES`) | `Cannot delete product with active orders in progress` |
| 401 | Tidak login / session expired | `Unauthorized` |
| 404 | `productId` tidak ditemukan, sudah dihapus, atau bukan milik toko user yang login | pesan validasi |

## Catatan

- **Tidak bisa hapus produk yang masih punya antrean aktif** — sama seperti aturan di update info produk, tapi di sini berlaku total (bukan cuma freeze sebagian field, request-nya ditolak sepenuhnya). Pastikan tidak ada pesanan berjalan yang memuat produk ini sebelum mencoba menghapus.
- Varian produk ikut ter-soft-delete otomatis bersamaan dengan produknya — tidak perlu memanggil endpoint terpisah untuk membersihkan variannya.
- Kalau produk punya gambar, file-nya ikut dihapus dari server. Kalau proses hapus file ini gagal karena alasan apa pun, produk tetap berhasil dihapus (kegagalan hapus file tidak membatalkan penghapusan produk).
- Riwayat transaksi lama yang sudah memakai produk ini (`SELESAI`/`DIBATALKAN`) tidak terpengaruh — produk yang dihapus tetap muncul apa adanya di riwayat pesanan lama, tidak ikut terhapus/tersembunyi dari sana.