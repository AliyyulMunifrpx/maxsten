-- AlterTable
ALTER TABLE `addon` ADD COLUMN `is_delete` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `addongroup` ADD COLUMN `is_delete` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `is_delete` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `stores` ADD COLUMN `is_delete` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `variants` ADD COLUMN `is_delete` BOOLEAN NOT NULL DEFAULT false;
