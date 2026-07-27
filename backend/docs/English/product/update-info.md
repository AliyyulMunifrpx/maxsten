# Update Product

Update product data, including its variants and add-on groups.

## Endpoint

```
PATCH /api/stores/products/:productId

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field             | Type                 | Required | Description                                     |
| ----------------- | -------------------- | -------- | ----------------------------------------------- |
| `name`            | string               | ❌       | Maximum of 100 characters                       |
| `description`     | string               | ❌       | —                                               |
| `price`           | number               | ❌       | Must be greater than 0 if provided              |
| `variants`        | array<object>        | ❌       | **Full replace**, not partial — see rules below |
| `addon_group_ids` | array<string (UUID)> | ❌       | **Full replace**, not partial — see rules below |

### `variants` Rules (full replace based on `id`)

```json
[
  { "id": "existing-variant-id", "name": "Pedas", "additional_price": 1500 },
  { "name": "Varian Baru", "additional_price": 3000 }
]
```

- Items **with an `id**` matching an existing variant → **updated**.
- Items **without an `id**` → considered **new** variants and are automatically created.
- Old variants **not included** in this array at all → automatically **deleted** (soft-delete).
- Submitting an `id` that does not exist or does not belong to this product → the request is rejected (400), and no changes are saved.

> ⚠️ This differs from `operational_hours` in the store endpoint, which is partial (days not included remain unchanged). Here, `variants` represents a **full final state** — resend all variants you wish to keep, not just the modified ones.

### `addon_group_ids` Rules (full replace)

Similar to `variants` — this array represents the **final list** of add-on groups attached to the product. Groups previously attached but omitted from the request will be **detached** from the product (the groups themselves are not deleted, only their relation is removed).

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/products/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nasi Goreng Spesial (Baru)",
    "price": 22000,
    "variants": [
      { "id": "variant-lama-id", "name": "Pedas", "additional_price": 2000 },
      { "name": "Extra Pedas", "additional_price": 4000 }
    ],
    "addon_group_ids": ["addon-group-id-1"]
  }'

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial (Baru)",
    "price": 22000,
    "description": "...",
    "variants": [
      {
        "id": "variant-lama-id",
        "name": "Pedas",
        "additional_price": 2000,
        "is_delete": false
      },
      {
        "id": "variant-baru-id",
        "name": "Extra Pedas",
        "additional_price": 4000,
        "is_delete": false
      }
    ]
  }
}
```

### Errors

| Status | Condition                                                                                                         | `errors`                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400    | Invalid field format (e.g., `price` is not a positive number)                                                     | Joi validation message                                                                        |
| 400    | A `variants[].id` is not found or does not belong to this product                                                 | `Some variants are invalid or do not belong to this product.`                                 |
| 400    | An `addon_group_ids` is invalid or does not belong to this store                                                  | `Some add-on groups are invalid for this product.`                                            |
| 400    | The product has an **active queue**, and the request attempts to modify `price`, `variants`, or `addon_group_ids` | `This product has an active order in progress. Only the name and description can be updated.` |
| 401    | Not logged in / session expired                                                                                   | `Unauthorized`                                                                                |
| 404    | Store not found, or `productId` not found/does not belong to this store                                           | `Store not found` or `Product not found or not owned by you`                                  |
| 409    | A concurrent update conflict occurred                                                                             | `This change conflicts with another update in progress, please try again.`                    |

## Notes

- All fields are partial updates — simply submit the fields you wish to change. If `price` is omitted, the price remains at its previous value.
- **If the product has an active queue** (orders that are not yet completed or canceled), only `name` and `description` are allowed to change. If you still submit `price`, `variants`, or `addon_group_ids` with values **different** from what is currently saved, the request will be rejected. Submit values identical to the current ones (or omit the fields entirely) if you do not wish to change them — fields that remain entirely unchanged in value will not trigger this error.
- The submitted `productId` is automatically checked for ownership against the logged-in user's store — providing a `productId` belonging to another store will always result in a `404`, and it is never possible to modify someone else's product.
