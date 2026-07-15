-- CreateTable
CREATE TABLE `CancelReasonTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` INTEGER NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CancelReasonTemplate` ADD CONSTRAINT `CancelReasonTemplate_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
