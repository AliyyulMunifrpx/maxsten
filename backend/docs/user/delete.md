# Delete User

## Endpoint

```
DELETE /api/users/delete
```

## Auth

Butuh autentikasi. Cookie `access_token` wajib ada & valid (dicek lewat `authMiddleware`, hasil decode-nya jadi `req.user`).

## Request

Tidak ada body. Cookie `access_token` (dan `refresh_token`) dikirim otomatis oleh browser selama request pakai `credentials: "include"` (fetch) atau `withCredentials: true` (axios).

## Contoh Request

```bash
curl -X DELETE https://example.com/api/users/delete \
  -H "Cookie: access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Account permanently deleted"
}
```

Akun (dan data terkaitnya) dihapus permanen dari database, dan server otomatis ngirim ulang `Set-Cookie` buat ngosongin cookie (otomatis logout):

| Cookie          | Aksi                            |
| --------------- | ------------------------------- |
| `access_token`  | Dikosongkan (`res.clearCookie`) |
| `refresh_token` | Dikosongkan (`res.clearCookie`) |

### Error

| Status | Kondisi                                                                                             | Contoh `errors`                        |
| ------ | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 401    | Tidak ada cookie / cookie invalid / expired (gagal lolos `authMiddleware`)                          | `Unauthorized`                         |
| 404    | Data user gak ketemu di database (sesi valid tapi record-nya udah gak ada)                          | `User not found`                       |
| 500    | Gagal menghapus akun di sisi autentikasi (data user di database utama tetap utuh, gak ikut kehapus) | `Failed to delete user authentication` |

```json
{
  "errors": "Unauthorized"
}
```

## Catatan

- Aksi ini **permanen dan gak bisa dibatalin** — sebaiknya FE kasih dialog konfirmasi eksplisit sebelum manggil endpoint ini.
- Kalau sukses (200), user otomatis ke-logout (cookie ke-clear) — FE tinggal redirect ke halaman login/landing, gak perlu manggil endpoint logout terpisah setelahnya.
- Kalau dapet 500, akun & datanya masih utuh (belum kehapus sama sekali) — aman buat user coba lagi, atau arahkan ke CS kalau berulang.
