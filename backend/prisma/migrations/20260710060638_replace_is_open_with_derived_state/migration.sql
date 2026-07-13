/*
  Warnings:

  - You are about to drop the column `is_open` on the `stores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `stores` DROP COLUMN `is_open`,
    ADD COLUMN `manual_status` VARCHAR(191) NULL,
    ADD COLUMN `manual_updated_at` DATETIME(3) NULL;
