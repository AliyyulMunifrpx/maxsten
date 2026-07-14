-- AlterTable
ALTER TABLE `queues` ADD COLUMN `cancellation_reason` TEXT NULL,
    ADD COLUMN `cancelled_by` ENUM('SYSTEM', 'SELLER', 'BUYER') NULL;
