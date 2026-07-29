# Get Queue Details (Buyer)

Retrieves the details of a specific queue belonging to the buyer. This endpoint returns the current queue status, order details (including the **add-on snapshot**), and the current **server time** for accurate payment countdown calculations.

## Endpoint

```text
GET /api/:publicId/queue/:queueId
```

- `:publicId` is the store's `public_id` (UUID format).
- `:queueId` is the queue's internal `id` (integer).

## Authentication

Cookie-based authentication. The system reads the `guest_id` cookie from the buyer's browser to verify that the requested queue actually belongs to the current buyer.

## Request

| Parameter  | Location      | Type          | Required | Description                                                    |
| ---------- | ------------- | ------------- | -------- | -------------------------------------------------------------- |
| `publicId` | URL parameter | string (UUID) | ✅       | The `public_id` of the store where the buyer placed the order. |
| `queueId`  | URL parameter | integer       | ✅       | The internal ID of the queue to retrieve.                      |

## Example Request

```bash
curl -X GET "https://example.com/api/f47ac10b-58cc-4372-a567-0e02b2c3d479/queue/10" \
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
    "note": "Jangan pedes ya bang",
    "total_price": 45000,
    "created_at": "2026-07-28T15:00:00.000Z",
    "expired_at": "2026-07-28T15:30:00.000Z",
    "server_now": "2026-07-28T15:05:00.000Z",
    "queueDetails": [
      {
        "id": "detail-uuid-1",
        "queue_id": 10,
        "product_id": "prod-uuid-1",
        "variant_id": "var-uuid-1",
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
          "name": "Fried Noodles",
          "price": 15000,
          "image_url": "https://example.com/mie.jpg",
           "description": "mie goreng khas jawa timur"
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

### Error Responses

| Status | Condition                                                                                                             | `errors`                      |
| ------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 400    | `publicId` is not a valid UUID, or `queueId` is not a positive integer.                                               | Validation message (from Joi) |
| 401    | The buyer did not send the `guest_id` cookie (session not found).                                                     | `Unauthorized`                |
| 404    | Queue not found.                                                                                                      | `No queue found`              |
| 404    | The queue exists, but the buyer tries to access it using another store's `publicId` (cross-store access protection).  | `No queue found`              |
| 404    | The queue exists, but the `guest_id` cookie does not match the actual owner of the queue (anti-hijacking protection). | `No queue found`              |

## Additional Notes (Frontend)

- **Safe Against Menu and Price Changes:** The returned `selected_addons` data is stored as a **snapshot**, preserving the add-on names and prices at the time of checkout. If the store owner later deletes an add-on or changes its price, the queue receipt remains unchanged and will not cause any errors.
- **Payment Countdown:** Use the difference between `server_now` and `expired_at` to display an accurate payment countdown timer. Do **not** rely on the buyer's device local time, as it may be inaccurate or intentionally manipulated.
