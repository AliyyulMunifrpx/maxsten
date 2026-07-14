-- AlterTable
ALTER TABLE `stores`
ADD COLUMN `payment_timeout` INT NOT NULL DEFAULT 30;

-- Add expired_at to queue as nullable first so we can backfill existing rows
ALTER TABLE `queues` ADD COLUMN `expired_at` DATETIME(3) NULL;

UPDATE `queues`
SET
    `expired_at` = DATE_ADD(
        `created_at`,
        INTERVAL 30 MINUTE
    )
WHERE
    `expired_at` IS NULL;

ALTER TABLE `queues` MODIFY COLUMN `expired_at` DATETIME(3) NOT NULL;