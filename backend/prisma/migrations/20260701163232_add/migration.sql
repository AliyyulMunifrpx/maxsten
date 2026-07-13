/*
  Warnings:

  - Added the required column `guest_id` to the `queues` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `queues` ADD COLUMN `guest_id` CHAR(36) NOT NULL;

-- CreateTable
CREATE TABLE `Guest` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `queues` ADD CONSTRAINT `queues_guest_id_fkey` FOREIGN KEY (`guest_id`) REFERENCES `Guest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
