# List Cancellation Reason Templates

Retrieve all cancellation reason templates belonging to the authenticated user's store.

## Endpoint

```text
GET /api/seller/cancel-reasons
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

No request parameters are required. A valid authentication cookie is sufficient.

## Example Request

```bash
curl -X GET https://example.com/api/seller/cancel-reasons \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "reason": "Out of stock",
      "created_at": "2026-07-27T10:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "reason": "Store is closing",
      "created_at": "2026-07-20T08:00:00.000Z"
    }
  ]
}
```

The `data` field is always returned as an array. If the store does not have any cancellation reason templates yet, the response will be `[]`. Templates are sorted by **newest first**.

### Errors

| Status | Condition                                    | `errors`          |
| ------ | -------------------------------------------- | ----------------- |
| 401    | Not authenticated or session has expired     | `Unauthorized`    |
| 404    | The authenticated user does not have a store | `Store not found` |

## Notes

- This endpoint does **not** support pagination. All active cancellation reason templates are returned in a single response, as the number of templates is typically very small (usually only a few per store).
