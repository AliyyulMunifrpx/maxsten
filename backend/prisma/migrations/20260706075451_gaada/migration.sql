/*
  Warnings:

  - Made the column `address` on table `stores` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `stores` MODIFY `address` VARCHAR(100) NOT NULL;
