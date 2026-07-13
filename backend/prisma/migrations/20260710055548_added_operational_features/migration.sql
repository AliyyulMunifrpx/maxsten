-- CreateTable
CREATE TABLE `StoreOperationalHour` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` INTEGER NOT NULL,
    `day` INTEGER NOT NULL,
    `open_time` VARCHAR(191) NULL,
    `close_time` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `StoreOperationalHour_store_id_day_key`(`store_id`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreOperationalHour` ADD CONSTRAINT `StoreOperationalHour_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
