# Update User Profile

## Endpoint

```
PATCH /api/users/me

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). The `userId` is extracted from `req.user.id` (via middleware).

## Request

Content-Type: `application/json`

| Field  | Type   | Required | Description         |
| ------ | ------ | -------- | ------------------- |
| `name` | string | ✅       | User's display name |

> This endpoint can **only** update the `name`. Email and password **cannot** be changed through this endpoint — see the Notes section below.

## Example Request

```bash
curl -X PATCH https://example.com/api/users/me \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'

```

## Response

### 200 OK

```json
{
  "data": {
    "name": "New Name"
  }
}
```

### Error

| Status | Condition                                                                  | `errors`                                                 |
| ------ | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| 400    | Validation failed (e.g., `name` is not a string)                           | validation message                                       |
| 401    | Not logged in / session expired                                            | `Unauthorized` or `Session Expired. Please login again.` |
| 404    | User not found (edge case, e.g., the account was deleted between requests) | `User not found`                                         |
| 500    | Failed to update due to other reasons                                      | `Failed to update user profile`                          |

## Notes

- **Change email:** is not handled through this backend endpoint. The FE calls the Supabase Auth SDK directly from the client (`supabase.auth.updateUser({ email })`). Once the email is changed in Supabase, the system automatically synchronizes the new email to the database via an internal webhook — the FE does not need to call any additional endpoints for this synchronization. As a fallback layer, the email is also automatically re-synchronized every time the user logs in (see `POST /api/users/login`), ensuring it remains consistent even if the webhook fails or is delayed.
- **Change password:** just like the email, this is done directly from the FE via the Supabase Auth SDK (`supabase.auth.updateUser({ password })`), not through this backend endpoint — the backend does not store passwords at all.
