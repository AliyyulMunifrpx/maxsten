# Set Store Status (Manual Open/Close)

Manually override the store's open/close status, bypassing the `operational_hours` schedule.

## Endpoint

```
PATCH /api/stores/:storeId/status

```

`:storeId` is populated with the store's `public_id` (not the internal `id`).

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the modified store actually belongs to the logged-in user.

## Request

Content-Type: `application/json`

| Field           | Type   | Required | Description                             |
| --------------- | ------ | -------- | --------------------------------------- |
| `manual_status` | string | ✅       | Only `"OPEN"` or `"CLOSED"` are allowed |

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/f47ac10b-58cc-4372-a567-0e02b2c3d479/status \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"manual_status": "CLOSED"}'

```

## Response

### 200 OK

```json
{
  "data": {
    "message": "Successfully closed the store",
    "manual_status": "CLOSED"
  }
}
```

### Errors

| Status | Condition                                                                  | `errors`                                                                  |
| ------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 400    | `manual_status` is empty or not `"OPEN"`/`"CLOSED"`                        | `The status can only be 'OPEN' or 'CLOSED'` or `Status must be filled in` |
| 400    | The store still has active queues (status `BELUM_BAYAR` or `DIPROSES`)     | `You still have active queues`                                            |
| 401    | Not logged in / session expired                                            | `Unauthorized`                                                            |
| 404    | `storeId` is not found, or found but does not belong to the logged-in user | `Store not found`                                                         |

## Notes

- **Cannot change the status to `CLOSED` while the store still has queues with a `BELUM_BAYAR` (Unpaid) or `DIPROSES` (Processing) status.** Complete or cancel the active queues first before the store can be closed.
- This override **only applies for the current day** (following the store's timezone). If it is not overridden again tomorrow, the store's status will automatically revert to the normal schedule in `operational_hours` — it does not remain permanent until manually changed again.
- Changes made via this endpoint are immediately reflected in the `is_open` field on `GET /api/stores/me` — no additional requests are needed.
- The `storeId` in the URL uses the `public_id`, which is consistent with other endpoints that return `public_id` as the store identifier (rather than the internal database `id`).
