# Logout

## Endpoint

```
DELETE /api/users/logout
```

## Auth

Butuh autentikasi. Cookie `access_token` wajib ada & valid (dicek lewat `authMiddleware`, hasil decode-nya jadi `req.user`).

## Request

Tidak ada body. Cookie `access_token` (dan `refresh_token`) dikirim otomatis oleh browser selama request pakai `credentials: "include"` (fetch) atau `withCredentials: true` (axios).

## Contoh Request

```bash
curl -X DELETE https://example.com/api/users/logout \
  -H "Cookie: access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Berhasil logout"
}
```

Server ngirim ulang `Set-Cookie` buat ngosongin cookie di browser:

| Cookie          | Aksi                            |
| --------------- | ------------------------------- |
| `access_token`  | Dikosongkan (`res.clearCookie`) |
| `refresh_token` | Dikosongkan (`res.clearCookie`) |

### Error

| Status | Kondisi                                                                    | Contoh `errors` |
| ------ | -------------------------------------------------------------------------- | --------------- |
| 401    | Tidak ada cookie / cookie invalid / expired (gagal lolos `authMiddleware`) | `Unauthorized`  |

```json
{
  "errors": "Unauthorized"
}
```

## Catatan

- Response sukses cuma ngasih `"data": "OK"`, nggak ada data user — jangan expect field lain di response body.
- Cookie `access_token` & `refresh_token` itu `httpOnly`, jadi FE nggak bisa (dan nggak perlu) baca/hapus manual lewat JS. Cukup andalkan status response buat update auth state di client.
- Setelah dapet 200, langsung clear/reset auth state di client (redirect ke halaman login, dsb) — nggak perlu nunggu request lain buat tau user udah logout.
- Kalau dapet 401 pas manggil endpoint ini, tetap treat sebagai "udah logout" (sesi emang udah invalid) — jangan ditampilin sebagai error yang blocking ke user.
