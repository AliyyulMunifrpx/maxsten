# Update User Profile

## Endpoint

```
PATCH /api/users/update

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). `userId` is retrieved from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field  | Type   | Required | Description         |
| ------ | ------ | -------- | ------------------- |
| `name` | string | ✅       | User's display name |

> This endpoint can **only** update the `name`. Email and password **cannot** be updated via this endpoint — see the Notes section below.

## Request Example

```bash
curl -X PATCH https://example.com/api/users/update \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nama Baru"}'

```

## Response

### 200 OK

```json
{
  "data": {
    "name": "Nama Baru"
  }
}
```

### Errors

| Status | Condition                                        | `errors`                                                 |
| ------ | ------------------------------------------------ | -------------------------------------------------------- |
| 400    | Validation failed (e.g., `name` is not a string) | `"name" must be a string`                                |
| 401    | Not logged in / session expired                  | `Unauthorized` or `Session Expired. Please login again.` |
| 404    | User not found                                   | `User not found`                                         |

## Notes

- **Change email:** is not handled via this backend endpoint. The FE calls the Supabase Auth SDK directly from the client (`supabase.auth.updateUser({ email })`). Once the email is updated in Supabase, the system automatically syncs it to the database via an internal webhook — the FE does not need to call any additional endpoints for this synchronization.
- **Change password:** similar to the email, this is done directly from the FE via the Supabase Auth SDK (`supabase.auth.updateUser({ password })`), not through this backend endpoint — the backend does not store passwords at all.
- Because the endpoint uses `httpOnly` cookies, every request **must** send credentials.
