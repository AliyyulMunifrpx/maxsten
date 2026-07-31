# Delete Addon Group

Soft-delete grup add-on beserta seluruh add-on di dalamnya.

## Endpoint

```
DELETE /api/stores/addon-groups/:addonGroupId
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Tidak ada body — cukup `addonGroupId` di URL dan cookie auth valid.

## Contoh Request

```bash
curl -X DELETE https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

### Error

| Status | Kondisi                                                                                              | `errors`                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400    | `addonGroupId` bukan format UUID valid                                                               | pesan validasi                                                                                |
| 401    | Tidak login / session expired                                                                        | `Unauthorized`                                                                                |
| 404    | User belum punya toko                                                                                | `Store not found`                                                                             |
| 404    | `addonGroupId` tidak ditemukan / sudah dihapus / bukan milik toko ini                                | `Addon group not found`                                                                       |
| 409    | Grup add-on ini sedang dipakai oleh produk yang lagi ada di antrean aktif (`BELUM_BAYAR`/`DIPROSES`) | `Cannot delete this add-on group because a product using it is currently in an active queue.` |

## Catatan

- **Tidak bisa hapus grup add-on yang masih dipakai produk dalam antrean aktif** — sama seperti aturan di `PATCH /api/stores/addon-groups/:addonGroupId` (edit grup). Selesaikan/batalkan dulu antrean yang bersangkutan sebelum grup ini bisa dihapus.
- Semua add-on di dalam grup ikut ter-soft-delete otomatis bersamaan dengan grupnya — tidak perlu memanggil endpoint terpisah untuk membersihkan add-on satu per satu.
- Produk yang masih terhubung ke grup add-on yang dihapus **tidak otomatis kehilangan relasinya** — grup add-on ini cuma tidak akan lagi muncul di `GET /api/stores/addon-groups` maupun `GET /api/product/:productId` (karena keduanya menyaring `is_delete: false`), tapi riwayat transaksi lama yang sudah memakai grup add-on ini tetap utuh (snapshot `selected_addons` di `queueDetails` tidak terpengaruh).
