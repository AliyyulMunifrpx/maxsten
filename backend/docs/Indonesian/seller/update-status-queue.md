# Update Queue Status

Ubah status sebuah antrean (proses, selesaikan, atau batalkan). Perubahan status juga otomatis dikirim real-time ke pembeli lewat Socket.IO.

## Endpoint

```
PATCH /api/stores/queues/:queueId
```

`:queueId` adalah `id` antrean UUID.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware) — dipakai memastikan antrean yang diubah memang milik toko user yang login.

## Request

Content-Type: `application/json`

| Field     | Tipe          | Required | Keterangan                                                                           |
| --------- | ------------- | -------- | ------------------------------------------------------------------------------------ |
| `storeId` | string (UUID) | ✅       | `public_id` toko pemilik antrean                                                     |
| `status`  | string        | ✅       | Status tujuan — lihat state machine di bawah                                         |
| `reason`  | string        | ❌       | Maksimal 100 karakter. Alasan pembatalan, hanya relevan kalau `status: "DIBATALKAN"` |

### State machine — transisi yang diperbolehkan

| Status sekarang | Boleh pindah ke                          |
| --------------- | ---------------------------------------- |
| `BELUM_BAYAR`   | `DIPROSES`, `DIBATALKAN`                 |
| `DIPROSES`      | `SELESAI`, `DIBATALKAN`                  |
| `SELESAI`       | — (status akhir, tidak bisa diubah lagi) |
| `DIBATALKAN`    | — (status akhir, tidak bisa diubah lagi) |

Transisi di luar tabel ini (misal `SELESAI` → `DIPROSES`, atau lompat `BELUM_BAYAR` → `SELESAI`) akan ditolak.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/stores/queues/8b053812-002e-4738-835d-3a1a11af35a5 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "8b053812-002e-4738-835d-3a1a11af35a5", "status": "DIBATALKAN", "reason": "Stok habis"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": 42,
    "queue_number": 3,
    "status": "DIBATALKAN",
    "completed_at": null,
    "cancellation_reason": "Stok habis",
    "cancelled_by": "SELLER",
    "queueDetails": [
      {
        "id": 100,
        "quantity": 1,
        "product": {
          "id": 1,
          "name": "Nasi Goreng",
          "price": 20000,
          "image_url": null
        }
      }
    ]
  }
}
```

- `completed_at` otomatis terisi waktu sekarang saat `status` berubah jadi `SELESAI`.
- `cancellation_reason` dan `cancelled_by: "SELLER"` otomatis terisi saat `status` berubah jadi `DIBATALKAN` lewat endpoint ini (dibedakan dari pembatalan otomatis oleh sistem/cron).

### Error

| Status | Kondisi                                                                                                                    | `errors`                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 400    | `status` bukan salah satu dari `DIPROSES`/`SELESAI`/`DIBATALKAN`                                                           | pesan validasi Joi                                             |
| 400    | `status` tujuan valid tapi bukan transisi yang diperbolehkan dari status saat ini                                          | `Cannot change the status from <status_lama> to <status_baru>` |
| 400    | Validasi gagal (field wajib kosong, `reason` lebih dari 100 karakter)                                                      | pesan validasi                                                 |
| 401    | Tidak login / session expired                                                                                              | `Unauthorized`                                                 |
| 404    | `queueId` tidak ditemukan, atau `storeId` bukan milik user yang login                                                      | `Queue not found`                                              |
| 409    | Status antrean sudah berubah di antara waktu request dibaca dan disimpan (dua kasir memproses antrean yang sama bersamaan) | `The queue status has changed`                                 |

## Catatan

- Update lewat endpoint ini otomatis memicu event Socket.IO `STATUS_UPDATED` — dikirim ke kamar buyer (`ANTREAN_<queueId>`) dan kamar seller (`TOKO_<store_id>`) sekaligus, dengan `triggered_by: "buyer"`. Lihat `socket-io.md`.
