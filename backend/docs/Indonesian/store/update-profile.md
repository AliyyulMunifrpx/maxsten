# Update Store Profile

## Alur Pemakaian

1. **GET** `/api/stores/me` — ambil data toko saat ini buat prefill form edit.
2. User ubah field yang mau diedit.
3. **PATCH** `/api/stores/me` — kirim field yang diupdate.
4. Response balikin **data toko lengkap terbaru** (shape sama persis dengan `GET /api/stores/me`, termasuk `is_open` yang dihitung ulang).

## Endpoint

```
PATCH /api/stores/me
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field             | Tipe   | Required | Keterangan                                                                        |
| ----------------- | ------ | -------- | --------------------------------------------------------------------------------- |
| `name`            | string | ❌       | Nama toko                                                                         |
| `description`     | string | ❌       | Deskripsi toko                                                                    |
| `street_address`  | string | ❌       | Nama jalan / alamat detail                                                        |
| `village`         | string | ❌       | Desa/kelurahan                                                                    |
| `district`        | string | ❌       | Kecamatan                                                                         |
| `city`            | string | ❌       | Kota/kabupaten                                                                    |
| `province`        | string | ❌       | Provinsi                                                                          |
| `postal_code`     | string | ❌       | Kode pos                                                                          |
| `latitude`        | number | ❌       | Titik peta toko                                                                   |
| `longitude`       | number | ❌       | Titik peta toko                                                                   |
| `timezone`        | string | ❌       | Harus IANA timezone valid, misal `Asia/Jakarta`, `Asia/Makassar`, `Asia/Jayapura` |
| `payment_timeout` | number | ❌       | Satuan menit                                                                      |

Field yang tidak dikirim akan tetap dengan nilai lamanya (partial update).

> `logo_url` dan `operational_hours` **tidak** diupdate lewat endpoint ini — pakai `PATCH /api/stores/logo` dan `PATCH /api/stores/operational-hours` masing-masing.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/me \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Toko Sumber Rejeki Baru", "payment_timeout": 20}'
```

## Response

### 200 OK

Shape sama persis dengan `GET /api/stores/me`:

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Toko Sumber Rejeki Baru",
    "description": "Toko kelontong harian",
    "city": "Bogor",
    "province": "Jawa Barat",
    "village": "Sukamaju",
    "district": "Cibinong",
    "street_address": "Jl. Mawar No. 12",
    "postal_code": "16916",
    "logo_url": "/uploads/logo-1234567890.png",
    "timezone": "Asia/Jakarta",
    "manual_status": null,
    "manual_updated_at": null,
    "operational_hours": [
      {
        "day": 0,
        "is_active": true,
        "open_time": "08:00",
        "close_time": "20:00"
      }
    ],
    "payment_timeout": 20,
    "is_open": true
  }
}
```

### Error

| Status | Kondisi                                   | `errors`           |
| ------ | ----------------------------------------- | ------------------ |
| 400    | Validasi gagal                            | pesan sesuai field |
| 400    | `timezone` bukan IANA timezone yang valid | `Invalid timezone` |
| 401    | Tidak login / session expired             | `Unauthorized`     |
| 404    | Toko tidak ditemukan                      | `Store not found.` |

## Catatan

- Kalau `timezone` yang dikirim tidak valid, request ditolak (400) dan `timezone` toko **tidak berubah** — tidak ada kondisi di mana toko tersimpan dengan timezone yang salah.
- `payment_timeout` menentukan `expired_at` antrean baru — tiap antrean `BELUM_BAYAR` dapat `expired_at` yang dihitung sekali saat dibuat (waktu dibuat + `payment_timeout` yang berlaku saat itu). Kalau toko mengubah `payment_timeout`, perubahan itu hanya berlaku untuk antrean baru yang dibuat setelahnya — antrean yang sudah ada tetap memakai batas waktu lama, tidak ikut berubah retroaktif.
