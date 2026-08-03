# Get Current User

Retrieve the data of the currently logged-in user.

## Endpoint

```
GET /api/users/me

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). If the `access_token` has expired but the `refresh_token` is still valid, the session is automatically extended and new cookies are reset in the response — the frontend does not need to handle refreshing manually.

## Request

No additional parameters — just a valid auth cookie.

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
    "name": "Nama User"
  }
}
```

### Error

| Status | Condition                                                         | `errors`                                                 |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------- |
| 401    | Not logged in / session expired                                   | `Unauthorized` or `Session Expired. Please login again.` |
| 401    | Account is valid in Auth but data not found in the local database | `User database mismatch`                                 |

## Notes

- This data is retrieved directly from the authentication result (`authMiddleware`) rather than a separate query — ensuring it is always consistent with the identity used for authorization across other endpoints.
