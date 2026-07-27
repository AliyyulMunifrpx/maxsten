# Register

## Alur Pemakaian
1. **POST** `/api/users/register` — user isi form daftar.
2. Sistem kirim email konfirmasi otomatis ke email yang didaftarkan.
3. User **wajib klik link konfirmasi di email** sebelum bisa login.
4. Kalau user coba login sebelum konfirmasi, `POST /api/users/login` akan menolak dengan `403 ERR_UNVERIFIED_EMAIL`.

> FE perlu menampilkan halaman/pesan "Cek email kamu untuk konfirmasi" setelah register berhasil — jangan langsung arahkan user ke halaman login atau dashboard, karena mereka belum bisa login sampai email dikonfirmasi.

## Endpoint

```
POST /api/users/register
```

## Auth

Tidak butuh autentikasi (public endpoint).

## Request

Content-Type: `application/json`

| Field | Tipe | Required | Keterangan |
|---|---|---|---|
| `email` | string | ✅ | Harus format email valid, belum terdaftar |
| `password` | string | ✅ | Disimpan di Supabase Auth, **tidak** disimpan di database sendiri |
| `name` | string | ✅ | Nama tampilan user |

## Contoh Request

```bash
curl -X POST https://example.com/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "rahasia123", "name": "Nama User"}'
```

## Response

### 200 OK

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

| Status | Kondisi | `errors` |
|---|---|---|
| 400 | Email sudah terdaftar | `That email address already exists` |
| 400 | Validasi gagal (format email salah, field kosong, dll) | pesan sesuai field yang gagal |
| 400 | Ditolak oleh Supabase Auth (misal password terlalu pendek sesuai kebijakan Supabase) | pesan dari Supabase |

## Catatan

- Email konfirmasi dikirim otomatis oleh Supabase Auth, bukan oleh backend — template & pengirimnya diatur dari Supabase Dashboard, bukan dari kode di repo ini.
- **Kirim ulang email konfirmasi** ditangani langsung dari FE lewat Supabase Auth SDK, tidak lewat backend:
  ```javascript
  await supabase.auth.resend({ type: "signup", email });
  ```