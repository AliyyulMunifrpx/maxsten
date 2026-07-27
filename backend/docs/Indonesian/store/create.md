# Create Store

Membuat toko baru untuk user yang sedang login.

## Endpoint

```
POST /api/stores
```

## Auth

Butuh autentikasi. Cookie-based (`access_token`/`refresh_token`, `httpOnly`). `userId` diambil dari middleware, bukan dari body.

## Request

Content-Type: `multipart/form-data` (karena ada upload `logo`). Bisa juga dikirim sebagai `application/json` kalau tidak menyertakan logo.

| Field               | Tipe            | Required | Keterangan                                                                                                                   |
| ------------------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`              | string          | ✅       | Nama toko                                                                                                                    |
| `description`       | string          | ❌       | Deskripsi toko                                                                                                               |
| `street_address`    | string          | ✅       | Nama jalan / alamat detail                                                                                                   |
| `village`           | string          | ✅       | Desa/kelurahan                                                                                                               |
| `district`          | string          | ✅       | Kecamatan                                                                                                                    |
| `city`              | string          | ✅       | Kota/kabupaten                                                                                                               |
| `province`          | string          | ✅       | Provinsi                                                                                                                     |
| `postal_code`       | string          | ✅       | Kode pos                                                                                                                     |
| `latitude`          | number          | ✅       | Diambil dari picker `react-leaflet` di FE                                                                                    |
| `longitude`         | number          | ✅       | Diambil dari picker `react-leaflet` di FE                                                                                    |
| `logo`              | file            | ❌       | Field name harus `logo`. Kalau tidak dikirim, `logo_url` disimpan `null`                                                     |
| `timezone`          | string          | ✅       | `Asia/Jakarta` \| `Asia/Makassar` \| `Asia/Jayapura`                                                                         |
| `operational_hours` | array\<object\> | ❌       | Lihat struktur di bawah. Kalau tidak dikirim (atau array kosong), sistem otomatis isi default 7 hari, semua buka 08:00–20:00 |

### Struktur `operational_hours`

Array berisi object per hari. `day` numerik: `0` = Minggu, `1` = Senin, ..., `6` = Sabtu.

```json
[
  { "day": 1, "open_time": "08:00", "close_time": "20:00", "is_active": true },
  { "day": 2, "open_time": "08:00", "close_time": "20:00", "is_active": true },
  { "day": 0, "open_time": "08:00", "close_time": "20:00", "is_active": false }
]
```

Karena dikirim lewat `multipart/form-data`, field ini dikirim sebagai **JSON string**, bukan array langsung:

```
operational_hours: '[{"day":1,"open_time":"08:00","close_time":"20:00","is_active":true}, ...]'
```

## Contoh Request

**Dengan logo (multipart):**

```bash
curl -X POST https://example.com/api/stores \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "name=Toko Sumber Rejeki" \
  -F "description=Toko kelontong harian" \
  -F "street_address=Jl. Mawar No. 12" \
  -F "village=Sukamaju" \
  -F "district=Cibinong" \
  -F "city=Bogor" \
  -F "province=Jawa Barat" \
  -F "postal_code=16916" \
  -F "latitude=-6.481" \
  -F "longitude=106.853" \
  -F "timezone=Asia/Jakarta" \
  -F 'operational_hours=[{"day":1,"open_time":"08:00","close_time":"20:00","is_active":true}]' \
  -F "logo=@/path/to/logo.png"
```

**Tanpa logo (JSON biasa):**

```bash
curl -X POST https://example.com/api/stores \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Toko Sumber Rejeki",
    "street_address": "Jl. Mawar No. 12",
    "village": "Sukamaju",
    "district": "Cibinong",
    "city": "Bogor",
    "province": "Jawa Barat",
    "postal_code": "16916",
    "latitude": -6.481,
    "longitude": 106.853,
    "timezone": "Asia/Jakarta"
  }'
```

## Response

### 201 Created

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

### Error

| Status | Kondisi                                                          | `errors`                                                    |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 400    | Validasi gagal (field wajib kosong / format salah)               | pesan sesuai field                                          |
| 400    | `operational_hours` dikirim sebagai string tapi bukan JSON valid | `'operational_hours' must be a valid JSON array of objects` |
| 400    | User sudah punya toko aktif                                      | `You already have a store`                                  |
| 401    | Tidak login / session expired                                    | `Unauthorized`                                              |
| 413    | Ukuran file `logo` terlalu besar                                 | —                                                           |
| 500    | Server/database error                                            | —                                                           |

```json
{
  "errors": "You already have a store"
}
```

## Catatan

- `latitude`/`longitude` diisi dari peta interaktif (`react-leaflet`) di sisi FE, bukan diketik manual.
- `logo_url` di database disimpan sebagai path relatif `/uploads/${file.filename}`, bukan URL absolut.
- `public_id` di response dipakai sebagai identifier publik toko (bukan `id` internal/DB).
- Kalau FE tidak mengirim `operational_hours` sama sekali, tidak masalah — backend otomatis isi default 08:00–20:00 tiap hari. FE tetap boleh kirim jadwal custom sejak awal kalau user langsung mengaturnya di form create.
- Endpoint ini menolak percobaan bikin toko kedua meski dikirim bersamaan (concurrent request) — hanya satu yang akan berhasil, sisanya dapat error `400`.
