# Postal Code Lookup

Proxy pencarian kode pos ke layanan pihak ketiga ([carikodepos.id](https://carikodepos.id)) — dipakai untuk fitur auto-fill alamat (provinsi/kota/kecamatan/desa) di form buat/edit toko.

## Endpoint

```
GET /api/stores/postal-codes
```

## Auth

Cookie-based auth (endpoint ini berada di bawah `userRouter`, konsisten dengan endpoint lain yang butuh login).

## Request

| Param        | Lokasi | Tipe   | Required            | Keterangan                         |
| ------------ | ------ | ------ | ------------------- | ---------------------------------- |
| `postalCode` | query  | string | ✅ (secara praktik) | Kode pos yang dicari, bisa parsial |

> ⚠️ **Belum ada validasi Joi di endpoint ini** — kalau `postalCode` tidak dikirim, request tetap diteruskan ke API pihak ketiga sebagai `q=undefined`. Lihat catatan di bawah.

## Contoh Request

```bash
curl -X GET "https://example.com/api/stores/postal-codes?postalCode=56151" \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

Response ini meneruskan langsung isi `data` dari carikodepos.id, maksimal 5 hasil:

```json
{
  "data": [
    {
      "province": { "id": "33", "name": "JAWA TENGAH" },
      "city": { "id": "3308", "name": "KAB. MAGELANG" },
      "district": { "id": "330802", "name": "BANDONGAN" },
      "village": { "id": "3308022003", "name": "TONOBOYO" }
    }
  ]
}
```

> Struktur field di atas berdasarkan pemakaian nyata di FE (`data[0].province.name`, dst) — kalau carikodepos.id mengubah struktur response mereka, field ini bisa berubah tanpa pemberitahuan dari sisi kita, karena tidak ada mapping/transformasi apa pun di backend (diteruskan mentah-mentah).

### Error

| Status | Kondisi                                                             | `errors`                                                              |
| ------ | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 401    | Tidak login / session expired                                       | `Unauthorized`                                                        |
| 500    | API pihak ketiga merespons dengan status gagal                      | `Failed to retrieve the ZIP code data`                                |
| 500    | Gagal terhubung ke API pihak ketiga sama sekali (timeout, DNS, dll) | Pesan generik dari error handler global, bukan pesan spesifik di atas |

## Catatan

- **Endpoint ini murni proxy** — tidak ada caching, tidak ada validasi format kode pos (harusnya 5 digit angka), dan tidak ada rate limiting khusus di sisi kita. Tiap request buyer akan langsung memicu 1 request baru ke carikodepos.id, tanpa terkecuali (termasuk permintaan berulang untuk kode pos yang sama persis).
- **`postalCode` kosong/tidak dikirim tidak ditolak di awal** — request tetap diteruskan ke API eksternal (`q=undefined` di URL mereka), baru gagal di sisi carikodepos.id kalau mereka menolaknya. Idealnya query kosong ditolak lebih awal dengan `400`, sebelum sempat memanggil API eksternal sama sekali.
- Ketergantungan ke layanan eksternal ini artinya **ketersediaan fitur auto-fill alamat bergantung pada uptime carikodepos.id** — kalau layanan mereka down, endpoint ini akan selalu mengembalikan `500`, terlepas dari kondisi server sendiri.
