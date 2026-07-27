# Logout

## Endpoint

```
DELETE /api/users/logout

```

## Auth

Requires authentication. A valid `access_token` cookie is mandatory (checked via `authMiddleware`, and the decoded payload is assigned to `req.user`).

## Request

No body. The `access_token` (and `refresh_token`) cookies are sent automatically by the browser as long as the request uses `credentials: "include"` (fetch) or `withCredentials: true` (axios).

## Request Example

```bash
curl -X DELETE https://example.com/api/users/logout \
  -H "Cookie: access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Successfully logged out"
}
```

The server sends a `Set-Cookie` header to clear the cookies in the browser:

| Cookie          | Action                      |
| --------------- | --------------------------- |
| `access_token`  | Cleared (`res.clearCookie`) |
| `refresh_token` | Cleared (`res.clearCookie`) |

### Errors

| Status | Condition                                                            | Example `errors` |
| ------ | -------------------------------------------------------------------- | ---------------- |
| 401    | No cookie / invalid cookie / expired cookie (fails `authMiddleware`) | `Unauthorized`   |

```json
{
  "errors": "Unauthorized"
}
```

## Notes

- A successful response only returns `"data": "OK"`, with no user data — do not expect other fields in the response body.
- The `access_token` & `refresh_token` cookies are `httpOnly`, so the FE cannot (and does not need to) read or delete them manually via JS. Just rely on the response status to update the auth state on the client.
- After receiving a 200, immediately clear/reset the auth state on the client (redirect to the login page, etc.) — there is no need to wait for another request to confirm the user has logged out.
- If you receive a 401 when calling this endpoint, still treat it as "already logged out" (the session is already invalid) — do not display it as a blocking error to the user.
