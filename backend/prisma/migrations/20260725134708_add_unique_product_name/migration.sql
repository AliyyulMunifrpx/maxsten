CREATE UNIQUE INDEX "products_store_id_name_key" 
ON "products"("store_id", "name") 
WHERE is_delete = false;