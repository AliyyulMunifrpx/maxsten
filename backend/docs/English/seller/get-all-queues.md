# Get Store Queues (Live Queue)

Retrieve the store's active queues along with its current open/closed status. This endpoint is intended for the cashier/live queue dashboard.

## Endpoint

```text
GET /api/stores/:storeId/queues
```

`:storeId` is the store's `public_id`.

## Auth

Cookie-based authentication. `userId` is obtained from `req.user.id` (middleware) and is used to verify that the requested store belongs to the authenticated user.

## Request

| Parameter | Location  | Type                      | Required | Description                               |
| --------- | --------- | ------------------------- | -------- | ----------------------------------------- |
| `storeId` | URL param | string (UUID/`public_id`) | ✅       | —                                         |
| `page`    | query     | number                    | ❌       | Default: `1`. Returns 20 queues per page. |

## Example Request

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/queues?page=1" \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": {
    "storeStatus": {
      "is_open": true,
      "timezone": "Asia/Jakarta"
    },
    "currentPage": [
      {
        "id": 501,
        "queue_number": 12,
        "total_price": 15000,
        "status": "DIPROSES",
        "created_at": "2026-07-27T10:00:00.000Z",
        "expired_at": "2026-07-27T11:00:00.000Z",
        "note": null,
        "queueDetails": [
          {
            "id": 900,
            "quantity": 1,
            "selected_addons": null,
            "product": {
              "id": 1,
              "name": "Coffee",
              "price": 15000,
              "image_url": null
            },
            "variant": null
          }
        ]
      }
    ],
    "nextPage": [
      "...20 queues from the next page, or [] if there are no more..."
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 25,
      "totalPages": 2
    }
  }
}
```

## Error

| Status | Condition                                                                   | `errors`                                   |
| ------ | --------------------------------------------------------------------------- | ------------------------------------------ |
| 401    | Not logged in / session expired                                             | `Unauthorized`                             |
| 404    | `storeId` not found, or the store does not belong to the authenticated user | `Store not found or you don't have access` |

## Notes

- **Only queues with the status `BELUM_BAYAR` or `DIPROSES` are returned.** Completed (`SELESAI`) and cancelled (`DIBATALKAN`) queues are excluded. To retrieve those, use `GET /api/stores/me/history`.
- **There is no date restriction.** Queues that started the previous night and are still active (not completed or cancelled) will continue to appear, even after midnight. This is important for stores with operating hours that span across midnight (for example, 8:00 PM–4:00 AM), allowing cashiers to continue serving existing queues without interruption.
- Expired queues (for example, `BELUM_BAYAR` queues that have passed `expired_at`) are cleaned up by a separate background process (cron job running every minute), which changes their status to `DIBATALKAN` rather than hiding them in this endpoint. As a result, there may be a delay of up to approximately one minute between a queue passing `expired_at` and its status actually being updated. During that time, the queue will still appear in this endpoint.
- Each queue's `expired_at` value is a **snapshot** calculated once when the queue is created, based on the store's `payment_timeout` at that moment. It is **not** updated dynamically if the store later changes its `payment_timeout`. Therefore, older queues may have different payment deadlines from newer ones.
- Queues are sorted using **FIFO** (`created_at` ascending), so the oldest queue appears first. This ordering is suitable for cashier workflows where customers are served in sequence.
- Just like `GET /api/stores/:publicId/products`, `nextPage` contains prefetched data for the following page. The frontend can use the same caching strategy to provide instant page transitions.
- **`storeStatus.is_open` does not affect whether queues are returned.** Active queues remain visible even if the store is currently closed (either manually or outside operating hours), allowing cashiers to continue viewing and processing existing orders regardless of the store's current availability.
