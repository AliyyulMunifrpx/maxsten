# Update Product

Update product data, including its variants and add-on groups.

## Endpoint

```text
PATCH /api/stores/products/:productId

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

**Content-Type:** `application/json`

| Field             | Type                 | Required | Description                                                                                                    |
| ----------------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `name`            | string               | ❌       | Maximum 100 characters. **Stored entirely in lowercase** after being trimmed. Must be unique within this store |
| `description`     | string               | ❌       | —                                                                                                              |
| `price`           | number               | ❌       | Must be greater than 0 if provided                                                                             |
| `variants`        | array                | ❌       | **Full replace**, not partial — see rules below                                                                |
| `addon_group_ids` | array<string (UUID)> | ❌       | **Full replace**, not partial — see rules below                                                                |

### `variants` Rules (Full replace based on `id`)

```json
[
  { "id": "existing-variant-id", "name": "Pedas", "additional_price": 1500 },
  { "name": "Varian Baru", "additional_price": 3000 }
]
```

- Items **with an `id**` matching an existing variant $\rightarrow$ **updated**.
- Items **without an `id**` $\rightarrow$ treated as **new** variants, automatically created.
- Old variants **not included** in this array at all $\rightarrow$ automatically **deleted** (soft-delete).
- Variant names cannot be duplicated within the same product.
- Sending an `id` that does not exist or does not belong to this product $\rightarrow$ request is rejected (400), with no changes saved.

### `addon_group_ids` Rules (Full replace)

Just like `variants` — this array represents the **final list** of add-on groups attached to the product. Groups that were previously attached but are not included in this request will be **detached** from the product (the groups themselves are not deleted, only their relation is removed).

## Example Request

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
    "name": "nasi goreng spesial (baru)",
    "price": 22000,
    "description": "...",
    "updated_at": "2026-08-03T10:00:00.000Z",
    "variants": [
      {
        "id": "variant-lama-id",
        "name": "pedas",
        "additional_price": 2000,
        "is_delete": false
      },
      {
        "id": "variant-baru-id",
        "name": "extra pedas",
        "additional_price": 4000,
        "is_delete": false
      }
    ],
    "productAddonGroups": [
      {
        "addon_group": {
          "id": "addon-group-id-1",
          "name": "level pedas",
          "addons": [{ "id": "addon-1", "name": "tidak pedas", "price": 0 }]
        }
      }
    ]
  }
}
```

### Error

| Status | Condition                                                                                                                    | `errors`                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 400    | Invalid field format (e.g., `price` is not a positive number).                                                               | _Joi message_                                                                                 |
| 400    | Duplicate variant names within the `variants` array sent in the same request.                                                | `Variant names within a product must be unique`                                               |
| 400    | One or more `variants[].id` not found or do not belong to this product.                                                      | `Some variants are invalid or do not belong to this product.`                                 |
| 400    | One or more `addon_group_ids` are invalid or do not belong to this store.                                                    | `Some add-on groups are invalid for this product.`                                            |
| 400    | The product currently has an **active order**, and the request attempts to modify `price`, `variants`, or `addon_group_ids`. | `This product has an active order in progress. Only the name and description can be updated.` |
| 401    | Not logged in / session expired.                                                                                             | `Unauthorized`                                                                                |
| 404    | Store not found, or `productId` not found/does not belong to this store.                                                     | `Store not found` or `Product not found or not owned by you`                                  |
| 409    | The newly provided product name is already used by another active product in this store.                                     | `A product with this name already exists in your store.`                                      |
| 409    | A new variant name clashes with another active variant for this product in the database.                                     | `A variant with this name already exists in this product.`                                    |
| 409    | Another concurrent update conflicted at the same time (generic race condition).                                              | `This change conflicts with another update in progress, please try again.`                    |

## Notes

- **Lowercase Transformation:** The product name (`name`) and variant names (`variants[].name`) are automatically stored in **all lowercase** after being trimmed. If the Frontend wishes to display them with capital letters, please use CSS (`text-transform: capitalize`).
- **Partial Update:** All fields are optional — simply send the fields you wish to change. If `price` is omitted, the price remains at its previous value.
- **Active Order Restriction:** If the product currently has an active order in progress (order status not completed/cancelled), **only `name` and `description` are allowed to change**. If you still submit `price`, `variants`, or `addon_group_ids` with values _different_ from what is currently saved, the request will be rejected. _(Submit the exact same values as currently saved—or omit those fields entirely—if you do not intend to change them)._
- The `productId` provided is automatically verified against the logged-in user's store — passing a `productId` belonging to another store will always result in a `404`, making it impossible to modify anyone else's products.
