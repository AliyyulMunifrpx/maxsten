# Create Add-on Group

Create a new add-on group along with all of its add-ons in a single request.

## Endpoint

```text
POST /api/stores/addon-groups
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

Content-Type: `application/json` or `multipart/form-data`

| Field            | Type          | Required | Description                                                                                                                                            |
| ---------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`           | string        | ✅       | Maximum 100 characters. Must be unique among **active** add-on groups in the same store. The value is trimmed and stored in **lowercase** (see Notes). |
| `addons`         | array<object> | ✅       | At least 1 item.                                                                                                                                       |
| `addons[].name`  | string        | ✅       | Maximum 100 characters. Must be unique within the group (case-insensitive). The value is trimmed and stored in lowercase.                              |
| `addons[].price` | number        | ✅       | Must not be negative (`0` is allowed).                                                                                                                 |

When using `multipart/form-data`, send `addons` as a **JSON string**, just like `operational_hours` and `variants` in other endpoints:

```text
addons: '[{"name":"Boba","price":3000},{"name":"Less Ice","price":0}]'
```

## Example Request

```bash
curl -X POST https://example.com/api/stores/addon-groups \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Drink Toppings",
    "addons": [
      { "name": "Boba", "price": 3000 },
      { "name": "Less Ice", "price": 0 }
    ]
  }'
```

## Response

### 201 Created

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "drink toppings",
    "created_at": "2026-07-27T10:00:00.000Z",
    "addons": [
      {
        "id": "addon-uuid-1",
        "name": "boba",
        "price": 3000,
        "created_at": "2026-07-27T10:00:00.000Z"
      }
    ]
  }
}
```

The response structure is consistent with `GET /api/stores/addon-groups/:addonGroupId`; both endpoints return the exact same fields.

### Errors

| Status | Condition                                                                                                                       | `errors`                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 400    | Missing or invalid `name`/`addons` (negative `price`, empty `addons`, etc.)                                                     | Joi validation message                                   |
| 400    | `addons` is sent as a string but is not valid JSON                                                                              | `Invalid addons data format. Must be a valid JSON array` |
| 400    | Duplicate add-on names are found within the same request (case-insensitive, e.g. `"Boba"` and `"boba"` are considered the same) | `Add-on names within a group must be unique`             |
| 401    | Not authenticated or session has expired                                                                                        | `Unauthorized`                                           |
| 404    | The authenticated user does not have a store                                                                                    | `Store not found`                                        |
| 409    | Another **active** add-on group in the same store already uses the requested name                                               | `An add-on group with this name already exists`          |

## Notes

- **An add-on group name can be reused once the previous group has been deleted.** Name uniqueness is enforced only among active add-on groups (`is_delete: false`) within the same store, not across the entire history of deleted groups.
- ⚠️ **Both the group `name` and each `addons[].name` are stored in lowercase.** For example, if the user enters `"Drink Toppings"`, it will be stored as `"drink toppings"`. The response and any data shown to buyers will also use the lowercase version. If title case is desired in the UI (e.g. `"Drink Toppings"` instead of `"drink toppings"`), the frontend should format the text itself (for example, using CSS `text-transform: capitalize` or an equivalent approach), since the backend does not preserve the original letter casing.
