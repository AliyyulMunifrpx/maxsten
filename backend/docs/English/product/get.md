# Get Product Detail

Retrieve details of a single product belonging to the currently logged-in user's store.

## Endpoint

```
GET /api/stores/products/:productId

```

`:productId` is the product's UUID.

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the retrieved product actually belongs to the logged-in user's store.

## Request

No body — just the `productId` in the URL and a valid auth cookie.

## Request Example

```bash
curl -X GET https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "description": "Nasi goreng dengan telur dan ayam",
    "price": 20000,
    "image_url": "/uploads/product-1234567890.png",
    "is_available": true,
    "productAddonGroups": [
      {
        "addon_group": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Level Pedas",
          "addons": [
            { "id": 1, "name": "Tidak Pedas", "price": 0 },
            { "id": 2, "name": "Sangat Pedas", "price": 2000 }
          ]
        }
      }
    ],
    "variants": [
      { "id": 1, "name": "Pedas", "additional_price": 2000 },
      { "id": 2, "name": "Sedang", "additional_price": 0 }
    ],
    "total_sold": 12
  }
}
```

### Errors

| Status | Condition                                                                            | `errors`            |
| ------ | ------------------------------------------------------------------------------------ | ------------------- |
| 400    | `productId` is not a valid UUID format                                               | validation message  |
| 401    | Not logged in / session expired                                                      | `Unauthorized`      |
| 404    | Product not found, already deleted, or does not belong to the logged-in user's store | `Product not found` |

## Notes

- `total_sold` is **not** a database column — it is calculated in real-time per request, representing the total `quantity` from all transactions with the status `SELESAI` (COMPLETED) that contain this product.
- Variants and add-on groups that have been deleted (`is_delete: true`) are automatically filtered out from the response — they will never appear, even if the product still has older transactions using them.
- `404 Product not found` is also used for the case where "the product exists, but belongs to another store" — the error message does not distinguish between the two (intentionally, for security reasons, so a user cannot guess which products exist in other stores by brute-forcing IDs).
