# Delete Account

Menghapus akun user secara permanen (bukan _soft-delete_) — beda dari `DELETE /api/delete-store` yang cuma _soft-delete_ toko.

## Endpoint

```
DELETE /api/users/me

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). `userId` dan `supabase_id` diambil dari `req.user` (middleware).

## Request

Tidak ada body.

## Contoh Request

```bash
curl -X DELETE https://example.com/api/users/me \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Account permanently deleted"
}
```

> Cookie `access_token` dan `refresh_token` otomatis dihapus dari browser — user langsung ter-logout, tidak perlu memanggil `DELETE /api/users/logout` terpisah setelah ini.

### Error

| Status | Kondisi                                                                                             | `errors`                                                                              |
| ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401    | Tidak login / session expired                                                                       | `Unauthorized` atau `Session Expired. Please login again.`                            |
| 409    | Toko milik user masih memiliki antrean pelanggan yang aktif (status `BELUM_BAYAR` atau `DIPROSES`). | `You cannot delete your account because your store still has active customer queues.` |
| 409    | Masih ada relasi data krusial lain di database yang menghalangi penghapusan.                        | `We cannot delete the account because there is still data associated with it.`        |

## Catatan

- **Penghapusan ini permanen:** Akun user benar-benar dihapus dari database. FE sangat disarankan menampilkan dialog konfirmasi eksplisit ke user (misal: meminta ketik ulang email atau tombol konfirmasi bahaya) sebelum memanggil endpoint ini.
- **Validasi Antrean Aktif:** Sistem akan mengecek apakah toko milik user sedang melayani pelanggan. Jika ada antrean yang masih berjalan, penghapusan akan ditolak (409). FE perlu mengarahkan user untuk menyelesaikan atau membatalkan antrean tersebut terlebih dahulu.
- **Toko akan otomatis di-soft-delete:** Jika syarat di atas terpenuhi, sistem menggunakan transaksi otomatis (`$transaction`) untuk melakukan _soft-delete_ (`is_delete: true`) pada toko milik user secara bersamaan dengan penghapusan akun.
- **Keamanan Data Diutamakan (Fail-safe):** Data di database (Prisma) dihapus lebih dulu. Jika gagal di tengah jalan, proses berhenti total dan akun di sistem auth (Supabase) **belum disentuh sama sekali**, sehingga user masih bisa login seperti biasa.
- **Auto-Cleanup untuk Kegagalan Auth:** Jika data di database berhasil dihapus namun sistem auth (Supabase) gagal merespons atau sedang _down_, endpoint akan tetap membalas `200 OK` ke FE agar pengalaman pengguna tidak terganggu. Sisa akun di sistem auth tersebut akan otomatis masuk ke antrean pembersihan di latar belakang (_Background Cron Job_) untuk dihapus secara berkala oleh server.

---

