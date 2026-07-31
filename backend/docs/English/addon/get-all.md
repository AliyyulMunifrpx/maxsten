# List Add-on Groups

Retrieve all add-on groups belonging to the authenticated user's store, including all active add-ons within each group.

## Endpoint

```text
GET /api/stores/addon-groups
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

No request parameters are required. A valid authentication cookie is sufficient.

## Example Request

```bash
curl -X GET https://example.com/api/stores/addon-groups \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Drink Toppings",
      "created_at": "2026-07-01T00:00:00.000Z",
      "addons": [
        {
          "id": "addon-uuid-1",
          "name": "Boba",
          "price": 3000,
          "created_at": "2026-07-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

The `data` field is always returned as an array. If the store does not have any add-on groups yet, the response will be `[]` instead of an error. Add-on groups are sorted by **oldest first**, and the add-ons within each group follow the same order (oldest first).

### Errors

| Status | Condition                                    | `errors`          |
| ------ | -------------------------------------------- | ----------------- |
| 401    | Not authenticated or session has expired     | `Unauthorized`    |
| 404    | The authenticated user does not have a store | `Store not found` |

## Notes

- **This endpoint does not support pagination.** All active add-on groups are returned in a single response.
- **Soft-deleted add-on groups and add-ons (`is_delete: true`) are automatically filtered out**, consistent with `GET /api/stores/addon-groups/:addonGroupId`.
