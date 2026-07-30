# Cancel Queue (Buyer)

Allows a buyer to cancel their own order as long as its status is still `BELUM_BAYAR`.

## Endpoint

```http
PATCH /api/stores/:storeId/queues/:queueId/cancel
```

- `:storeId` = the store's `public_id`.
- `:queueId` = the queue ID (integer).
 
## Authentication

Uses the `guest_id` cookie instead of user authentication. A queue can only be canceled by the same guest who created it.

## Request

Content-Type: `application/json`

| Field    | Type   | Required | Description                                                                  |
| -------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `reason` | string | ❌       | Optional cancellation reason provided by the buyer (maximum 100 characters). |

## Example Request

```bash
curl -X PATCH https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/queues/90/cancel \
  -b "guest_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Taking too long"}'
```

## Response

### 200 OK

```json
{
  "data": {
    "id": 42,
    "status": "DIBATALKAN",
    "reason": "Taking too long"
  }
}
```

## Error Responses

| Status | Condition                                                                                             | `errors`                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 400    | Validation failed (`storeId`/`queueId` has an invalid format, or `reason` exceeds 100 characters).   | Validation error message                                                               |
| 400    | The queue has already been processed by the seller (its status is no longer `BELUM_BAYAR`).           | `The order has been processed and cannot be canceled`                                  |
| 400    | The queue started being processed **exactly while** this request was being executed (race condition). | `Oh, someone beat you to it! Your order has just started being processed by the store` |
| 401    | The `guest_id` cookie is missing.                                                                     | `Unauthorized`                                                                         |
| 404    | The queue was not found or does not belong to the authenticated `guest_id`.                           | `The order was not found or does not belong to you`                                    |

> There are **two different 400 responses** for similar situations. If the queue is already no longer in the `BELUM_BAYAR` state when the request starts, the first message is returned. However, if the queue is still `BELUM_BAYAR` initially but the seller starts processing it in the middle of this request (a race condition), the second message is returned. Both cases mean the cancellation failed, so the frontend may handle them the same way, but the messages are intentionally different to make debugging easier.

## Notes

- **The queue can still be canceled even if the store has been deleted or deactivated.** This behavior is intentional. Buyers who placed an order before the store was closed should not be left with an order permanently stuck in the `BELUM_BAYAR` state simply because the store is no longer active.
- Canceling a queue through this endpoint automatically triggers the Socket.IO `STATUS_UPDATED` event. The event is sent to both the buyer's room (`ANTREAN_<queueId>`) and the seller's room (`TOKO_<store_id>`) with `triggered_by: "buyer"`. See `socket-io.md` for more details.
