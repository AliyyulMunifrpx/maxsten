# Logout

## Endpoint

```
DELETE /api/users/logout
```

## Auth

Cookie-based auth (`access_token`). Tetap bisa dipanggil walaupun `access_token` sudah tidak ada/invalid — lihat catatan di bawah.

## Request

Tidak ada body.

## Contoh Request

```bash
curl -X DELETE https://example.com/api/users/logout \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Logout successful"
}
```

> Endpoint ini **selalu** balas `200` — tidak ada kondisi error yang dikembalikan ke FE untuk endpoint ini.

## Catatan

- **Logout selalu "berhasil" dari sudut pandang FE**, bahkan kalau proses menghanguskan sesi di server auth gagal di belakang layar (misal karena `access_token` sudah expired duluan, atau server auth sedang bermasalah) — kegagalan itu hanya dicatat di log server, tidak pernah membuat request ini gagal. Ini disengaja: kalau logout bisa gagal, cookie di browser tidak akan sempat dibersihkan (`res.clearCookie` tidak pernah tereksekusi), dan user akan "terjebak" tidak bisa logout dari browser-nya sendiri.
- Cookie `access_token` dan `refresh_token` selalu dihapus dari browser setelah request ini, terlepas dari hasil di atas.
- Setelah logout, cookie yang sebelumnya ada menjadi tidak valid untuk request selanjutnya — FE sebaiknya langsung mengarahkan user ke halaman login setelah menerima response ini, tanpa perlu menunggu verifikasi tambahan.
