# Update Store Logo

## Alur Pemakaian

1. **GET** `/api/stores/me` — ambil `logo_url` saat ini buat preview di halaman edit.
2. User pilih file baru (crop di FE seperti alur create).
3. **PATCH** `/api/stores/me/logo` — upload file baru.
4. Response balikin **data toko lengkap terbaru** (shape sama persis dengan `GET /api/stores/me`) — FE update preview & data lain langsung dari response, gak perlu refetch.

## Endpoint

```
PATCH /api/stores/me/logo
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `multipart/form-data`

| Field  | Tipe | Required | Keterangan                                       |
| ------ | ---- | -------- | ------------------------------------------------ |
| `logo` | file | ✅       | Field wajib — request ditolak (400) kalau kosong |

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/me/logo \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "logo=@/path/to/new-logo.png"
```

## Response

### 200 OK

Shape sama persis dengan `GET /api/stores/me`:

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Toko Sumber Rejeki",
    "logo_url": "/uploads/logo-1721654321-987654321.png",
    "timezone": "Asia/Jakarta",
    "operational_hours": [
      {
        "day": 0,
        "is_active": true,
        "open_time": "08:00",
        "close_time": "20:00"
      }
    ],
    "is_open": true
  }
}
```

### Error

| Status | Kondisi                           | `errors`                 |
| ------ | --------------------------------- | ------------------------ |
| 400    | Tidak ada file dikirim            | `No files were uploaded` |
| 401    | Tidak login / session expired     | `Unauthorized`           |
| 404    | Toko tidak ditemukan              | `Store not found`        |
| 413    | Ukuran file melebihi batas multer | —                        |

## Catatan

- Logo lama otomatis dihapus dari server setelah logo baru berhasil tersimpan — FE tidak perlu melakukan apa pun terkait file lama.
