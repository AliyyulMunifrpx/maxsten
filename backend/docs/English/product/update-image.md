# Update Product Image

Replace an existing product image.

## Endpoint

```
PATCH /api/stores/products/:productId/image

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the modified product actually belongs to the logged-in user's store.

## Request

Content-Type: `multipart/form-data`

| Field   | Type | Required | Description                                              |
| ------- | ---- | -------- | -------------------------------------------------------- |
| `image` | file | ✅       | Mandatory field — the request is rejected (400) if empty |

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000/image \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "image=@/path/to/new-product.png"

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "image_url": "/uploads/product-1721654321-987654321.png"
  }
}
```

> ⚠️ This response **only** contains `id`, `name`, and `image_url` — unlike `PATCH /api/stores/logo` (store logo) which returns the complete store data. If the FE needs other updated product details (such as `price` or `variants`) after changing the image, call `GET /api/product/:productId` separately.

### Errors

| Status | Condition                                                               | `errors`                       |
| ------ | ----------------------------------------------------------------------- | ------------------------------ |
| 400    | No `image` file sent                                                    | `No image files were uploaded` |
| 401    | Not logged in / session expired                                         | `Unauthorized`                 |
| 404    | `productId` not found, or does not belong to the logged-in user's store | `Product not found`            |
| 413    | File size exceeds multer limit                                          | —                              |

## Notes

- The old image is automatically deleted from the server after the new image is successfully saved — the FE does not need to handle anything regarding the old file.
- If the `productId` is invalid or does not belong to the user's store, any file that was **already uploaded** by that request is automatically cleaned up from the server as well — it will not be left behind as an orphan file.
