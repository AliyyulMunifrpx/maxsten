# Login

## Endpoint

```
POST /api/users/login
```

## Auth

Tidak butuh autentikasi (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Tipe   | Required | Keterangan               |
| ---------- | ------ | -------- | ------------------------ |
| `email`    | string | ✅       | Harus format email valid |
| `password` | string | ✅       | Harus bertipe string     |

## Contoh Request

```bash
curl -X POST https://example.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "rahasia123"}'
```

## Response

### 200 OK

Body cuma balikin `email`. Sesi disimpan lewat 2 cookie `httpOnly` (bukan di body):

```json
{
  "data": {
    "email": "user@example.com"
  }
}
```

Cookie yang di-set:

| Cookie          | Umur                              | Keterangan                                                             |
| --------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `access_token`  | mengikuti expiry session Supabase | Dipakai buat autentikasi tiap request                                  |
| `refresh_token` | 30 hari                           | Dipakai buat perpanjang `access_token` otomatis lewat `authMiddleware` |

Keduanya `httpOnly`, `sameSite: strict`, dan `secure: true` di production.

### Error

| Status | Kondisi                                                     | Contoh `errors`                  |
| ------ | ----------------------------------------------------------- | -------------------------------- |
| 400    | Validasi gagal (format email salah / password bukan string) | `"email" must be a valid email`  |
| 401    | Email atau password salah                                   | `Invalid login credentials`      |
| 403    | Email belum diverifikasi                                    | `ERR_UNVERIFIED_EMAIL`           |
| 404    | Akun ada di sistem auth tapi data user tidak ditemukan      | `ERR_USER_NOT_FOUND_IN_DATABASE` |

```json
{
  "errors": "Invalid login credentials"
}
```

## Catatan

- Pesan error untuk email/password salah **sengaja disamakan** (`Invalid login credentials`) baik email tidak terdaftar maupun password salah — supaya tidak membocorkan apakah suatu email terdaftar di sistem.
- Kode error `ERR_UNVERIFIED_EMAIL` dan `ERR_USER_NOT_FOUND_IN_DATABASE` adalah string konstan, dimaksudkan untuk dipetakan ke pesan yang lebih ramah di sisi FE (bukan ditampilkan mentah ke user).
