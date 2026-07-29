# Update Queue Status

Update the status of a queue (process, complete, or cancel). Status changes are also automatically sent in real-time to the buyer via Socket.IO.

## Endpoint

```http
PATCH /api/stores/queues/:queueId

```

`:queueId` is the queue UUID.

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the updated queue actually belongs to the logged-in user's store.

## Request

Content-Type: `application/json`

| Field     | Type          | Required | Description                                                                          |
| --------- | ------------- | -------- | ------------------------------------------------------------------------------------ |
| `storeId` | string (UUID) | ✅       | The `public_id` of the store owning the queue                                        |
| `status`  | string        | ✅       | Target status — see the state machine below                                          |
| `reason`  | string        | ❌       | Maximum 100 characters. Cancellation reason, only relevant if `status: "DIBATALKAN"` |

### State machine — allowed transitions

| Current status | Can transition to                           |
| -------------- | ------------------------------------------- |
| `BELUM_BAYAR`  | `DIPROSES`, `DIBATALKAN`                    |
| `DIPROSES`     | `SELESAI`, `DIBATALKAN`                     |
| `SELESAI`      | — (final status, cannot be changed further) |
| `DIBATALKAN`   | — (final status, cannot be changed further) |

Transitions outside this table (e.g., `SELESAI` → `DIPROSES`, or skipping from `BELUM_BAYAR` → `SELESAI`) will be rejected.

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/queues/8b053812-002e-4738-835d-3a1a11af35a5 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "8b053812-002e-4738-835d-3a1a11af35a5", "status": "DIBATALKAN", "reason": "Stok habis"}'

```

## Response

### 200 OK

```json
{
  "data": {
    "id": 42,
    "queue_number": 3,
    "status": "DIBATALKAN",
    "completed_at": null,
    "cancellation_reason": "Stok habis",
    "cancelled_by": "SELLER",
    "queueDetails": [
      {
        "id": 100,
        "quantity": 1,
        "product": {
          "id": 1,
          "name": "Nasi Goreng",
          "price": 20000,
          "image_url": null
        }
      }
    ]
  }
}
```

- `completed_at` is automatically populated with the current time when the `status` changes to `SELESAI`.
- `cancellation_reason` and `cancelled_by: "SELLER"` are automatically populated when the `status` changes to `DIBATALKAN` via this endpoint (differentiated from automatic cancellation by the system/cron).

### Errors

| Status | Condition                                                                                                                                  | `errors`                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 400    | `status` is not one of `DIPROSES`/`SELESAI`/`DIBATALKAN`                                                                                   | Joi validation message                                       |
| 400    | Target `status` is valid but is not an allowed transition from the current status                                                          | `Cannot change the status from <old_status> to <new_status>` |
| 400    | Validation failed (required fields are empty, `reason` exceeds 100 characters)                                                             | validation message                                           |
| 401    | Not logged in / session expired                                                                                                            | `Unauthorized`                                               |
| 404    | `queueId` not found, or `storeId` does not belong to the logged-in user                                                                    | `Queue not found`                                            |
| 409    | The queue status was changed between the time the request was read and saved (e.g., two cashiers processing the same queue simultaneously) | `The queue status has changed`                               |

## Notes

- Updates via this endpoint automatically trigger the Socket.IO `STATUS_UPDATED` event—sent to both the buyer’s room (`ANTREAN_<queueId>`) and the seller’s room (`TOKO_<store_id>`) at the same time, with `triggered_by: “buyer”`. See `socket-io.md`.
