# Cancel Queue (Buyer)

Buyer membatalkan pesanan miliknya sendiri, selama masih berstatus `BELUM_BAYAR`.

## Endpoint

```
PATCH /api/:publicId/queues/:queueId/cancel
```

`:publicId` = `public_id` toko. `:queueId` = ID antrean (angka).

## Auth

Pakai cookie `guest_id` — bukan login. Antrean cuma bisa dibatalkan oleh guest yang sama dengan yang membuatnya.

## Request

Content-Type: `application/json`

| Field    | Tipe   | Required | Keterangan                                               |
| -------- | ------ | -------- | -------------------------------------------------------- |
| `reason` | string | ❌       | Maksimal 100 karakter. Alasan pembatalan dari sisi buyer |

## Contoh Request

```bash
curl -X PATCH https://example.com/api/8kd93jf82j/queues/42/cancel \
  -b "guest_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Lama banget"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": 42,
    "status": "DIBATALKAN",
    "reason": "Lama banget"
  }
}
```

### Error

| Status | Kondisi                                                                               | `errors`                                                                               |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 400    | Validasi gagal (`publicId`/`queueId` format salah, `reason` lebih dari 100 karakter)  | pesan validasi                                                                         |
| 400    | Antrean sudah diproses seller (status bukan `BELUM_BAYAR` lagi)                       | `The order has been processed and cannot be canceled`                                  |
| 400    | Antrean baru saja mulai diproses **tepat saat** request ini berjalan (race condition) | `Oh, someone beat you to it! Your order has just started being processed by the store` |
| 401    | Cookie `guest_id` tidak ada                                                           | `Unauthorized`                                                                         |
| 404    | Antrean tidak ditemukan, atau bukan milik `guest_id` yang mengakses                   | `The order was not found or does not belong to you`                                    |

> Perhatikan ada **2 pesan 400 yang berbeda** untuk kasus mirip: kalau dicek di awal statusnya sudah bukan `BELUM_BAYAR`, dapat pesan pertama. Tapi kalau di awal masih `BELUM_BAYAR` lalu tepat di tengah proses request ini seller keburu memprosesnya duluan, dapat pesan kedua (race condition). Dua-duanya sama-sama berarti "gagal dibatalkan", boleh ditangani sama di FE, tapi pesannya sengaja dibedakan untuk kejelasan debugging.

## Catatan

- **Antrean tetap bisa dibatalkan meskipun tokonya sudah dihapus/nonaktif** — ini disengaja. Buyer yang sudah terlanjur membuat pesanan sebelum toko ditutup tidak boleh "tersandera" (order-nya nyangkut selamanya berstatus `BELUM_BAYAR` tanpa bisa dibatalkan) hanya karena tokonya sudah tidak aktif.
- Pembatalan lewat endpoint ini otomatis memicu event Socket.IO `STATUS_UPDATED` — dikirim ke kamar buyer (`ANTREAN_<queueId>`) dan kamar seller (`TOKO_<store_id>`) sekaligus, dengan `triggered_by: "buyer"`. Lihat `socket-io.md`.
