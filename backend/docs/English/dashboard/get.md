# Store Dashboard

A quick summary of store conditions for the seller's main dashboard page — open/closed status, latest products & add-ons, oldest waiting queues, and today's metrics (compared to yesterday at the exact same time).

## Endpoint

```
GET /api/stores/dashboard

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — the dashboard is always for the logged-in user's store, it does not accept any external store parameters.

## Request

No parameters — just a valid auth cookie.

## Example Request

```bash
curl -X GET https://example.com/api/stores/dashboard \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": {
    "store": {
      "public_id": "8kd93jf82j",
      "name": "Warung Sumber Rejeki",
      "description": "Daily grocery store",
      "logo_url": "/uploads/logo-123.png",
      "is_open": true
    },
    "lists": {
      "latest_products": [
        {
          "id": "prod-uuid-1",
          "name": "Iced Tea",
          "price": 5000,
          "image_url": null,
          "is_available": true
        }
      ],
      "latest_addons": [
        {
          "id": 1,
          "name": "Extra Sugar",
          "price": 1000,
          "addon_group_id": "addon-group-uuid-1"
        }
      ],
      "oldest_active_queues": [
        {
          "id": 42,
          "queue_number": 3,
          "status": "BELUM_BAYAR",
          "total_price": 15000,
          "created_at": "2026-07-27T10:00:00.000Z"
        }
      ]
    },
    "today": {
      "omzet": { "value": 150000, "trend": 12.4 },
      "pesanan_selesai": { "value": 8, "trend": 33.3 },
      "pesanan_batal": { "value": 1, "trend": -50.0 },
      "aov": { "value": 18750, "trend": -5.2 },
      "peak_hour": "12:00 - 13:00",
      "hourly_traffic": [
        0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 2, 3, 5, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  }
}
```

### Error

| Status | Condition                       | `errors`          |
| ------ | ------------------------------- | ----------------- |
| 401    | Not logged in / session expired | `Unauthorized`    |
| 404    | User does not have a store yet  | `Store not found` |

## Notes

- **`lists` are always a maximum of 5 items**, cannot be customized/paginated — this is purely a summary for the dashboard landing page, not a replacement for `GET /api/stores/all-products/:publicId` or `GET /api/stores/queues/:storeId` which have complete data and pagination.
- **`latest_addons[].addon_group_id` is included** so the FE (Front-End) can immediately know which add-on group the add-on belongs to, without needing an additional request (e.g., to create a "view this add-on group" link).
- **`oldest_active_queues` only contains `BELUM_BAYAR` (UNPAID) / `DIPROSES` (PROCESSING) statuses**, sorted by the **longest waiting time** — so the cashier can immediately see which queue most urgently needs to be handled.
- **All metrics in `today` are compared with YESTERDAY, at the exact same hour and minute** — not compared to last month. If it is currently 14:30, "yesterday" used as a comparison is also only calculated up to 14:30 yesterday, not a full 24-hour day yesterday — ensuring the comparison is fair (the compared time ranges are the exact same length).
- **`aov.trend` is calculated from the unrounded revenue/order ratio**, and only the displayed `aov.value` is rounded — so the percentage trend is not biased due to double rounding.
- `peak_hour` and `hourly_traffic` are only calculated from **today's** transactions with a `SELESAI` (COMPLETED) status (canceled transactions are not counted). Because this is data for the ongoing day, the hours **after** the current time automatically have a value of `0` in `hourly_traffic` — that is normal (it has not happened yet), not an indication that it is quiet. The FE should ideally display the upcoming hours as "no data yet", rather than "quiet".
