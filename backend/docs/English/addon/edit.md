# Edit Add-on Group

Update an add-on group's name and replace its entire list of add-ons (full replacement).

## Endpoint

```text
PATCH /api/stores/addon-groups/:addonGroupId
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field            | Type          | Required | Description                                                                                     |
| ---------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `name`           | string        | ✅       | Maximum 100 characters. The value is trimmed and stored in lowercase (same behavior as create). |
| `addons`         | array<object> | ✅       | At least 1 item. See the full replacement rules below.                                          |
| `addons[].id`    | string        | ❌       | Include this to update an existing add-on. Omit it to create a new add-on.                      |
| `addons[].name`  | string        | ✅       | Maximum 100 characters.                                                                         |
| `addons[].price` | number        | ✅       | Must not be negative.                                                                           |

### `addons` Rules (Full Replacement Based on `id`, Similar to Product Variant Updates)

- An item **with an `id`** that matches an existing add-on in this group will be **updated** (`name`, `price`).
- An item **without an `id`** is treated as a **new add-on** and will be created automatically.
- Existing add-ons **not included** in the array will be **soft-deleted** automatically.
- If any provided `id` does not exist or does not belong to this add-on group, the **entire request is rejected** (`400 Bad Request`), and no changes are saved.

## Example Request

```bash
curl -X PATCH https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Drink Toppings",
    "addons": [
      { "id": "addon-uuid-1", "name": "Boba", "price": 3500 },
      { "name": "Jelly", "price": 2000 }
    ]
  }'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "drink toppings",
    "created_at": "2026-07-01T00:00:00.000Z",
    "addons": [
      {
        "id": "addon-uuid-1",
        "name": "boba",
        "price": 3500,
        "created_at": "2026-07-01T00:00:00.000Z"
      },
      {
        "id": "addon-uuid-2",
        "name": "jelly",
        "price": 2000,
        "created_at": "2026-07-27T10:00:00.000Z"
      }
    ]
  }
}
```

### Errors

| Status | Condition                                                                                                    | `errors`                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 400    | Validation failed (empty or missing `addons`, negative `price`, etc.)                                        | Joi validation message                                                                      |
| 400    | One or more `addons[].id` values do not exist or do not belong to this add-on group                          | `Invalid add-on`                                                                            |
| 401    | Not authenticated or session has expired                                                                     | `Unauthorized`                                                                              |
| 404    | The authenticated user does not have a store                                                                 | `Store not found`                                                                           |
| 404    | The add-on group does not exist, has been soft-deleted, or does not belong to the authenticated user's store | `Addon Group not found`                                                                     |
| 409    | The add-on group is currently used by a product in an active queue (`BELUM_BAYAR` or `DIPROSES`)             | `Cannot edit this add-on group because a product using it is currently in an active queue.` |
| 409    | Another active add-on group in the same store already uses the requested name                                | `An add-on group with this name already exists`                                             |

## Notes

- **An add-on group cannot be edited while it is being used by a product in any active queue.** Unlike product updates (where only certain fields such as `price` or `variants` are locked), **the entire edit operation is rejected** if even one product using this add-on group is currently in an active queue. The related queue(s) must be completed or canceled before the add-on group can be edited.
- **Both the group `name` and each `addons[].name` are stored in lowercase**, consistent with `POST /api/stores/addon-groups`. See the Create Add-on Group documentation for details on the frontend display implications.
