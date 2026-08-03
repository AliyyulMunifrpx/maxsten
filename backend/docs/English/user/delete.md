# Delete Account (English Version)

Permanently deletes the user's account (hard-delete) — distinct from `DELETE /api/delete-store`, which only performs a soft-delete on the store.

## Endpoint

```
DELETE /api/users/me

```

## Auth

Cookie-based auth (`access_token` / `refresh_token`, `httpOnly`). `userId` and `supabase_id` are extracted from `req.user` (via middleware).

## Request

No body required.

## Example Request

```bash
curl -X DELETE https://example.com/api/users/me \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK",
  "message": "Account permanently deleted"
}
```

> The `access_token` / `refresh_token` cookies are automatically cleared from the browser — the user is immediately logged out, and there is no need to call `DELETE /api/users/logout` separately.

### Error

| Status | Condition                                                                               | `errors`                                                                              |
| ------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 401    | Not logged in / session expired                                                         | `Unauthorized` or `Session Expired. Please login again.`                              |
| 409    | The user's store still has active customer queues (status `BELUM_BAYAR` or `DIPROSES`). | `You cannot delete your account because your store still has active customer queues.` |
| 409    | There are other crucial relational constraints in the database preventing deletion.     | `We cannot delete the account because there is still data associated with it`        |

## Notes

- **Deletion is permanent:** The user account is completely destroyed. The FE is strongly advised to display an explicit confirmation dialog (e.g., asking to re-type the email) before calling this endpoint.
- **Active Queue Validation:** The system verifies if the user's store is currently serving customers. If there are active queues, the deletion will be rejected (409). The FE should guide the user to complete or cancel those queues first.
- **Active stores are automatically soft-deleted:** If the condition above is met, the system uses an atomic transaction (`$transaction`) to automatically soft-delete (`is_delete: true`) the user's store concurrently with the account deletion.
- **Fail-safe Data Security:** Database (Prisma) data is deleted first. If this step fails, the process halts entirely and the auth system (Supabase) account remains **untouched**, ensuring the user can still log in normally.
- **Auto-Cleanup for Auth Failures:** If the database data is successfully deleted but the auth system (Supabase) fails to respond or is down, the endpoint will still return `200 OK` to the FE to complete the user-facing process. The lingering auth account is then added to an automated background cleanup queue (_Cron Job_) to be safely wiped by the server later.
