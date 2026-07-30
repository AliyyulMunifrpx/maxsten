# Login

## Endpoint

```
POST /api/users/login
```

## Auth

Tidak butuh autentikasi (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Tipe   | Required | Keterangan                                |
| ---------- | ------ | -------- | ----------------------------------------- |
| `email`    | string | ✅       | Maksimal 100 karakter, format email valid |
| `password` | string | ✅       | Maksimal 100 karakter                     |

## Contoh Request

```bash
curl -X POST https://example.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "rahasia123"}'
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

Sesi disimpan lewat 2 cookie `httpOnly` (bukan di body):

| Cookie          | Umur                                 | Keterangan                                                             |
| --------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `access_token`  | mengikuti expiry session sistem auth | Dipakai buat autentikasi tiap request                                  |
| `refresh_token` | 30 hari                              | Dipakai buat perpanjang `access_token` otomatis |

Keduanya `httpOnly`, `secure: true`, `sameSite: "none"` — dikonfigurasi untuk mendukung FE yang berada di domain berbeda dari backend (cross-origin).

### Error

| Status | Kondisi                                                                                         | `errors`                                                                         |
| ------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 400    | Validasi gagal (format email salah, field kosong)                                               | pesan Joi                                                                        |
| 401    | Email atau password salah                                                                       | `Incorrect email or password`                                                    |
| 403    | Email belum diverifikasi                                                                        | `Email not verified`                                                             |
| 403    | Akun di-suspend/di-ban                                                                          | `Account suspended. Please contact support.`                                     |
| 409    | Email di sistem auth ternyata sudah dipakai profil lain di database (kasus tepi, sangat jarang) | `This email address is already in use by another user. Please contact the admin` |
| 500    | Error lain dari sistem autentikasi yang tidak dikenali secara khusus                            | pesan dari sistem autentikasi                                                    |

```json
{
  "errors": "Incorrect email or password"
}
```

## Catatan

- **Login sekarang selalu berhasil membuat profil kalau belum ada** (tidak pernah lagi menolak dengan `404`) — pencarian profil dilakukan berdasarkan `supabase_id`, dan kalau belum ada baris yang cocok di database, sistem otomatis membuatkannya saat itu juga (`name` default `"User"` kalau dibuat lewat jalur ini, karena tidak ada info nama dari kredensial login). Kalau FE sebelumnya menangani `404 User not found` khusus (misalnya untuk mengarahkan ke alur "lengkapi profil"), itu **tidak akan pernah terjadi lagi** — pertimbangkan apakah `name: "User"` yang generik ini perlu ditangani khusus di UI (misalnya halaman untuk mengganti nama).
- **Self-healing email sync**: kalau email yang tersimpan di database beda dari email yang aktif di sistem auth (misalnya user ganti email dan webhook sinkronisasi belum sempat jalan), sistem otomatis memperbarui email di database saat login — tanpa request tambahan dari FE.
- **Kasus tepi 409** bisa terjadi kalau email yang sekarang aktif di sistem auth (`supabase_id` A) ternyata sudah lebih dulu dipakai oleh profil database lain yang berbeda (`supabase_id` B) — biasanya gara-gara data yang sudah tidak konsisten dari luar alur normal. User yang kena kasus ini **tidak bisa login sendiri**, perlu penanganan manual dari admin.
- **Error dari sistem auth yang tidak dikenali secara khusus akan tampil sebagai `500`**, bukan `401` — beda dari sebelumnya. Kalau ada jenis error baru dari sistem auth yang seharusnya ditangani sebagai client error (4xx), errornya perlu ditambahkan penanganan khususnya, atau untuk sementara akan selalu muncul sebagai server error generik ke FE.
