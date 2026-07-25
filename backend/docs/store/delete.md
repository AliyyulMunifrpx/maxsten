# Delete Store

Soft-delete toko milik user yang sedang login.

## Endpoint

```
PATCH /api/delete-store
```

> ⚠️ Method-nya `PATCH`, bukan `DELETE` — karena ini soft-delete (update flag), bukan penghapusan record beneran.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Tidak ada body/parameter — cukup cookie auth valid.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/delete-store \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

> Berbeda dari endpoint lain yang balikin object toko, di sini `data` cuma string `"OK"` — bukan data toko.

### Error

| Status | Kondisi                                                               | `errors`          |
| ------ | --------------------------------------------------------------------- | ----------------- |
| 401    | Tidak login / session expired                                         | `Unauthorized`    |
| 404    | User tidak punya toko aktif (termasuk kalau sudah dihapus sebelumnya) | `Store not found` |

## Catatan

- Setelah dihapus, toko **tidak bisa diakses lagi lewat endpoint mana pun** (`GET /api/stores/me`, update profile/logo/jam, dll akan balikin `404 Store not found` seperti user belum pernah punya toko).
- User **boleh langsung bikin toko baru** setelah toko lama dihapus — penghapusan ini melepas relasi ke user sepenuhnya, bukan sekadar menyembunyikan toko lama.
- Kalau toko punya logo, file logo-nya ikut dihapus dari server. Kalau proses hapus file ini gagal karena alasan apa pun, toko tetap berhasil dihapus (kegagalan hapus file tidak membatalkan penghapusan toko).
- Panggilan berulang ke endpoint ini (toko yang sudah dihapus, dihapus lagi) akan mengembalikan `404`, bukan `200` kedua kalinya.
