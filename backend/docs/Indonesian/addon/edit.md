
# Edit Addon Group

Update nama grup add-on beserta daftar add-on di dalamnya secara keseluruhan (_full replace_).

## Endpoint

```text
PATCH /api/stores/addon-groups/:addonGroupId

```

## Auth

Cookie-based auth. `userId` didapat dari `req.user.id` (middleware).

## Request

**Content-Type:** `application/json`

| Field            | Tipe   | Required | Keterangan                                                                                       |
| ---------------- | ------ | -------- | ------------------------------------------------------------------------------------------------ |
| `name`           | string | ✅       | Maksimal 100 karakter. Disimpan huruf kecil semua setelah di-trim. Harus unik antar grup aktif.  |
| `addons`         | array  | ✅       | Minimal 1 item. Lihat aturan _full-replace_ di bawah.                                            |
| `addons[].id`    | string | ❌       | Sertakan untuk _update_ add-on yang sudah ada. Kosongkan untuk membuat add-on baru.              |
| `addons[].name`  | string | ✅       | Maksimal 100 karakter. Harus unik di dalam grup ini. Disimpan huruf kecil semua setelah di-trim. |
| `addons[].price` | number | ✅       | Tidak boleh negatif (boleh `0`).                                                                 |

### Aturan `addons` (Full Replace berdasarkan `id`)

- **Update:** Item **dengan `id**` yang cocok dengan add-on yang sudah ada di grup ini akan di-update (`name`, `price`).
- **Create:** Item **tanpa `id**` dianggap add-on baru, otomatis dibuat.
- **Delete:** Add-on lama yang **tidak disertakan** di dalam array ini otomatis dihapus (_soft-delete_).
- **⚠️ Cegah Hapus & Bikin Ulang:** Kamu tidak boleh mengirim add-on baru (tanpa `id`) dengan nama yang sama persis dengan add-on lama yang sedang tidak diikutkan (_dihapus_). Jika ingin mengupdate, gunakan `id` add-on tersebut. (Jika dilanggar, API akan mereturn error 400).
- **Invalid ID:** Mengirim `id` yang tidak ada / bukan milik grup ini akan membuat seluruh request ditolak (400), tidak ada perubahan yang tersimpan.

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
        "created_at": "2026-08-03T10:00:00.000Z"
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                                                                                          | `errors`                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 400    | Validasi payload gagal (`addons` kosong, `price` negatif, dll).                                                                  | _Pesan dari Joi_                                                                            |
| 400    | Terdapat nama add-on yang duplikat di dalam array `addons` yang dikirim pada request yang sama.                                  | `Add-on names within a group must be unique`                                                |
| 400    | Ada `addons[].id` yang tidak ditemukan / bukan milik grup ini.                                                                   | `Invalid add-on`                                                                            |
| 400    | Nama add-on baru (tanpa ID) bentrok dengan nama add-on lama yang sedang coba di-_soft-delete_ (karena tidak diikutkan di array). | `Add-on name already used by an existing add-on in this group`                              |
| 401    | Tidak login / session expired.                                                                                                   | `Unauthorized`                                                                              |
| 404    | User belum punya toko.                                                                                                           | `Store not found`                                                                           |
| 404    | `addonGroupId` tidak ditemukan / sudah dihapus / bukan milik toko ini.                                                           | `Addon Group not found`                                                                     |
| 409    | Grup add-on ini sedang dipakai oleh produk yang berada di antrean aktif (`BELUM_BAYAR` / `DIPROSES`).                            | `Cannot edit this add-on group because a product using it is currently in an active queue.` |
| 409    | Nama add-on yang baru ditambahkan sudah terpakai oleh add-on aktif lain di grup ini di dalam database.                           | `An add-on with this name already exists in this group`                                     |
| 409    | Nama grup baru sudah dipakai oleh grup add-on aktif lain di toko yang sama.                                                      | `An add-on group with this name already exists`                                             |

## Catatan Tambahan

- **Blokir Antrean Aktif:** Grup add-on yang sedang dipakai oleh produk dalam antrean aktif **tidak bisa diedit sama sekali**. Seluruh proses edit akan ditolak jika ada 1 saja produk pemakainya yang sedang diproses dalam antrean (`BELUM_BAYAR` atau `DIPROSES`). Selesaikan atau batalkan dulu antrean yang bersangkutan.
- **Format Casing:** `name` grup dan `addons[].name` disimpan dalam huruf kecil semua (_lowercase_). Jika tampilan di antarmuka pembeli/penjual membutuhkan huruf kapital yang rapi (misal: "Topping Minuman"), Frontend perlu menerapkan _title-case_ mandiri (contoh: `text-transform: capitalize` pada CSS).
