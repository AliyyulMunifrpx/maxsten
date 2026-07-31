# Edit Addon Group

Update nama grup add-on beserta daftar add-on di dalamnya (full replace untuk daftar add-on).

## Endpoint

```
PATCH /api/stores/addon-groups/:addonGroupId
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field            | Tipe            | Required | Keterangan                                                                              |
| ---------------- | --------------- | -------- | --------------------------------------------------------------------------------------- |
| `name`           | string          | ✅       | Maksimal 100 karakter. Disimpan huruf kecil semua setelah di-trim (sama seperti create) |
| `addons`         | array\<object\> | ✅       | Minimal 1 item. Lihat aturan full-replace di bawah                                      |
| `addons[].id`    | string          | ❌       | Sertakan untuk update add-on yang sudah ada. Kosongkan untuk membuat add-on baru        |
| `addons[].name`  | string          | ✅       | Maksimal 100 karakter                                                                   |
| `addons[].price` | number          | ✅       | Tidak boleh negatif                                                                     |

### Aturan `addons` (full replace berdasarkan `id`, sama seperti `variants` di update produk)

- Item **dengan `id`** yang cocok dengan add-on yang sudah ada di grup ini → di-**update** (`name`, `price`).
- Item **tanpa `id`** → dianggap add-on **baru**, otomatis dibuat.
- Add-on lama yang **tidak disertakan** di array ini sama sekali → otomatis **dihapus** (soft-delete).
- Kirim `id` yang tidak ada / bukan milik grup ini → seluruh request ditolak (400), tidak ada perubahan tersimpan.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Topping Minuman",
    "addons": [
      { "id": "addon-uuid-1", "name": "Boba", "price": 3500 },
      { "name": "Jelly", "price": 2000 }
    ]
  }'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "topping minuman",
    "created_at": "2026-07-01T00:00:00.000Z",
    "addons": [
      {
        "id": "addon-uuid-1",
        "name": "boba",
        "price": 3500,
        "created_at": "2026-07-01T00:00:00.000Z"
      },
      {
        "id": "addon-uuid-2",
        "name": "jelly",
        "price": 2000,
        "created_at": "2026-07-27T10:00:00.000Z"
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                                              | `errors`                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 400    | Validasi gagal (`addons` kosong/tidak dikirim, `price` negatif, dll)                                 | pesan Joi                                                                                   |
| 400    | Ada `addons[].id` yang tidak ditemukan / bukan milik grup ini                                        | `Invalid add-on`                                                                            |
| 401    | Tidak login / session expired                                                                        | `Unauthorized`                                                                              |
| 404    | User belum punya toko                                                                                | `Store not found`                                                                           |
| 404    | `addonGroupId` tidak ditemukan / sudah dihapus / bukan milik toko ini                                | `Addon Group not found`                                                                     |
| 409    | Grup add-on ini sedang dipakai oleh produk yang lagi ada di antrean aktif (`BELUM_BAYAR`/`DIPROSES`) | `Cannot edit this add-on group because a product using it is currently in an active queue.` |
| 409    | Nama grup baru sudah dipakai grup add-on aktif lain di toko yang sama                                | `An add-on group with this name already exists`                                             |

## Catatan

- **Grup add-on yang sedang dipakai produk dalam antrean aktif tidak bisa diedit sama sekali** — beda dari update produk (yang cuma membekukan sebagian field seperti `price`/`variants`), di sini **seluruh** proses edit grup ditolak kalau ada 1 saja produk pemakainya yang lagi diproses di antrean manapun di toko ini. Selesaikan/batalkan dulu antrean yang bersangkutan sebelum grup add-on ini bisa diedit.
- `name` grup dan `addons[].name` disimpan huruf kecil semua (konsisten dengan `POST /api/stores/addon-groups`) — lihat catatan di dokumentasi create soal implikasinya ke tampilan FE.
