# Login

## Endpoint

```
POST /api/users/login

```

## Auth

No authentication required (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `email`    | string | ✅       | Maximum 100 characters, valid email format |
| `password` | string | ✅       | Maximum 100 characters                     |

## Example Request

```bash
curl -X POST https://example.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'

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

The session is stored via two `httpOnly` cookies (not in the response body):

| Cookie          | Lifespan                                 | Description                                    |
| --------------- | ---------------------------------------- | ---------------------------------------------- |
| `access_token`  | Follows the auth system's session expiry | Used for authentication on every request       |
| `refresh_token` | 30 days                                  | Used to automatically renew the `access_token` |

Both are `httpOnly`, `secure: true`, `sameSite: "none"` — configured to support a Frontend residing on a different domain from the backend (cross-origin).

### Error

| Status | Condition                                                                                              | `errors`                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 400    | Validation failed (invalid email format, empty fields)                                                 | Joi error message                                                                |
| 401    | Incorrect email or password                                                                            | `Incorrect email or password`                                                    |
| 403    | Email not verified                                                                                     | `Email not verified`                                                             |
| 403    | Account suspended/banned                                                                               | `Account suspended. Please contact support.`                                     |
| 409    | The email in the auth system is already used by another profile in the database (edge case, very rare) | `This email address is already in use by another user. Please contact the admin` |
| 500    | Other unhandled errors from the authentication system                                                  | message from the authentication system                                           |

```json
{
  "errors": "Incorrect email or password"
}
```

## Notes

- **Login now always successfully creates a profile if one does not exist** (it no longer rejects with a `404`) — profile lookup is based on `supabase_id`, and if no matching row is found in the database, the system automatically creates it on the fly (defaulting `name` to `"User"`, as there is no name info from login credentials). If the FE previously handled a specific `404 User not found` (e.g., to redirect to a "complete profile" flow), this **will never happen again** — consider whether this generic `name: "User"` needs special handling in the UI (e.g., a page to change the name).
- **Self-healing email sync**: if the email stored in the database differs from the active email in the auth system (e.g., the user changed their email and the synchronization webhook hasn't run yet), the system automatically updates the email in the database upon login — without any additional requests from the FE.
- **The 409 edge case** can occur if the email currently active in the auth system (`supabase_id` A) is already being used by a different database profile (`supabase_id` B) — usually due to inconsistent data outside the normal flow. Users encountering this case **cannot log in independently** and require manual intervention from an admin.
- **Errors from the auth system that are not specifically recognized will appear as `500**`, not `401` — unlike before. If a new type of error from the auth system should be handled as a client error (4xx), specific handling must be added for it, otherwise it will temporarily always appear as a generic server error to the FE.
