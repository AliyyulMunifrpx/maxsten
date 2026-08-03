# Get Queue Details (Buyer)

Retrieve the details of a specific buyer's queue. This endpoint returns the queue status, order details (including _add-on snapshots_), and the _server_ time for payment _countdown_ calculations.

## Endpoint

```text
GET /api/stores/:storeId/queues/:queueId

```

- `:storeId` is the `public_id` of the store (UUID format).
- `:queueId` is the queue `id` (Number/Integer format).

## Auth

Automatic cookie-based auth. The system reads the `guest_id` cookie from the buyer's browser to ensure that the queue truly belongs to the buyer currently accessing it.

## Request

| Param     | Location  | Type          | Required | Description                                                    |
| --------- | --------- | ------------- | -------- | -------------------------------------------------------------- |
| `storeId` | URL param | string (UUID) | ✅       | The `public_id` of the store where the buyer placed the order. |
| `queueId` | URL param | number        | ✅       | The internal ID of the queue to view.                          |

## Example Request

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/queues/10" \
  -H "Cookie: guest_id=11111111-2222-3333-4444-555555555555"

```

## Response

### 200 OK

```json
{
  "data": {
    "id": 10,
    "guest_id": "11111111-2222-3333-4444-555555555555",
    "queue_number": 15,
    "status": "BELUM_BAYAR",
    "note": "Don't make it too spicy please",
    "total_price": 45000,
    "created_at": "2026-07-28T15:00:00.000Z",
    "expired_at": "2026-07-28T15:30:00.000Z",
    "server_now": "2026-07-28T15:05:00.000Z",
    "queueDetails": [
      {
        "id": "detail-uuid-1",
        "quantity": 2,
        "selected_addons": [
          {
            "id": "addon-uuid-1",
            "name": "Cheese",
            "price": 3000
          },
          {
            "id": "addon-uuid-2",
            "name": "Boba",
            "price": 2000
          }
        ],
        "product": {
          "id": "prod-uuid-1",
          "name": "Mie Goreng",
          "price": 15000,
          "image_url": "https://example.com/mie.jpg",
          "description": "East Java style fried noodles"
        },
        "variant": {
          "id": "var-uuid-1",
          "name": "Extremely Spicy",
          "additional_price": 2000
        }
      }
    ]
  }
}
```

### Error

| Status | Condition                                                                                                       | `errors`                      |
| ------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 400    | Parameter `storeId` is not a valid UUID, or `queueId` is not a positive number.                                 | Validation message (from Joi) |
| 401    | The buyer did not send the `guest_id` cookie (session not found).                                               | `Unauthorized`                |
| 404    | Queue not found.                                                                                                | `No queue found`              |
| 404    | Queue exists, but the buyer attempted to access it using a `storeId` from another store (Cross-Store Security). | `No queue found`              |
| 404    | Queue exists, but the `guest_id` in the cookie does not match the original owner of the queue (_Anti-Hack_).    | `No queue found`              |

## Additional Notes (For Frontend)

- **Price/Menu Change Safe:** The `selected_addons` data returned is already in a _snapshot_ format (locking in the name and price at the time of _checkout_). If the store owner deletes an add-on or changes its price later on, this queue receipt will remain unchanged and will not cause any errors.
- **Countdown Timer:** Use the time difference between `server_now` and `expired_at` to display the remaining payment time precisely on the buyer's screen. Do not use the buyer's device local OS clock, as it is prone to manipulation or synchronization issues.
