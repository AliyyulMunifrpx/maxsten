# Update User Profile

## Endpoint

```
PATCH /api/users/me
```
## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). `userId` diambil dari `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field  | Tipe   | Required | Keterangan         |
| ------ | ------ | -------- | ------------------ |
| `name` | string | ✅       | Nama tampilan user |

> Endpoint ini **hanya** bisa mengubah `name`. Email dan password **tidak** bisa diubah lewat endpoint ini — lihat bagian Catatan di bawah.

## Contoh Request

```bash
curl -X PATCH https://example.com/api/users/me \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nama Baru"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "name": "Nama Baru"
  }
}
```

### Error

| Status | Kondisi                                                                  | `errors`                                                   |
| ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 400    | Validasi gagal (misal `name` bukan string)                               | pesan validasi                                             |
| 401    | Tidak login / session expired                                            | `Unauthorized` atau `Session Expired. Please login again.` |
| 404    | User tidak ditemukan (kasus tepi, misal akun terhapus di antara request) | `User not found`                                           |
| 500    | Gagal update karena alasan lain                                          | `Failed to update user profile`                            |

## Catatan

- **Ganti email:** tidak dilakukan lewat endpoint backend ini. FE memanggil Supabase Auth SDK langsung dari client (`supabase.auth.updateUser({ email })`). Setelah email berubah di Supabase, sistem otomatis menyinkronkan email tersebut ke database lewat webhook internal — FE tidak perlu memanggil endpoint tambahan apa pun untuk sinkronisasi ini. Sebagai lapisan cadangan, email juga otomatis disinkronkan ulang setiap kali user login (lihat `POST /api/users/login`), jadi tetap konsisten walau webhook sempat gagal/telat.
- **Ganti password:** sama seperti email, dilakukan langsung dari FE lewat Supabase Auth SDK (`supabase.auth.updateUser({ password })`), bukan lewat endpoint backend ini — backend tidak menyimpan password sama sekali.
