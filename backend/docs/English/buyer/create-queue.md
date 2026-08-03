# Create Queue (Checkout)

Create a new queue based on items selected from the catalog. This endpoint automatically generates a `guest_id` if the buyer does not have one, and sends it back via `Set-Cookie`.

## Endpoint

```text
POST /api/stores/:storeId/queues

```

## Auth

Automatic via Cookie. The system will check for the `guest_id` cookie. If it does not exist, the system will create a new buyer session (_anonymous guest_).

## Request

**URL Parameters:**

| Parameter | Type          | Required | Description                                              |
| --------- | ------------- | -------- | -------------------------------------------------------- |
| `storeId` | string (UUID) | ✅       | The `public_id` of the store where the buyer is queuing. |

**Headers:**
Ensure you send `Content-Type: application/json` and accept credentials (cookies) if called from the frontend (`withCredentials: true`).

**Body (JSON):**

| Field   | Type             | Required | Description                                            |
| ------- | ---------------- | -------- | ------------------------------------------------------ |
| `note`  | string           | ❌       | Optional note from the buyer (maximum 255 characters). |
| `items` | array of objects | ✅       | Minimum 1 product purchased.                           |

**Object Structure inside `items`:**

| Field             | Type            | Required | Description                                       |
| ----------------- | --------------- | -------- | ------------------------------------------------- |
| `product_id`      | string (UUID)   | ✅       | Internal ID of the ordered product.               |
| `quantity`        | number          | ✅       | Quantity of the product (Minimum 1, Maximum 100). |
| `variant_id`      | string (UUID)   | ❌       | ID of the selected variant (e.g., "Spicy").       |
| `selected_addons` | array of string | ❌       | Array containing IDs of the selected Add-ons.     |

## Example Request

```bash
curl -X POST "https://example.com/api/stores/f47ac10b-58cc-4372-a567-0e02b2c3d479/queues" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Don'\''t make it too spicy please",
    "items": [
      {
        "product_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "quantity": 2,
        "variant_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "selected_addons": ["c9a5d102-18f3-4f68-b8d9-81a9424e8a1d", "addon-101"]
      }
    ]
  }'

```

## Response

### 201 OK

Aside from returning JSON, if this is the buyer's first visit, the response will include the header `Set-Cookie: guest_id=<uuid>; HttpOnly; Secure; SameSite=None; Max-Age=86400`.

```json
{
  "data": {
    "id": "1",
    "queue_number": 5,
    "guest_id": "guest-uuid-abcd",
    "status": "BELUM_BAYAR",
    "note": "Don't make it too spicy please",
    "total_price": 50000,
    "created_at": "2026-07-28T14:00:00.000Z",
    "expired_at": "2026-07-28T14:30:00.000Z",
    "server_now": "2026-07-28T14:00:00.500Z",
    "queueDetails": [
      {
        "id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "product_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "variant_id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
        "quantity": 2,
        "selected_addons": [
          {
            "id": "c9a5d102-18f3-4f68-b8d9-81a9424e8a1d",
            "name": "Cheese",
            "price": 3000
          }
        ],
        "product": {
          "id": "...",
          "name": "Burger",
          "price": 20000,
          "image_url": "...",
          "description": "...",
          "is_available": true
        },
        "variant": {
          "id": "1b49b362-70c3-44d7-89ad-80130daf0158",
          "name": "Spicy",
          "additional_price": 2000
        }
      }
    ]
  }
}
```

### Error

| Status | Condition                                                        | `errors`                                                            |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| 400    | The store is currently closed automatically/manually.            | `Sorry, the store is currently closed`                              |
| 400    | There is still an active order in progress (unpaid/processing).  | `Please finish the previous queue first.`                           |
| 400    | Product is out of stock (`is_available: false`).                 | `Sorry, the product {name} is currently unavailable...`             |
| 400    | Selected `variant_id` does not match or is invalid.              | `Invalid variant for product {name}`                                |
| 400    | Selected `addon` does not match or is invalid.                   | `The add-on selection is not valid for the product ${product.name}` |
| 400    | Parameter validation failed (negative quantity, incorrect UUID). | (Automatic message from Joi)                                        |
| 404    | Store not found / deleted.                                       | `Store not found`                                                   |
| 404    | Product not found / deleted.                                     | `Some products were not found`                                      |

## Additional Notes (For Frontend)

- **Payment Timer:** Use the difference between `server_now` and `expired_at` to accurately calculate the payment countdown. Do not rely on the user's local OS clock.
- **Socket.io:** Read the details in the WebSocket documentation.
