# Logout

## Endpoint

```
DELETE /api/users/logout

```

## Auth

Cookie-based auth (`access_token`). It can still be called even if the `access_token` is missing or invalid — see the notes below.

## Request

No body required.

## Example Request

```bash
curl -X DELETE https://example.com/api/users/logout \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Logout successful"
}

```

> This endpoint **always** returns `200` — no error conditions are returned to the FE for this endpoint.

## Notes

* **Logout is always "successful" from the FE's perspective**, even if the process of invalidating the session on the auth server fails behind the scenes (e.g., because the `access_token` has already expired, or the auth server is experiencing issues) — such failures are only recorded in the server logs and never cause this request to fail. This is intentional: if logout could fail, the cookies in the browser wouldn't be cleared (`res.clearCookie` would never execute), and the user would be "stuck" unable to log out from their own browser.
* The `access_token` and `refresh_token` cookies are always cleared from the browser after this request, regardless of the outcome mentioned above.
* After logout, any previously existing cookies become invalid for subsequent requests — the FE should immediately redirect the user to the login page upon receiving this response, without needing to wait for additional verification.