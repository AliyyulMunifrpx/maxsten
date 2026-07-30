# Create Queue (Checkout)

Membuat antrean baru berdasarkan barang yang dipilih dari katalog. Endpoint ini akan otomatis membuat `guest_id` jika pembeli belum memilikinya, dan mengirimkannya kembali via `Set-Cookie`.

## Endpoint

```text
POST /api/stores/:storeId/queues

```

## Auth

Otomatis via Cookie. Sistem akan membaca cookie `guest_id`. Jika belum ada, sistem akan membuatkan sesi pembeli baru (_anonymous guest_).

## Request

**URL Parameters:**

| Parameter | Tipe          | Required | Keterangan                                       |
| --------- | ------------- | -------- | ------------------------------------------------ |
| `storeId` | string (UUID) | ✅       | `public_id` milik toko tempat pembeli mengantre. |

**Headers:**
Pastikan mengirimkan `Content-Type: application/json` dan menerima _credentials_ (cookie) jika dipanggil dari FE (`withCredentials: true`).

**Body (JSON):**

| Field   | Tipe             | Required | Keterangan                                             |
| ------- | ---------------- | -------- | ------------------------------------------------------ |
| `note`  | string           | ❌       | Catatan opsional dari pembeli (maksimal 255 karakter). |
| `items` | array of objects | ✅       | Minimal 1 produk yang dibeli.                          |

**Struktur Objek di dalam `items`:**

| Field             | Tipe            | Required | Keterangan                                |
| ----------------- | --------------- | -------- | ----------------------------------------- |
| `product_id`      | string (UUID)   | ✅       | ID internal produk yang dipesan.          |
| `quantity`        | number          | ✅       | Jumlah produk (Minimal 1, Maksimal 100).  |
| `variant_id`      | string (UUID)   | ❌       | ID varian yang dipilih (misal: "Pedas").  |
| `selected_addons` | array of string | ❌       | Array berisi ID dari Add-on yang dipilih. |

## Contoh Request

```bash
curl -X POST "https://example.com/api/stores/f47ac10b-58cc-4372-a567-0e02b2c3d479/queues" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Jangan pedes ya bang",
    "items": [
      {
        "product_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "quantity": 2,
        "variant_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "selected_addons": ["c9a5d102-18f3-4f68-b8d9-81a9424e8a1d", "addon-101"]
      }
    ]
  }'

```

## Response

### 200 OK

Selain membalas dengan JSON, jika ini adalah kunjungan pertama pembeli, Response akan menyertakan header `Set-Cookie: guest_id=<uuid>; HttpOnly; Secure; SameSite=None; Max-Age=86400`.

```json
{
  "data": {
    "id": "1",
    "store_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
    "queue_number": 5,
    "guest_id": "guest-uuid-abcd",
    "status": "BELUM_BAYAR",
    "note": "Jangan pedes ya bang",
    "total_price": 50000,
    "created_at": "2026-07-28T14:00:00.000Z",
    "expired_at": "2026-07-28T14:30:00.000Z",
    "server_now": "2026-07-28T14:00:00.500Z",
    "queueDetails": [
      {
        "id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "product_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "variant_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "quantity": 2,
        "selected_addons": [
          {
            "id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
            "name": "Keju",
            "price": 3000
          }
        ],
        "product": {
          "name": "Burger Spesial",
          "price": 20000
        },
        "variant": {
          "name": "Pedas",
          "additional_price": 2000
        }
      }
    ]
  }
}
```

### Error

| Status | Kondisi                                                 | `errors`                                                |
| ------ | ------------------------------------------------------- | ------------------------------------------------------- |
| 400    | Toko sedang ditutup otomatis/manual.                    | `Sorry, the store is currently closed`                  |
| 400    | Masih ada pesanan aktif (belum lunas/diproses).         | `Please finish the previous queue first.`               |
| 400    | Produk kehabisan stok (`is_available: false`).          | `Sorry, the product {nama} is currently unavailable...` |
| 400    | Pilihan `variant_id` atau add-on tidak cocok/salah.     | `Invalid variant for product {nama}`                    |
| 400    | Validasi parameter gagal (kuantitas minus, UUID salah). | (Pesan otomatis dari Joi)                               |
| 404    | Toko tidak ditemukan / terhapus.                        | `Store not found`                                       |
| 404    | Produk tidak ditemukan / terhapus.                      | `Some products were not found`                          |

## Catatan Tambahan (Untuk Frontend)

- **Timer Pembayaran:** Gunakan selisih antara `server_now` dan `expired_at` untuk menghitung mundur _countdown_ pembayaran secara presisi, jangan andalkan jam OS lokal pengguna.
- **Socket.io:** Baca detail di dokumentasi websocket
