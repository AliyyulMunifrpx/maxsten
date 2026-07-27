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

| Status | Kondisi                                                               | `errors`                               |
| ------ | --------------------------------------------------------------------- | -------------------------------------- |
| 401    | Tidak ada `access_token` maupun `refresh_token`                       | `Unauthorized`                         |
| 401    | `access_token` invalid dan tidak ada `refresh_token` untuk fallback   | `Unauthorized`                         |
| 401    | `access_token` & `refresh_token` dua-duanya invalid/expired           | `Session Expired. Please login again.` |
| 401    | Sesi valid di sistem auth, tapi data user tidak ditemukan di database | `User database mismatch`               |

```json
{
  "errors": "Session Expired. Please login again."
}
```

## Catatan

- Kalau hanya `access_token` yang invalid tapi `refresh_token` masih valid, request tetap berhasil (200) — server otomatis refresh session di belakang layar dan kirim cookie baru lewat `Set-Cookie`.
- Kalau session di-refresh, cookie `access_token` & `refresh_token` yang lama otomatis diganti — FE tidak perlu re-login maupun action tambahan apa pun.
- Karena endpoint menggunakan cookie `httpOnly`, setiap request **harus** mengirim credentials.
