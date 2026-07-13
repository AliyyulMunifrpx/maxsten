/*
  Warnings:

  - You are about to drop the `addon` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `addongroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productaddongroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `addon` DROP FOREIGN KEY `Addon_addon_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `addongroup` DROP FOREIGN KEY `AddonGroup_store_id_fkey`;

-- DropForeignKey
ALTER TABLE `productaddongroup` DROP FOREIGN KEY `ProductAddonGroup_addon_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `productaddongroup` DROP FOREIGN KEY `ProductAddonGroup_product_id_fkey`;

-- DropTable
DROP TABLE `addon`;

-- DropTable
DROP TABLE `addongroup`;

-- DropTable
DROP TABLE `productaddongroup`;
