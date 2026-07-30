
# Get Current User

Retrieve the data of the currently logged-in user.

## Endpoint

```
GET /api/users/me

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). If the `access_token` has expired but the `refresh_token` is still valid, the session is automatically renewed, and new cookies are set in the response — the FE does not need to handle token refreshes manually.

## Request

No additional parameters required — a valid auth cookie is sufficient.

## Example Request

```bash
curl -X GET https://example.com/api/users/me \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": {
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### Error

| Status | Condition                       | `errors`                                                 |
| ------ | ------------------------------- | -------------------------------------------------------- |
| 401    | Not logged in / session expired | `Unauthorized` or `Session Expired. Please login again.` |

## Notes

- This data is extracted directly from the authentication result (`authMiddleware`), not from a separate database query — ensuring it is always consistent with the identity used for authorization in other endpoints.
