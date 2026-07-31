# Update Cancellation Reason Template

## Endpoint

```text id="2u74je"
PATCH /api/seller/cancel-reasons/:reasonId
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field    | Type   | Required | Description                                                                                              |
| -------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `reason` | string | ✅       | Maximum 255 characters. Must be unique among the active cancellation reason templates in the same store. |

## Example Request

```bash id="cwlp7s"
curl -X PATCH https://example.com/api/seller/cancel-reasons/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Out of raw ingredients"}'
```

## Response

### 200 OK

```json id="vow5qj"
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Out of raw ingredients",
    "created_at": "2026-07-27T10:00:00.000Z"
  }
}
```

### Errors

| Status | Condition                                                                                                                    | `errors`                                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 400    | `reason` is missing or exceeds 255 characters                                                                                | Joi validation message                                 |
| 401    | Not authenticated or session has expired                                                                                     | `Unauthorized`                                         |
| 404    | The cancellation reason template does not exist, has been soft-deleted, or does not belong to the authenticated user's store | `Reason template not found or you do not have access`  |
| 409    | Another active cancellation reason template in the same store already uses the requested text                                | `A cancellation reason with this text already exists.` |
