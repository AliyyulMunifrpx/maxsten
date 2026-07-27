# Get Current User

Retrieve the currently logged-in user's data.

## Endpoint

```
GET /api/users/me

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). If the `access_token` has expired but the `refresh_token` is still valid, the session is automatically extended and new cookies are set in the response — the FE does not need to handle token refreshes manually.

## Request

No additional parameters — just a valid auth cookie.

## Request Example

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

### Errors

| Status | Condition                                                                       | `errors`                               |
| ------ | ------------------------------------------------------------------------------- | -------------------------------------- |
| 401    | Neither `access_token` nor `refresh_token` are present                          | `Unauthorized`                         |
| 401    | `access_token` is invalid and there is no `refresh_token` for fallback          | `Unauthorized`                         |
| 401    | Both `access_token` & `refresh_token` are invalid/expired                       | `Session Expired. Please login again.` |
| 401    | Session is valid in the auth system, but user data is not found in the database | `User database mismatch`               |

```json
{
  "errors": "Session Expired. Please login again."
}
```

## Notes

- If only the `access_token` is invalid but the `refresh_token` is still valid, the request will still succeed (200) — the server automatically refreshes the session in the background and sends new cookies via `Set-Cookie`.
- If the session is refreshed, the old `access_token` & `refresh_token` cookies are automatically replaced — the FE does not need to trigger a re-login or perform any additional actions.
- Because the endpoint uses `httpOnly` cookies, every request **must** send credentials.
