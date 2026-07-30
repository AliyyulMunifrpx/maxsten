# Delete Store

Soft-delete the store belonging to the currently logged-in user.

## Endpoint

```
DELETE /api/stores/me

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

No body/parameters — just a valid auth cookie.

## Request Example

```bash
curl -X DELETE https://example.com/api/stores/me \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

> Unlike other endpoints that return a store object, here the `data` is just the string `"OK"` — not store data.

### Errors

| Status | Condition                                                                | `errors`          |
| ------ | ------------------------------------------------------------------------ | ----------------- |
| 401    | Not logged in / session expired                                          | `Unauthorized`    |
| 404    | User does not have an active store (including if it was already deleted) | `Store not found` |

## Notes

- Once deleted, the store **can no longer be accessed via any endpoint** (`GET /api/stores/me`, update profile/logo/hours, etc., will return `404 Store not found` as if the user never had a store).
- The user **may immediately create a new store** after the old one is deleted — this deletion completely removes the relationship to the user, rather than merely hiding the old store.
- If the store has a logo, the logo file is also deleted from the server. If this file deletion process fails for any reason, the store is still successfully deleted (failure to delete the file does not cancel the store deletion).
- Repeated calls to this endpoint (trying to delete an already deleted store again) will return `404`, not a `200` for the second time.
