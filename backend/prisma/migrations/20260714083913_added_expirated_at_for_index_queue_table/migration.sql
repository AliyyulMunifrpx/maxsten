-- DropIndex
DROP INDEX `queues_status_created_at_idx` ON `queues`;

-- CreateIndex
CREATE INDEX `queues_status_expired_at_idx` ON `queues`(`status`, `expired_at`);
