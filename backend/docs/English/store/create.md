# Create Store

Creates a new store for the currently logged-in user.

## Endpoint

```
POST /api/stores

```

## Auth

Requires authentication. Cookie-based (`access_token`/`refresh_token`, `httpOnly`). `userId` is retrieved from middleware, not from the request body.

## Request

Content-Type: `multipart/form-data` (due to the `logo` upload). Can also be sent as `application/json` if no logo is included.

| Field               | Type          | Required | Description                                                                                                              |
| ------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- | --------------- |
| `name`              | string        | ✅       | Store name                                                                                                               |
| `description`       | string        | ❌       | Store description                                                                                                        |
| `street_address`    | string        | ✅       | Street name / detailed address                                                                                           |
| `village`           | string        | ✅       | Village / sub-district                                                                                                   |
| `district`          | string        | ✅       | District                                                                                                                 |
| `city`              | string        | ✅       | City / Regency                                                                                                           |
| `province`          | string        | ✅       | Province                                                                                                                 |
| `postal_code`       | string        | ✅       | Postal code                                                                                                              |
| `latitude`          | number        | ✅       | Populated from the `react-leaflet` picker on the FE                                                                      |
| `longitude`         | number        | ✅       | Populated from the `react-leaflet` picker on the FE                                                                      |
| `logo`              | file          | ❌       | Field name must be `logo`. If omitted, `logo_url` is saved as `null`                                                     |
| `timezone`          | string        | ✅       | `Asia/Jakarta`                                                                                                           | `Asia/Makassar` | `Asia/Jayapura` |
| `operational_hours` | array<object> | ❌       | See structure below. If omitted (or empty array), the system automatically defaults to 7 days, all open from 08:00–20:00 |

### `operational_hours` Structure

An array containing objects for each day. Numeric `day`: `0` = Sunday, `1` = Monday, ..., `6` = Saturday.

```json
[
  { "day": 1, "open_time": "08:00", "close_time": "20:00", "is_active": true },
  { "day": 2, "open_time": "08:00", "close_time": "20:00", "is_active": true },
  { "day": 0, "open_time": "08:00", "close_time": "20:00", "is_active": false }
]
```

Because it is sent via `multipart/form-data`, this field must be sent as a **JSON string**, not a direct array:

```
operational_hours: '[{"day":1,"open_time":"08:00","close_time":"20:00","is_active":true}, ...]'

```

## Request Examples

**With logo (multipart):**

```bash
curl -X POST https://example.com/api/stores \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "name=Toko Sumber Rejeki" \
  -F "description=Toko kelontong harian" \
  -F "street_address=Jl. Mawar No. 12" \
  -F "village=Sukamaju" \
  -F "district=Cibinong" \
  -F "city=Bogor" \
  -F "province=Jawa Barat" \
  -F "postal_code=16916" \
  -F "latitude=-6.481" \
  -F "longitude=106.853" \
  -F "timezone=Asia/Jakarta" \
  -F 'operational_hours=[{"day":1,"open_time":"08:00","close_time":"20:00","is_active":true}]' \
  -F "logo=@/path/to/logo.png"

```

**Without logo (standard JSON):**

```bash
curl -X POST https://example.com/api/stores \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Toko Sumber Rejeki",
    "street_address": "Jl. Mawar No. 12",
    "village": "Sukamaju",
    "district": "Cibinong",
    "city": "Bogor",
    "province": "Jawa Barat",
    "postal_code": "16916",
    "latitude": -6.481,
    "longitude": 106.853,
    "timezone": "Asia/Jakarta"
  }'

```

## Response

### 201 Created

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

### Errors

| Status | Condition                                                     | `errors`                                                    |
| ------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| 400    | Validation failed (required field empty / invalid format)     | field-specific message                                      |
| 400    | `operational_hours` is sent as a string but is not valid JSON | `'operational_hours' must be a valid JSON array of objects` |
| 400    | User already has an active store                              | `You already have a store`                                  |
| 401    | Not logged in / session expired                               | `Unauthorized`                                              |
| 413    | `logo` file size is too large                                 | —                                                           |
| 500    | Server/database error                                         | —                                                           |

```json
{
  "errors": "You already have a store"
}
```

## Notes

- `latitude`/`longitude` are populated from an interactive map (`react-leaflet`) on the FE side, not typed manually.
- `logo_url` is stored in the database as a relative path `/uploads/${file.filename}`, not an absolute URL.
- The `public_id` in the response is used as the store's public identifier (not the internal/DB `id`).
- If the FE does not send `operational_hours` at all, it's fine — the backend automatically fills in the default 08:00–20:00 every day. The FE can still send a custom schedule from the start if the user configures it in the create form.
- This endpoint rejects attempts to create a second store even if sent simultaneously (concurrent requests) — only one will succeed, the rest will receive a `400` error.
