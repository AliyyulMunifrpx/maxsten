# Delete User

## Endpoint

```
DELETE /api/users/delete

```

## Auth

Requires authentication. A valid `access_token` cookie is mandatory (checked via `authMiddleware`, and the decoded payload is assigned to `req.user`).

## Request

No body. The `access_token` (and `refresh_token`) cookies are sent automatically by the browser as long as the request uses `credentials: "include"` (fetch) or `withCredentials: true` (axios).

## Request Example

```bash
curl -X DELETE https://example.com/api/users/delete \
  -H "Cookie: access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Account permanently deleted"
}
```

The account (and its associated data) is permanently deleted from the database, and the server automatically sends a `Set-Cookie` header to clear the cookies (automatic logout):

| Cookie          | Action                      |
| --------------- | --------------------------- |
| `access_token`  | Cleared (`res.clearCookie`) |
| `refresh_token` | Cleared (`res.clearCookie`) |

### Errors

| Status | Condition                                                                                                                  | Example `errors`                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 401    | No cookie / invalid cookie / expired cookie (fails `authMiddleware`)                                                       | `Unauthorized`                         |
| 404    | User data not found in the database (valid session but the record no longer exists)                                        | `User not found`                       |
| 500    | Failed to delete the account on the authentication side (user data in the main database remains intact and is not deleted) | `Failed to delete user authentication` |

```json
{
  "errors": "Unauthorized"
}
```

## Notes

- This action is **permanent and cannot be undone** — the FE should present an explicit confirmation dialog before calling this endpoint.
- If successful (200), the user is automatically logged out (cookies cleared) — the FE just needs to redirect to the login/landing page; there is no need to call a separate logout endpoint afterward.
- If a 500 error occurs, the account and its data remain entirely intact (not deleted at all) — it is safe for the user to try again, or they can be directed to customer support if the issue persists.
