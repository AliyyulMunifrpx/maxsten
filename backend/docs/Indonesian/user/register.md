# Register

## Alur Pemakaian

1. **POST** `/api/users` — user isi form daftar.
2. Sistem kirim email konfirmasi otomatis ke email yang didaftarkan.
3. User **wajib klik link konfirmasi di email** sebelum bisa login.
4. Kalau user coba login sebelum konfirmasi, `POST /api/users/login` akan menolak.

> FE perlu menampilkan halaman/pesan "Cek email kamu untuk konfirmasi" setelah register berhasil — jangan langsung arahkan user ke halaman login atau dashboard, karena mereka belum bisa login sampai email dikonfirmasi.

## Endpoint

```
POST /api/users
```

## Auth

Tidak butuh autentikasi (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Tipe   | Required | Keterangan                                                 |
| ---------- | ------ | -------- | ---------------------------------------------------------- |
| `email`    | string | ✅       | Maksimal 100 karakter, format email valid, belum terdaftar |
| `password` | string | ✅       | Minimal 8, maksimal 100 karakter                           |
| `name`     | string | ✅       | Maksimal 100 karakter                                      |

## Contoh Request

```bash
curl -X POST https://example.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "rahasia123", "name": "Nama User"}'
```

## Response

### 201 Created

```json
{
  "data": {
    "email": "user@example.com",
    "name": "Nama User"
  }
}
```

> Response ini **belum berarti user bisa langsung login** — status email masih "belum dikonfirmasi" sampai user klik link di emailnya.

### Error

| Status | Kondisi                                                                                                            | `errors`                            |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 400    | Email sudah terdaftar (termasuk kasus tepi: akun sudah ada di sistem auth tapi belum tercatat di database sendiri) | `That email address already exists` |
| 400    | Validasi gagal (email/password/name format salah, password kurang dari 8 karakter, dll)                            | pesan Joi                           |
| 400    | Ditolak oleh sistem autentikasi (misal kebijakan password tertentu)                                                | pesan dari sistem autentikasi       |
| 500    | Gagal menyimpan profil ke database karena alasan lain (bukan email duplikat)                                       | pesan error server                  |

## Catatan

- Email konfirmasi dikirim otomatis, bukan oleh backend — template & pengirimnya diatur terpisah, bukan dari kode di repo ini.
- **Kirim ulang email konfirmasi** ditangani langsung dari FE lewat Supabase Auth SDK, tidak lewat backend:
  ```javascript
  await supabase.auth.resend({ type: "signup", email });
  ```
- **Pengecekan email duplikat dilakukan berlapis**, termasuk melindungi dari 1 celah keamanan yang halus: kalau sebuah email sudah pernah didaftarkan di sistem auth (misalnya proses register sebelumnya sempat terputus setelah akun auth dibuat tapi sebelum tersimpan ke database sendiri), sistem auth tidak selalu memberi error yang jelas saat email itu didaftarkan ulang — demi mencegah orang menebak-nebak email mana saja yang terdaftar (proteksi _email enumeration_). Tanpa penanganan khusus, celah ini bisa dieksploitasi: seseorang mendaftar ulang pakai email yang sudah dipakai orang lain, mendapat "sukses" palsu, padahal ia hanya menumpang ke identitas email orang lain (password asli tetap milik pemilik pertama, tidak berubah). Sistem ini mendeteksi kondisi itu secara eksplisit dan tetap menolaknya dengan pesan yang sama seperti email duplikat biasa — request seperti ini **tidak pernah** berhasil dengan `201`.
- **Kalau akun berhasil dibuat di sistem auth tapi gagal disimpan ke database sendiri** (misalnya race condition saat 2 pendaftaran email yang sama terjadi nyaris bersamaan, atau database sedang bermasalah), sistem otomatis mencoba menghapus kembali akun auth yang baru dibuat tadi (rollback), supaya tidak ada akun "nyangkut" — ada di sistem auth tapi tidak tercatat di database, yang berpotensi jadi celah yang sama seperti disebutkan di atas. Kalau proses rollback ini sendiri gagal, hanya dicatat di log server (best-effort), tidak memengaruhi respons yang diterima user.
