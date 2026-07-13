-- AlterTable
ALTER TABLE `queue_details` ADD COLUMN `selected_addons` JSON NULL;

-- CreateTable
CREATE TABLE `AddonGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `store_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Addon` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `price` INTEGER NOT NULL,
    `addon_group_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductAddonGroup` (
    `product_id` VARCHAR(191) NOT NULL,
    `addon_group_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`product_id`, `addon_group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AddonGroup` ADD CONSTRAINT `AddonGroup_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Addon` ADD CONSTRAINT `Addon_addon_group_id_fkey` FOREIGN KEY (`addon_group_id`) REFERENCES `AddonGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAddonGroup` ADD CONSTRAINT `ProductAddonGroup_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAddonGroup` ADD CONSTRAINT `ProductAddonGroup_addon_group_id_fkey` FOREIGN KEY (`addon_group_id`) REFERENCES `AddonGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
