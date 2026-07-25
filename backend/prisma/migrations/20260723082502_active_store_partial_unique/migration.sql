-- DropIndex
DROP INDEX "stores_is_delete_key";

-- DropIndex
DROP INDEX "stores_user_id_key";

-- CreateIndex
CREATE INDEX "stores_user_id_idx" ON "stores"("user_id");
