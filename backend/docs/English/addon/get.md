# Get Add-on Group

Retrieve the details of a single add-on group along with all active add-ons it contains.

## Endpoint

```text
GET /api/stores/addon-groups/:addonGroupId
```

`:addonGroupId` is the UUID of the add-on group.

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware) and is used to ensure that the requested add-on group belongs to the authenticated user's store.

## Request

No request body is required. Only the `addonGroupId` URL parameter and a valid authentication cookie are needed.

## Example Request

```bash
curl -X GET https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
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
}
```

### Errors

| Status | Condition                                                                                                    | `errors`                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 400    | `addonGroupId` is not a valid UUID                                                                           | Validation error message                                    |
| 401    | Not authenticated or session has expired                                                                     | `Unauthorized`                                              |
| 404    | The add-on group does not exist, has been soft-deleted, or does not belong to the authenticated user's store | `The add-on group was not found, or you do not have access` |

## Notes

- **Soft-deleted add-ons (`is_delete: true`) are automatically filtered out** from the `addons` array. If every add-on in the group has been soft-deleted, the `addons` field will simply be an empty array (`[]`) instead of returning an error, as long as the add-on group itself is still active.
- **A `404` response is intentionally used for three different scenarios**: the add-on group does not exist, has been soft-deleted, or belongs to another store. The error message is deliberately kept the same, following the ownership-check pattern used by other endpoints (such as `Product not found` and `Store not found`) to avoid revealing which specific condition occurred.
