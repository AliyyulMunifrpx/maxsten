# Create Cancellation Reason Template

Create a cancellation reason template that sellers can reuse when canceling a queue (for example, "Out of stock") instead of typing the reason manually each time.

## Endpoint

```text
POST /api/seller/cancel-reasons
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field    | Type   | Required | Description                                                                                       |
| -------- | ------ | -------- | ------------------------------------------------------------------------------------------------- |
| `reason` | string | ✅       | Maximum 255 characters. Must be unique among the cancellation reason templates in the same store. |

## Example Request

```bash
curl -X POST https://example.com/api/seller/cancel-reasons \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Out of stock"}'
```

## Response

### 201 Created

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Out of stock",
    "created_at": "2026-07-27T10:00:00.000Z"
  }
}
```

### Errors

| Status | Condition                                                        | `errors`                                               |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 400    | `reason` is missing or exceeds 255 characters                    | Joi validation message                                 |
| 401    | Not authenticated or session has expired                         | `Unauthorized`                                         |
| 404    | The authenticated user does not have a store                     | `Store not found`                                      |
| 409    | A template with the same reason already exists in the same store | `A cancellation reason with this text already exists.` |

## Notes

- This endpoint uses the `/api/seller/...` path, unlike most other endpoints that follow the `/api/stores/...` pattern. Make sure to use the correct endpoint path.
