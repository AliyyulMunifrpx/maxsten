# Create Cancel Reason Template

Membuat template alasan pembatalan pesanan, dipakai seller supaya bisa pilih alasan siap pakai (misal "Stok habis") saat membatalkan antrean, tanpa perlu mengetik ulang tiap kali.

## Endpoint

```
POST /api/seller/cancel-reasons
```

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field    | Tipe   | Required | Keterangan                                                                |
| -------- | ------ | -------- | ------------------------------------------------------------------------- |
| `reason` | string | ✅       | Maksimal 255 karakter. Harus unik di antara template milik toko yang sama |

## Contoh Request

```bash
curl -X POST https://example.com/api/seller/cancel-reasons \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Stok habis"}'
```

## Response

### 201 Created

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Stok habis",
    "created_at": "2026-07-27T10:00:00.000Z"
  }
}
```

### Error

| Status | Kondisi                                                      | `errors`                                               |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------ |
| 400    | `reason` tidak dikirim atau lebih dari 255 karakter          | pesan Joi                                              |
| 401    | Tidak login / session expired                                | `Unauthorized`                                         |
| 404    | User belum punya toko                                        | `Store not found`                                      |
| 409    | Teks alasan ini sudah ada sebagai template di toko yang sama | `A cancellation reason with this text already exists.` |

## Catatan

- Path endpoint ini `/api/seller/...` — berbeda dari kebanyakan endpoint lain yang menggunakan pola `/api/stores/...`. Perhatikan penulisannya.
