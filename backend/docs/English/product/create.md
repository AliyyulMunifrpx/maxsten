# Create Product

Add a new product to the store belonging to the currently logged-in user.

## Endpoint

```
POST /api/stores/products

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `multipart/form-data` (because of the `image` upload). Can also be `application/json` if no image is included.

| Field             | Type                 | Required | Description                                                  |
| ----------------- | -------------------- | -------- | ------------------------------------------------------------ |
| `name`            | string               | ✅       | Maximum 100 characters. Must be unique per store             |
| `price`           | number               | ✅       | Must be greater than 0                                       |
| `description`     | string               | ❌       | —                                                            |
| `variants`        | array<object>        | ❌       | See structure below                                          |
| `addon_group_ids` | array<string (UUID)> | ❌       | IDs of existing add-on groups, must belong to the same store |
| `image`           | file                 | ❌       | Field name must be `image` (not `logo`)                      |

### `variants` Structure

```json
[{ "name": "Pedas", "additional_price": 2000 }, { "name": "Sedang" }]
```

| Field               | Type   | Required | Description                                      |
| ------------------- | ------ | -------- | ------------------------------------------------ |
| `.name`             | string | ✅       | Maximum 100 characters                           |
| `.additional_price` | number | ❌       | Default is `0` if not filled. Cannot be negative |

Since it is sent via `multipart/form-data`, `variants` and `addon_group_ids` are sent as **JSON strings**, similar to `operational_hours` in the create store endpoint.

## Example Request

```bash
curl -X POST https://example.com/api/stores/products \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "name=Nasi Goreng Spesial" \
  -F "price=20000" \
  -F "description=Nasi goreng dengan telur dan ayam" \
  -F 'variants=[{"name":"Pedas","additional_price":2000},{"name":"Sedang"}]' \
  -F 'addon_group_ids=["550e8400-e29b-41d4-a716-446655440000"]' \
  -F "image=@/path/to/product.png"

```

## Response

### 201 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Nasi Goreng Spesial",
    "description": "Nasi goreng dengan telur dan ayam",
    "price": 20000,
    "image_url": "/uploads/product-1234567890.png",
    "store_id": 5,
    "variants": [
      { "id": 1, "name": "Pedas", "additional_price": 2000 },
      { "id": 2, "name": "Sedang", "additional_price": 0 }
    ],
    "productAddonGroups": [
      {
        "addon_group_id": "550e8400-e29b-41d4-a716-446655440000",
        "addon_group": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Level Pedas",
          "addons": [
            { "id": 1, "name": "Tidak Pedas" },
            { "id": 2, "name": "Sangat Pedas" }
          ]
        }
      }
    ]
  }
}
```

### Error

| Status | Condition                                                               | `errors`                                                                             |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 400    | `name` or `price` not sent, or invalid format                           | Joi message, e.g., `"name" is required`                                              |
| 400    | One of the `addon_group_ids` is not a valid GUID format                 | `"addon_group_ids[0]" must be a valid GUID`                                          |
| 400    | `variants` does not match structure (e.g., empty `name`)                | Joi message regarding the failing index                                              |
| 400    | `variants`/`addon_group_ids` sent as string but not valid JSON          | `Invalid data format variants` / `The format of the addon_group_ids data is invalid` |
| 400    | Duplicate variant names within the sent request array                   | `Variant names within a product must be unique`                                      |
| 400    | One or more `addon_group_ids` not found / does not belong to this store | `Some add-on groups are not valid for this store.`                                   |
| 401    | Not logged in / session expired                                         | `Unauthorized`                                                                       |
| 404    | User does not have a store yet                                          | `Store not found`                                                                    |
| 409    | Product name already used by another product in the same store          | `A product named '<nama>' already exists in this store.`                             |
| 409    | Variant name clashes with another active variant in the database        | `A variant with this name already exists in this product.`                           |

## Notes

- Product names must be **unique per store** — other stores can have products with the same name, but they cannot be duplicated within the same store.
- If any of the sent `addon_group_ids` are invalid (non-existent, deleted, or belonging to another store), **the entire request is rejected** — no products are partially saved without their add-on groups.
- Name Formatting: Similar to add-on groups, product names are stored entirely in **lowercase** after being trimmed. If capitalization is needed in the buyer/seller interface, the Frontend should handle title-casing independently (e.g., using `text-transform: capitalize` in CSS).
- The lowercase transformation applies not only to the product name but also to the variant names within `variants[].name`.
