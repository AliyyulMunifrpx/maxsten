# Update Operational Hours

## Alur Pemakaian

1. **GET** `/api/stores/me` — ambil jadwal saat ini (field `operational_hours`) buat prefill form.
2. User ubah jam/toggle aktif per hari.
3. **PATCH** `/api/stores/operational-hours` — kirim hari yang mau diubah.
4. Response balikin jadwal lengkap terbaru — FE sinkron langsung dari response, gak perlu refetch.

## Endpoint

```
PATCH /api/stores/operational-hours
```

> ⚠️ Method-nya `PATCH`, bukan `PUT`. Kalau sebelumnya sempat pakai `PUT` di kode FE, tolong disesuaikan.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

```json
{
  "operational_hours": [
    {
      "day": 1,
      "open_time": "09:00",
      "close_time": "17:00",
      "is_active": true
    },
    { "day": 0, "open_time": null, "close_time": null, "is_active": false }
  ]
}
```

| Field               | Tipe            | Required    | Keterangan                                                                                                     |
| ------------------- | --------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `operational_hours` | array\<object\> | ✅          | Tidak boleh kosong/`null`. Maksimal 7 entri (1 per hari)                                                       |
| `.day`              | number          | ✅          | `0`–`6` (`0` = Minggu ... `6` = Sabtu). Tidak boleh duplikat dalam 1 request                                   |
| `.open_time`        | string \| null  | kondisional | Format `HH:mm`, zero-padded, jam `00`–`23`, menit `00`–`59` (`8:00` ditolak, `24:00` ditolak, `12:60` ditolak) |
| `.close_time`       | string \| null  | kondisional | Sama aturan format seperti `open_time`                                                                         |
| `.is_active`        | boolean         | ✅          | Status buka/tutup hari itu                                                                                     |

**Hanya hari yang dikirim yang berubah** — hari lain yang tidak disertakan di array tetap dengan nilai lamanya (partial update, bukan full replace).

> ⚠️ **Untuk menandai hari tutup, kirim `open_time: null, close_time: null`.** Jangan kirim `open_time`/`close_time` dengan nilai sama (misal `"00:00"`/`"00:00"`) sebagai placeholder — itu akan **ditolak** (400) karena sistem menganggap `open_time` sama dengan `close_time` sebagai request tidak valid, terlepas dari `is_active`.

Jadwal yang melewati tengah malam (overnight) diperbolehkan, misal `open_time: "20:00"`, `close_time: "04:00"`.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/operational-hours \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"operational_hours":[{"day":0,"open_time":null,"close_time":null,"is_active":false}]}'
```

## Response

### 200 OK

```json
{
  "data": [
    { "day": 0, "open_time": null, "close_time": null, "is_active": false },
    { "day": 1, "open_time": "09:00", "close_time": "17:00", "is_active": true }
  ]
}
```

### Error

| Status | Kondisi                                                                                | `errors`                                                |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 400    | `operational_hours` tidak dikirim atau `null`                                          | pesan validasi                                          |
| 400    | `day` di luar rentang `0`–`6`, atau lebih dari 7 entri dikirim                         | pesan validasi                                          |
| 400    | Ada `day` yang duplikat dalam 1 request                                                | `Duplicate schedule for day X is not allowed`           |
| 400    | `open_time` sama dengan `close_time` (dan keduanya tidak `null`)                       | `open_time and close_time cannot be the same for day X` |
| 400    | Format waktu tidak valid (bukan `HH:mm`, jam/menit di luar rentang, tidak zero-padded) | pesan validasi                                          |
| 401    | Tidak login / session expired                                                          | `Unauthorized`                                          |
| 404    | User belum punya toko                                                                  | `Store not found.`                                      |

## Catatan

- Validasi dijalankan **sebelum** ada perubahan apa pun disimpan — kalau salah satu entri dalam request tidak valid, **seluruh request ditolak dan tidak ada hari yang berubah sama sekali** (bukan cuma entri yang salah yang diabaikan).
