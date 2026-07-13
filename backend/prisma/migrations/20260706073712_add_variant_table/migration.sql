/*
  Warnings:

  - The primary key for the `products` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `queue_details` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_store_id_fkey`;

-- DropForeignKey
ALTER TABLE `queue_details` DROP FOREIGN KEY `queue_details_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `queue_details` DROP FOREIGN KEY `queue_details_queue_id_fkey`;

-- DropIndex
DROP INDEX `products_store_id_fkey` ON `products`;

-- DropIndex
DROP INDEX `queue_details_product_id_fkey` ON `queue_details`;

-- DropIndex
DROP INDEX `queue_details_queue_id_fkey` ON `queue_details`;

-- AlterTable
ALTER TABLE `products` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `queue_details` DROP PRIMARY KEY,
    ADD COLUMN `variant_id` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `product_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `variants` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `additional_price` INTEGER NOT NULL DEFAULT 0,
    `product_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `variants` ADD CONSTRAINT `variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_details` ADD CONSTRAINT `queue_details_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_details` ADD CONSTRAINT `queue_details_queue_id_fkey` FOREIGN KEY (`queue_id`) REFERENCES `queues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `queue_details` ADD CONSTRAINT `queue_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
