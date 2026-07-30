# Update Operational Hours

## Usage Flow

1. **GET** `/api/stores/me` — retrieve the current schedule (the `operational_hours` field) to prefill the form.
2. The user changes the hours/active toggle per day.
3. **PATCH** `/api/stores/me/operational-hours` — send the days to be updated.
4. The response returns the latest complete schedule — the FE can sync directly from the response without needing to refetch.

## Endpoint

```
PATCH /api/stores/me/operational-hours

```


## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

```json
{
  "operational_hours": [
    {
      "day": 1,
      "open_time": "09:00",
      "close_time": "17:00",
      "is_active": true
    },
    { "day": 0, "open_time": null, "close_time": null, "is_active": false }
  ]
}
```

| Field               | Type          | Required | Description                                                                               |
| ------------------- | ------------- | -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `operational_hours` | array<object> | ✅       | Must not be empty/`null`. Maximum of 7 entries (1 per day).                               |
| `.day`              | number        | ✅       | `0`–`6` (`0` = Sunday ... `6` = Saturday). Cannot contain duplicates in a single request. |
| `.open_time`        | string        | null     | conditional                                                                               | Format `HH:mm`, zero-padded, hours `00`–`23`, minutes `00`–`59` (`8:00` is rejected, `24:00` is rejected, `12:60` is rejected). |
| `.close_time`       | string        | null     | conditional                                                                               | Same format rules as `open_time`.                                                                                               |
| `.is_active`        | boolean       | ✅       | Open/closed status for that day.                                                          |

**Only the sent days are updated** — other days not included in the array will keep their old values (partial update, not a full replace).

> ⚠️ **To mark a day as closed, send `open_time: null, close_time: null`.** Do not send `open_time`/`close_time` with the same value (e.g., `"00:00"`/`"00:00"`) as a placeholder — it will be **rejected** (400) because the system considers identical `open_time` and `close_time` as an invalid request, regardless of `is_active`.

Schedules crossing midnight (overnight) are allowed, e.g., `open_time: "20:00"`, `close_time: "04:00"`.

## Request Example

```bash
curl -X PATCH https://example.com/api/stores/me/operational-hours \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"operational_hours":[{"day":0,"open_time":null,"close_time":null,"is_active":false}]}'

```

## Response

### 200 OK

```json
{
  "data": [
    { "day": 0, "open_time": null, "close_time": null, "is_active": false },
    { "day": 1, "open_time": "09:00", "close_time": "17:00", "is_active": true }
  ]
}
```

### Errors

| Status | Condition                                                                      | `errors`                                                |
| ------ | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 400    | `operational_hours` is missing or `null`                                       | validation message                                      |
| 400    | `day` is out of the `0`–`6` range, or more than 7 entries are sent             | validation message                                      |
| 400    | There are duplicate days in a single request                                   | `Duplicate schedule for day X is not allowed`           |
| 400    | `open_time` is identical to `close_time` (and both are not `null`)             | `open_time and close_time cannot be the same for day X` |
| 400    | Invalid time format (not `HH:mm`, hours/minutes out of range, not zero-padded) | validation message                                      |
| 401    | Not logged in / session expired                                                | `Unauthorized`                                          |
| 404    | User does not have a store                                                     | `Store not found.`                                      |

## Notes

- Validation runs **before** any changes are saved — if even one entry in the request is invalid, **the entire request is rejected and no days are updated at all** (it won't just ignore the invalid entry).
