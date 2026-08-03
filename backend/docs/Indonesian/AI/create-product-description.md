# AI Product Description Generator

Menghasilkan 2 pilihan deskripsi produk otomatis berdasarkan nama produk, masing-masing dengan skor daya tarik.

## Endpoint

```
POST /api/ai/descriptions
```

> ⚠️ **Response bisa memakan waktu sampai ~30 detik** — endpoint ini memanggil layanan AI pihak ketiga. Tampilkan loading state yang jelas, terutama karena ini kemungkinan dipanggil di tengah proses mengisi form (create/edit produk), bukan di halaman tersendiri.

## Auth

Cookie-based auth. `userId` dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field          | Tipe   | Required | Keterangan                                    |
| -------------- | ------ | -------- | --------------------------------------------- |
| `product_name` | string | ✅       | Nama produk yang deskripsinya mau di-generate |

## Contoh Request

```bash
curl -X POST https://example.com/api/ai/descriptions \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"product_name": "Nasi Goreng Spesial"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "recommendations": [
      {
        "text": "Nasi goreng dengan bumbu rempah pilihan, dilengkapi telur mata sapi dan ayam suwir gurih.",
        "score": 92
      },
      {
        "text": "Perpaduan nasi goreng klasik dengan cita rasa rumahan, disajikan hangat dengan pelengkap favorit.",
        "score": 87
      }
    ]
  }
}
```

`recommendations` selalu berisi minimal 1 pilihan, tiap item punya `text` (deskripsi) dan `score` (1–100, seberapa kuat deskripsi itu diperkirakan menarik pembeli).

### Error

| Status | Kondisi                                                                                                                  | `errors`                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 401    | Tidak login / session expired                                                                                            | `Unauthorized`                                                           |
| 404    | User belum punya toko                                                                                                    | `Store not found`                                                        |
| 500    | Gagal mendapat respons dari AI (timeout ~30 detik, layanan AI down, atau responsnya tidak sesuai format yang diharapkan) | `Failed to generate an automatic product description. Please try again.` |

## Catatan

- Endpoint ini **cuma menghasilkan draf teks**, tidak langsung menyimpan apa pun ke produk — user harus memilih salah satu hasil dan mengisikannya sendiri ke field `description` saat create/update produk (`POST /api/stores/products` / `PATCH /api/stores/products/:productId`).
- `score` adalah perkiraan dari AI, bukan hasil pengujian nyata terhadap pembeli — sebaiknya ditampilkan sebagai panduan pemilihan (misal urutan/badge), bukan diklaim sebagai angka yang presisi ke user.
