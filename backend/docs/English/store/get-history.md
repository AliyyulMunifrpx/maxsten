# Store History & Analytics

Retrieve the store's sales summary, charts, transaction history, and top-selling products for a specific month.

## Endpoint

```
GET /api/stores/history

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Query parameters, all optional:

| Param      | Type   | Default                             | Description                                                      |
| ---------- | ------ | ----------------------------------- | ---------------------------------------------------------------- | ----------- | -------------------------------------------- |
| `month`    | number | current month (in store's timezone) | `1`–`12`                                                         |
| `year`     | number | current year (in store's timezone)  | —                                                                |
| `status`   | string | `"ALL"`                             | `"ALL"`                                                          | `"SELESAI"` | `"DIBATALKAN"` — filters the `history` table |
| `page`     | number | `1`                                 | Page number for `history`                                        |
| `limit`    | number | `10`                                | Number of rows per page for `history`, maximum `100`             |
| `topPage`  | number | `1`                                 | Page number for `topSelling.rankings`                            |
| `topLimit` | number | `10`                                | Number of rows per page for `topSelling.rankings`, maximum `100` |

> ⚠️ If `page` is sent as a non-numeric string (e.g., `"abc"`), the request **does not error** — it automatically falls back to `page: 1`. However, if sent as a negative number (e.g., `-5`), the request is **rejected (400)**. This behavior is asymmetrical — the FE should always send valid numbers and not rely on this fallback.

## Request Example

```bash
curl -G https://example.com/api/stores/history \
  -b "access_token=<token>; refresh_token=<token>" \
  -d month=7 -d year=2026 -d status=SELESAI -d page=1 -d limit=10

```

## Response

### 200 OK

```json
{
  "data": {
    "meta": {
      "selectedMonth": 7,
      "selectedYear": 2026,
      "currentMonth": 7,
      "currentYear": 2026,
      "isCurrentMonth": true,
      "storeCreatedAt": "2026-01-10T02:00:00.000Z",
      "timezone": "Asia/Jakarta"
    },
    "summary": {
      "totalOmzet": 1500000,
      "totalPesanan": 42,
      "totalBatal": 3,
      "cancellationRate": 6.67,
      "averageOrderValue": 35714,
      "averageWaitTimeMinutes": 12,
      "trend": {
        "omzet": 15.2,
        "pesanan": 8.0,
        "batal": -20.0
      },
      "peakTraffic": {
        "peakHour": "12:00 - 13:00",
        "peakDay": "Sabtu"
      }
    },
    "charts": {
      "revenueDaily": [{ "label": "01", "omzet": 50000, "pesanan": 2 }],
      "trafficHourlyByDate": {
        "01": [0, 0, 0, 1, 2, 0]
      },
      "trafficDaily": [{ "label": "Minggu", "pesanan": 5 }]
    },
    "pagination": {
      "totalRows": 42,
      "totalPages": 5,
      "currentPage": 1,
      "limit": 10
    },
    "history": [
      {
        "id": 101,
        "status": "SELESAI",
        "total_price": 50000,
        "created_at": "2026-07-05T05:00:00.000Z",
        "completed_at": "2026-07-05T05:15:00.000Z",
        "queueDetails": [
          {
            "product": { "id": 1, "name": "Es Teh" },
            "variant": null,
            "quantity": 2
          }
        ]
      }
    ],
    "topSelling": {
      "rankings": [
        { "rank": 1, "product_id": 1, "name": "Es Teh", "totalQuantity": 40 }
      ],
      "pagination": {
        "totalRows": 12,
        "totalPages": 2,
        "currentPage": 1,
        "limit": 10
      }
    },
    "topAddons": [{ "name": "Less Ice", "totalQuantity": 18 }]
  }
}
```

### Errors

| Status | Condition                                                             | `errors`                                                             |
| ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 400    | Invalid `month`/`year` (`month` is outside `1`–`12`, or not a number) | `Invalid month/year parameters`                                      |
| 400    | `status` is not one of `ALL`/`SELESAI`/`DIBATALKAN`                   | `Invalid status parameter. Allowed values: ALL, SELESAI, DIBATALKAN` |
| 400    | `page`/`limit`/`topPage`/`topLimit` are not positive integers         | `page, limit, topPage, and topLimit must be positive integers`       |
| 400    | `limit`/`topLimit` exceed `100`                                       | `limit and topLimit must not exceed 100`                             |
| 401    | Not logged in / session expired                                       | `Unauthorized`                                                       |
| 404    | User does not have a store                                            | `Store not found`                                                    |

## Notes

- **`history` and `topSelling.rankings` have their own separate pagination** — do not use the `pagination` object in the root to page through `topSelling`, as it is exclusively for `history`. Use `topSelling.pagination` instead.
- If `isCurrentMonth: true` (querying the ongoing month), the calculated data range only goes up to the **current time**, not the end of the month — so the numbers in `summary`/`charts` will keep changing/increasing as long as the month is ongoing; this is not a final snapshot. Past months (`isCurrentMonth: false`) have final data that will no longer change.
- The `trend` inside `summary` compares the selected period with the previous period (last month) — if `isCurrentMonth: true`, the comparison is fair (last month's data is cut off at the exact same date and time as today), rather than comparing against the entire full past month.
- `peakTraffic` (busiest hour & day) is calculated **only from transactions with the `SELESAI` status**; canceled transactions are not counted as traffic.
- All date/time calculations follow the store's timezone (found in `meta.timezone`), not the server's timezone or the user's browser timezone.
