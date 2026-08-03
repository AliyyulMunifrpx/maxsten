# AI Store Report

Menghasilkan ringkasan performa toko dalam 1 bulan tertentu, ditulis dalam bahasa natural oleh AI, lengkap dengan rekomendasi praktis.

## Endpoint

```
POST /api/ai/reports
```

> ⚠️ **Response bisa memakan waktu sampai ~30 detik** — endpoint ini memanggil layanan AI pihak ketiga, jauh lebih lambat dari endpoint lain. FE wajib menampilkan loading state yang jelas (bukan spinner instan biasa), dan idealnya kasih indikasi "sedang membuat laporan..." ke user.

## Auth

Cookie-based auth. `userId` dari `req.user` (middleware).

## Request

Content-Type: `application/json`

| Field   | Tipe   | Required | Keterangan                                          |
| ------- | ------ | -------- | --------------------------------------------------- |
| `month` | number | ❌       | `1`–`12`. Default bulan berjalan (di timezone toko) |
| `year`  | number | ❌       | Default tahun berjalan (di timezone toko)           |

## Contoh Request

```bash
curl -X POST https://example.com/api/ai/reports \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"month": 7, "year": 2026}'
```

## Response

### 200 OK

```json
{
  "data": {
    "ai_report": {
      "greeting": "Halo Kak Budi,",
      "evaluation": "Performa toko kamu bulan ini cukup solid dengan omzet Rp3.500.000 dari 108 pesanan berhasil. Tingkat pembatalan masih terkendali di 5.3%, dan rata-rata waktu tunggu pelanggan terbilang cepat...",
      "recommendations": [
        "Pertimbangkan menambah stok Nasi Goreng Spesial karena jadi produk terlaris bulan ini.",
        "Jam 12:00-13:00 adalah waktu tersibuk — pastikan staf cukup di jam tersebut untuk menjaga waktu tunggu tetap singkat."
      ]
    }
  }
}
```

**Kasus tanpa transaksi sama sekali di bulan yang diminta** — response tetap bentuknya sama, tapi isinya template tetap (bukan hasil AI, request ke AI tidak pernah dikirim sama sekali untuk kasus ini, jadi lebih cepat & tidak kena biaya API):

```json
{
  "data": {
    "ai_report": {
      "greeting": "Halo Kak Budi,",
      "evaluation": "Belum ada data transaksi yang bisa dievaluasi pada periode ini.",
      "recommendations": [
        "Coba bagikan link tokomu ke media sosial untuk menarik pelanggan pertama bulan ini!"
      ]
    }
  }
}
```

### Error

| Status | Kondisi                                                                                                                  | `errors`                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 400    | `month`/`year` tidak valid (`month` di luar `1`–`12`, atau bukan angka)                                                  | `Invalid month/year parameters`                         |
| 401    | Tidak login / session expired                                                                                            | `Unauthorized`                                          |
| 404    | User belum punya toko                                                                                                    | `Store not found`                                       |
| 500    | Gagal mendapat respons dari AI (timeout ~30 detik, layanan AI down, atau responsnya tidak sesuai format yang diharapkan) | `Unable to obtain an analysis from the AI at this time` |

## Catatan

- Data yang dipakai untuk membuat laporan (omzet, jumlah pesanan, tingkat pembatalan, waktu tunggu rata-rata, jam/hari tersibuk, 3 produk & 3 add-on terlaris) sama persis dengan yang dihitung di `GET /api/stores/me/history` — laporan AI ini pada dasarnya "menerjemahkan" angka-angka itu jadi narasi, bukan sumber data baru.
- `recommendations` selalu berupa array string — jumlah item bisa bervariasi tergantung hasil AI, tidak dijamin selalu 2 seperti pada contoh.
- Kalau AI gagal merespons dalam format yang diharapkan (misalnya bukan JSON valid, atau field yang hilang), seluruh request dianggap gagal dengan `500` — tidak ada partial response.
