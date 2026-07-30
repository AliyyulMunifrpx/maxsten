# Register

## Usage Flow

1. **POST** `/api/users` — the user fills out the registration form.
2. The system automatically sends a confirmation email to the registered address.
3. The user **must click the confirmation link in the email** before they can log in.
4. If the user attempts to log in before confirming, `POST /api/users/login` will reject the request.

> The FE needs to display a "Check your email for confirmation" page/message after a successful registration — do not redirect the user directly to the login page or dashboard, as they cannot log in until the email is confirmed.

## Endpoint

```
POST /api/users

```

## Auth

No authentication required (public endpoint).

## Request

Content-Type: `application/json`

| Field      | Type   | Required | Description                                                    |
| ---------- | ------ | -------- | -------------------------------------------------------------- |
| `email`    | string | ✅       | Maximum 100 characters, valid email format, not yet registered |
| `password` | string | ✅       | Minimum 8, maximum 100 characters                              |
| `name`     | string | ✅       | Maximum 100 characters                                         |

## Example Request

```bash
curl -X POST https://example.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123", "name": "User Name"}'

```

## Response

### 201 Created

```json
{
  "data": {
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

> This response **does not mean the user can log in immediately** — the email status remains "unconfirmed" until the user clicks the link in their email.

### Error

| Status | Condition                                                                                                                               | `errors`                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 400    | Email already registered (including the edge case: the account exists in the auth system but is not yet recorded in the local database) | `That email address already exists`    |
| 400    | Validation failed (invalid email/password/name format, password less than 8 characters, etc.)                                           | Joi error message                      |
| 400    | Rejected by the authentication system (e.g., specific password policies)                                                                | message from the authentication system |
| 500    | Failed to save the profile to the database due to other reasons (not duplicate email)                                                   | server error message                   |

## Notes

- The confirmation email is sent automatically, not by the backend — the template and sender are configured separately, not from the code in this repo.
- **Resending the confirmation email** is handled directly by the FE via the Supabase Auth SDK, not through the backend:

```javascript
await supabase.auth.resend({ type: "signup", email });
```

- **Duplicate email checking is done in multiple layers**, including protecting against a subtle security vulnerability: if an email was previously registered in the auth system (for example, a previous registration process was interrupted after the auth account was created but before it was saved to the local database), the auth system doesn't always provide a clear error when that email is re-registered — to prevent people from guessing which emails are registered (_email enumeration_ protection). Without specific handling, this vulnerability could be exploited: someone re-registers using an email already used by someone else, receives a false "success" while essentially piggybacking on another person's email identity (the original password remains with the first owner, unchanged). This system explicitly detects that condition and still rejects it with the same message as a standard duplicate email — requests like this **never** succeed with a `201`.
- **If an account is successfully created in the auth system but fails to be saved to the local database** (e.g., a race condition when two registrations for the same email occur almost simultaneously, or the database is experiencing issues), the system automatically attempts to delete the newly created auth account (rollback), so there are no "orphaned" accounts — existing in the auth system but unrecorded in the database, which could potentially become the same vulnerability mentioned above. If this rollback process itself fails, it is only recorded in the server logs (best-effort) and does not affect the response received by the user.
