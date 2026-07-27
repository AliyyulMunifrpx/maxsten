# Update Store Logo

## Usage Flow

1. **GET** `/api/stores/me` — retrieve the current `logo_url` for the preview on the edit page.
2. The user selects a new file (cropped on the FE, similar to the create flow).
3. **PATCH** `/api/stores/logo` — upload the new file.
4. The response returns the **latest complete store data** (the exact same shape as `GET /api/stores/me`) — the FE can update the preview & other data directly from the response without needing to refetch.

## Endpoint

```
PATCH /api/stores/logo

```

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `multipart/form-data`

| Field  | Type | Required | Description                                               |
| ------ | ---- | -------- | --------------------------------------------------------- |
| `logo` | file | ✅       | Mandatory field — the request is rejected (400) if empty. |

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/logo \
  -b "access_token=<token>; refresh_token=<token>" \
  -F "logo=@/path/to/new-logo.png"

```

## Response

### 200 OK

Exact same shape as `GET /api/stores/me`:

```json
{
  "data": {
    "public_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Toko Sumber Rejeki",
    "logo_url": "/uploads/logo-1721654321-987654321.png",
    "timezone": "Asia/Jakarta",
    "operational_hours": [
      {
        "day": 0,
        "is_active": true,
        "open_time": "08:00",
        "close_time": "20:00"
      }
    ],
    "is_open": true
  }
}
```

### Errors

| Status | Condition                       | `errors`                 |
| ------ | ------------------------------- | ------------------------ |
| 400    | No file sent                    | `No files were uploaded` |
| 401    | Not logged in / session expired | `Unauthorized`           |
| 404    | Store not found                 | `Store not found`        |
| 413    | File size exceeds multer limit  | —                        |

## Notes

- The old logo is automatically deleted from the server after the new logo is successfully saved — the FE does not need to do anything regarding the old file.
