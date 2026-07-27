# Get Store (Me)

Retrieve the store data belonging to the currently logged-in user.

## Endpoint

```
GET /api/stores/me

```

## Auth

Cookie-based auth (`access_token`/`refresh_token`, `httpOnly`). `userId` is retrieved from middleware.

## Request

No additional parameters — just a valid auth cookie.

## Request Example

```bash
curl -X GET https://example.com/api/stores/me \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Toko Sumber Rejeki",
    "description": "Toko kelontong harian",
    "city": "Bogor",
    "province": "Jawa Barat",
    "village": "Sukamaju",
    "district": "Cibinong",
    "street_address": "Jl. Mawar No. 12",
    "postal_code": "16916",
    "logo_url": "/uploads/logo-1234567890.png",
    "timezone": "Asia/Jakarta",
    "manual_status": null,
    "manual_updated_at": null,
    "operational_hours": [
      {
        "day": 0,
        "is_active": false,
        "open_time": "08:00",
        "close_time": "20:00"
      },
      {
        "day": 1,
        "is_active": true,
        "open_time": "08:00",
        "close_time": "20:00"
      }
    ],
    "payment_timeout": 15,
    "is_open": true
  }
}
```

`operational_hours` is always ordered from `day: 0` (Sunday) to `day: 6` (Saturday).

### Errors

| Status | Condition                                                               | `errors`                                                     |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| 401    | Not logged in / session expired                                         | `"Unauthorized"` or `"Session Expired. Please login again."` |
| 404    | User does not have an active store (including if the store was deleted) | `"Store not found"`                                          |
| 500    | Server/database error                                                   | —                                                            |

```json
{
  "errors": "Store not found"
}
```

## Notes

- The internal `id` (Prisma) is intentionally excluded from the response — the FE uses `public_id`.
- `is_open` is **not** a database column — it is recalculated in real-time per request, based on the current time in the store's timezone (`timezone`), matched against `operational_hours`, with `manual_status` acting as an override if present.
- **`manual_status` override rules:**
- It is only effective if set **on the same day** (according to the store's timezone, not the server's timezone). Overrides from the previous day are automatically ignored, and the system reverts to the normal schedule.
- The only recognized values are `"OPEN"` and `"CLOSED"`. If `manual_status` contains any other value (or is null), it means the override is inactive — the FE will never receive values other than these two from the system, so expect either one of these strings or `null`.

- **Schedules crossing midnight are supported** (e.g., opens at 20:00, closes at 02:00 AM) — `is_open` remains consistent both before and after midnight as long as it falls within the session.
- If the store's `timezone` is empty or invalid, the system automatically falls back to `Asia/Jakarta` for the `is_open` calculation — this never causes an error.
- `payment_timeout` is in minutes.
- Deleted stores (`is_delete: true`) will never appear in this endpoint — they are treated the same as if the user doesn't have a store (`404`).
