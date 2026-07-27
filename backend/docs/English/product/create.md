# Create Product

Adds a new product to the currently logged-in user's store.

## Endpoint

```
POST /api/stores/products

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `multipart/form-data` (because of the `image` upload). Can also be `application/json` if no image is included.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | ✅ | Maximum 100 characters. Must be unique per store. |
| `price` | number | ✅ | Must be greater than 0. |
| `description` | string | ❌ | — |
| `variants` | array<object> | ❌ | See structure below. |
| `addon_group_ids` | array<string (UUID)> | ❌ | Existing add-on group IDs; must belong to the same store. |
| `image` | file | ❌ | Field name must be `image` (not `logo`). |

### `variants` Structure

```json
[
  { "name": "Pedas", "additional_price": 2000 },
  { "name": "Sedang" }
]

```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `.name` | string | ✅ | Maximum 100 characters. |
| `.additional_price` | number | ❌ | Defaults to `0` if omitted. Cannot be negative. |

Because it is sent via `multipart/form-data`, `variants` and `addon_group_ids` must be sent as **JSON strings**, similar to `operational_hours` in the create store endpoint.

## Request Example

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

### 201 Created

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

### Errors

| Status | Condition | `errors` |
| --- | --- | --- |
| 400 | `name` or `price` is missing, or invalid format | Joi message, e.g., `"name" is required` |
| 400 | One of the `addon_group_ids` is not a valid UUID format | `"addon_group_ids[0]" must be a valid GUID` |
| 400 | `variants` does not match the required structure (e.g., `name` is empty) | Joi message related to the failed index |
| 400 | `variants`/`addon_group_ids` is sent as a string but is not valid JSON | `Format data variants tidak valid` / `Format data addon_group_ids tidak valid` |
| 400 | The product name is already used by another product in the same store | `A product named '<name>' already exists in this store` |
| 400 | Some `addon_group_ids` are not found / do not belong to this store | `Some add-on groups are not valid for this store.` |
| 401 | Not logged in / session expired | `Unauthorized` |
| 404 | User does not have a store yet | `Store not found` |

## Notes

* Product names must be **unique per store** — other stores can have products with the same name, but duplicates within the same store are not allowed.
* If any of the submitted `addon_group_ids` are invalid (do not exist, deleted, or belong to another store), **the entire request is rejected** — no product will be partially saved without its add-on groups.