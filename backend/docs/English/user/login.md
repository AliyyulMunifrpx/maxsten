# Login

## Endpoint

```
POST /api/users/login

```

## Auth

Does not require authentication (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Type   | Required | Description                  |
| ---------- | ------ | -------- | ---------------------------- |
| `email`    | string | ✅       | Must be a valid email format |
| `password` | string | ✅       | Must be a string             |

## Request Example

```bash
curl -X POST https://example.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "rahasia123"}'

```

## Response

### 200 OK

The body only returns the `email`. The session is stored via 2 `httpOnly` cookies (not in the body):

```json
{
  "data": {
    "email": "user@example.com"
  }
}
```

Cookies set:

| Cookie          | Expiry                          | Description                                                         |
| --------------- | ------------------------------- | ------------------------------------------------------------------- |
| `access_token`  | follows Supabase session expiry | Used for authentication on every request                            |
| `refresh_token` | 30 days                         | Used to automatically renew the `access_token` via `authMiddleware` |

Both are `httpOnly`, `sameSite: strict`, and `secure: true` in production.

### Errors

| Status | Condition                                                           | Example `errors`                 |
| ------ | ------------------------------------------------------------------- | -------------------------------- |
| 400    | Validation failed (invalid email format / password is not a string) | `"email" must be a valid email`  |
| 401    | Incorrect email or password                                         | `Invalid login credentials`      |
| 403    | Email has not been verified                                         | `ERR_UNVERIFIED_EMAIL`           |
| 404    | Account exists in the auth system but user data is not found        | `ERR_USER_NOT_FOUND_IN_DATABASE` |

```json
{
  "errors": "Invalid login credentials"
}
```

## Notes

- The error message for an incorrect email/password is **intentionally kept the same** (`Invalid login credentials`) whether the email is unregistered or the password is wrong — to prevent leaking whether an email is registered in the system.
- The error codes `ERR_UNVERIFIED_EMAIL` and `ERR_USER_NOT_FOUND_IN_DATABASE` are constant strings, intended to be mapped to more user-friendly messages on the FE side (not displayed raw to the user).
