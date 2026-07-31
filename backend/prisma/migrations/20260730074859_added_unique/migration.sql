CREATE UNIQUE INDEX addon_group_active_unique ON "AddonGroup" (store_id, name)
WHERE
    is_delete = false;