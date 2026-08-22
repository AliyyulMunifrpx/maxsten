/*
  Warnings:

  - A unique constraint covering the columns `[addon_group_id,name]` on the table `Addon` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,name]` on the table `variants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "queues" ADD COLUMN     "processed_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "addon_active_unique" ON "Addon"("addon_group_id", "name") WHERE (is_delete = false);

-- CreateIndex
CREATE UNIQUE INDEX "variant_name_active_unique" ON "variants"("product_id", "name") WHERE (is_delete = false);
