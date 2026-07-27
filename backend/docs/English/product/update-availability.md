# Update Product Availability

Toggle the availability status (available/out of stock) for a single product, without modifying any other product data.

## Endpoint

```
PATCH /api/stores/products/:productId/availability

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the modified product actually belongs to the logged-in user's store.

## Request

Content-Type: `application/json`

| Field          | Type    | Required | Description                                            |
| -------------- | ------- | -------- | ------------------------------------------------------ |
| `is_available` | boolean | ✅       | `true` = available, `false` = out of stock/unavailable |

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000/availability \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"is_available": false}'

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "is_available": false
  }
}
```

### Errors

| Status | Condition                                                               | `errors`            |
| ------ | ----------------------------------------------------------------------- | ------------------- |
| 400    | `is_available` is omitted or is not a boolean                           | validation message  |
| 401    | Not logged in / session expired                                         | `Unauthorized`      |
| 404    | `productId` not found, or does not belong to the logged-in user's store | `Product not found` |

## Notes

- This endpoint is **unaffected** by active queue status — unlike `PATCH /api/stores/products/:productId` (update product info) which freezes `price`, `variants`, and `addon_group_ids` during an active queue. Toggling availability can be performed at any time, even while the product is being ordered.
- The response **only** contains `id`, `name`, and `is_available` — not the full product details.
