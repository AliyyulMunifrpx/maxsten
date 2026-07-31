# Delete Cancellation Reason Template

Soft-delete a cancellation reason template.

## Endpoint

```text
DELETE /api/seller/cancel-reasons/:reasonId
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

No request body is required. Only the `reasonId` URL parameter and a valid authentication cookie are needed.

## Example Request

```bash
curl -X DELETE https://example.com/api/seller/cancel-reasons/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

### Errors

| Status | Condition                                                                                                                    | `errors`                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 400    | `reasonId` is not a valid UUID                                                                                               | Joi validation message                   |
| 401    | Not authenticated or session has expired                                                                                     | `Unauthorized`                           |
| 404    | The authenticated user does not have a store                                                                                 | `Store not found`                        |
| 404    | The cancellation reason template does not exist, has been soft-deleted, or does not belong to the authenticated user's store | `Cancellation reason template not found` |

## Notes

- Deleting a cancellation reason template **does not affect** any existing cancellation history that previously used its text. The `cancellation_reason` stored in past queue records is a plain text snapshot captured at the time of cancellation, not a reference to the template. Deleting the template does not modify or remove any historical data.
