# Delete Product

Soft-delete a product along with all of its variants.

## Endpoint

```
DELETE /api/stores/products/:productId

```

`:productId` is the UUID of the product.

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the deleted product actually belongs to the logged-in user's store.

## Request

No body — just the `productId` in the URL and a valid auth cookie.

## Example Request

```bash
curl -X DELETE https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

> Just like `DELETE /api/delete-store`, `data` here is simply the string `"OK"`, not a product object.

### Error

| Status | Condition                                                                          | `errors`                                               |
| ------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 400    | `productId` is not a valid UUID format                                             | Validation message                                     |
| 400    | Product still has active orders in progress (`BELUM_BAYAR` or `DIPROSES`)          | `Cannot delete product with active orders in progress` |
| 401    | Not logged in / session expired                                                    | `Unauthorized`                                         |
| 404    | `productId` not found, already deleted, or not owned by the logged-in user's store | `Product not found or not owned by you`                |

## Notes

- **Cannot delete products that still have active orders** — similar to the product info update rule, but here it applies completely (rather than just freezing certain fields, the request is fully rejected). Ensure there are no ongoing orders containing this product before attempting deletion.
- Product variants are automatically soft-deleted along with the product — no need to call a separate endpoint to clean up their variants.
- If the product has an image, the file is also deleted from the server. If this file deletion fails for any reason, the product is still successfully deleted (file deletion failure does not cancel the product deletion).
- Past transaction histories that already used this product (`SELESAI`/`DIBATALKAN`) are not affected — deleted products will still appear as-is in old order histories and will not be deleted or hidden from them.
