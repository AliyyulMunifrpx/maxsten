CREATE UNIQUE INDEX "cancel_reason_active_unique"
ON "CancelReasonTemplate" ("store_id", "reason")
WHERE "is_delete" = false;