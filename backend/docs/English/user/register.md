# Register

## Usage Flow

1. **POST** `/api/users/register` — the user fills out the registration form.
2. The system automatically sends a confirmation email to the registered email address.
3. The user **must click the confirmation link in the email** before they can log in.
4. If the user tries to log in before confirming, `POST /api/users/login` will reject it with a `403 ERR_UNVERIFIED_EMAIL`.

> The FE needs to show a "Check your email for confirmation" page/message after a successful registration — do not immediately redirect the user to the login page or dashboard, as they cannot log in until their email is confirmed.

## Endpoint

```
POST /api/users/register

```

## Auth

Does not require authentication (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Type   | Required | Description                                                 |
| ---------- | ------ | -------- | ----------------------------------------------------------- |
| `email`    | string | ✅       | Must be a valid email format, not yet registered            |
| `password` | string | ✅       | Stored in Supabase Auth, **not** stored in our own database |
| `name`     | string | ✅       | User's display name                                         |

## Request Example

```bash
curl -X POST https://example.com/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "rahasia123", "name": "Nama User"}'

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

> This response **does not mean the user can log in immediately** — the email status is still "unconfirmed" until the user clicks the link in their email.

### Errors

| Status | Condition                                                                         | `errors`                            |
| ------ | --------------------------------------------------------------------------------- | ----------------------------------- |
| 400    | Email is already registered                                                       | `That email address already exists` |
| 400    | Validation failed (invalid email format, empty fields, etc.)                      | field-specific message              |
| 400    | Rejected by Supabase Auth (e.g., password too short according to Supabase policy) | message from Supabase               |

## Notes

- The confirmation email is sent automatically by Supabase Auth, not by the backend — the template & sender are configured from the Supabase Dashboard, not from the code in this repo.
- **Resending the confirmation email** is handled directly from the FE via the Supabase Auth SDK, not through the backend:

```javascript
await supabase.auth.resend({ type: "signup", email });
```
