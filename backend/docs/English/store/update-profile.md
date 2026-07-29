# Update Store Profile

## Usage Flow

1. **GET** `/api/stores/me` — retrieve the current store data to prefill the edit form.
2. The user changes the fields to be edited.
3. **PATCH** `/api/stores` — send the updated fields.
4. The response returns the **latest complete store data** (the exact same shape as `GET /api/stores/me`, including the recalculated `is_open`).

## Endpoint

```
PATCH /api/stores

```

> ⚠️ The path is `/api/stores` (not `/api/stores/me`). If you previously called `/api/stores/me` for updates, please adjust it — `/api/stores/me` is exclusively for `GET`.

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field             | Type   | Required | Description                                                                           |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `name`            | string | ❌       | Store name                                                                            |
| `description`     | string | ❌       | Store description                                                                     |
| `street_address`  | string | ❌       | Street name / detailed address                                                        |
| `village`         | string | ❌       | Village / sub-district                                                                |
| `district`        | string | ❌       | District                                                                              |
| `city`            | string | ❌       | City / regency                                                                        |
| `province`        | string | ❌       | Province                                                                              |
| `postal_code`     | string | ❌       | Postal code                                                                           |
| `latitude`        | number | ❌       | Store map coordinate                                                                  |
| `longitude`       | number | ❌       | Store map coordinate                                                                  |
| `timezone`        | string | ❌       | Must be a valid IANA timezone, e.g., `Asia/Jakarta`, `Asia/Makassar`, `Asia/Jayapura` |
| `payment_timeout` | number | ❌       | In minutes                                                                            |

Fields that are not sent will keep their old values (partial update).

> `logo_url` and `operational_hours` are **not** updated via this endpoint — use `PATCH /api/stores/logo` and `PATCH /api/stores/operational-hours` respectively.

## Request Example

```bash
curl -X PATCH https://example.com/api/stores \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Toko Sumber Rejeki Baru", "payment_timeout": 20}'

```

## Response

### 200 OK

Exact same shape as `GET /api/stores/me`:

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Toko Sumber Rejeki Baru",
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
        "is_active": true,
        "open_time": "08:00",
        "close_time": "20:00"
      }
    ],
    "payment_timeout": 20,
    "is_open": true
  }
}
```

### Errors

| Status | Condition                               | `errors`               |
| ------ | --------------------------------------- | ---------------------- |
| 400    | Validation failed                       | field-specific message |
| 400    | `timezone` is not a valid IANA timezone | `Invalid timezone`     |
| 401    | Not logged in / session expired         | `Unauthorized`         |
| 404    | Store not found                         | `Store not found.`     |

## Notes

- If the sent `timezone` is invalid, the request is rejected (400) and the store's `timezone` **does not change** — there is no condition where the store is saved with an incorrect timezone.

- `payment_timeout` determines the `expired_at` for new queues — each `BELUM_BAYAR` queue is assigned an `expired_at` that is calculated once upon creation (creation time + the `payment_timeout` in effect at that time). If the store modifies the `payment_timeout`, the change only applies to new queues created afterward — existing queues will retain their original deadlines and are not affected retroactively.
