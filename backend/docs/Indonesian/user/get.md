# Get Current User

Ambil data user yang sedang login.

## Endpoint

```
GET /api/users/me
```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). Kalau `access_token` sudah expired tapi `refresh_token` masih valid, sesi otomatis diperpanjang dan cookie baru di-set ulang di response — FE tidak perlu menangani refresh secara manual.

## Request

Tidak ada parameter tambahan — cukup cookie auth valid.

## Contoh Request

```bash
curl -X GET https://example.com/api/users/me \
  -b "access_token=<token>; refresh_token=<token>"
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

### Error

| Status | Kondisi                                                        | `errors`                                                   |
| ------ | -------------------------------------------------------------- | ---------------------------------------------------------- |
| 401    | Tidak login / session expired                                  | `Unauthorized` atau `Session Expired. Please login again.` |
| 401    | Akun valid di Auth tapi data di database lokal tidak ditemukan | `User database mismatch`                                   |

## Catatan

- Data ini diambil langsung dari hasil autentikasi (`authMiddleware`), bukan query terpisah — jadi selalu konsisten dengan identitas yang dipakai untuk otorisasi di endpoint lain.
