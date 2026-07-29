/*
  Warnings:

  - Added the required column `created_at` to the `Addon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_at` to the `AddonGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Addon" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AddonGroup" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL;
