# Delete Product

Soft-delete a product along with all of its associated variants.

## Endpoint

```http
DELETE /api/stores/products/:productId

```

`:productId` is the product's UUID.

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the deleted product actually belongs to the logged-in user's store.

## Request

No body required — only `productId` in the URL and valid auth cookies.

## Request Example

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

### Errors

| Status | Condition                                                                                | `errors`                                               |
| ------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 400    | `productId` is not a valid UUID format                                                   | validation message                                     |
| 400    | Product still has active orders in progress (status `BELUM_BAYAR` or `DIPROSES`)         | `Cannot delete product with active orders in progress` |
| 401    | Not logged in / session expired                                                          | `Unauthorized`                                         |
| 404    | `productId` not found, already deleted, or does not belong to the logged-in user's store | validation message                                     |

## Notes

- **Cannot delete a product with active orders in progress** — similar to the rule in product info updates, but here it applies completely (rather than just freezing specific fields, the entire request is rejected). Ensure there are no active orders containing this product before attempting deletion.
- Product variants are automatically soft-deleted along with the product — there is no need to call a separate endpoint to clean up its variants.
- If the product has an image, the file is also deleted from the server. If this file deletion fails for any reason, the product is still successfully deleted (file deletion failure will not abort the product deletion).
- Past transaction histories referencing this product (`SELESAI`/`DIBATALKAN`) remain unaffected — the deleted product will still appear as-is in older order histories and won't be deleted or hidden from them.
