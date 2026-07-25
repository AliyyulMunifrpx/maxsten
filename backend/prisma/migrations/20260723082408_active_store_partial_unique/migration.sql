-- DropIndex (ganti nama sesuai yang ketemu di langkah 2, skip kalau constraint lama emang belum pernah ke-apply)
DROP INDEX IF EXISTS "stores_user_id_is_delete_key";

-- CreateIndex: partial unique - cuma berlaku buat baris yang is_delete = false
CREATE UNIQUE INDEX "stores_active_user_id_key" ON "stores" ("user_id")
WHERE
    "is_delete" = false;