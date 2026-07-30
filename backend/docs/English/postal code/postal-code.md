# Postal Code Lookup

A proxy for postal code search to a third-party service (carikodepos.id) — used for the address auto-fill feature (province/city/district/village) in the create/edit store form.

## Endpoint

```
GET /api/stores/postal-codes

```

## Auth

Cookie-based auth (this endpoint is under `userRouter`, consistent with other endpoints that require login).

## Request

| Param        | Location | Type   | Required         | Description                                                                                                                                                                                                               |
| ------------ | -------- | ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postalCode` | query    | string | ✅ (in practice) | The postal code to search for, can be partial. ⚠️ There is no Joi validation on this endpoint yet — if `postalCode` is not sent, the request is still forwarded to the third-party API as `q=undefined`. See notes below. |

## Example Request

```bash
curl -X GET "https://example.com/api/stores/postal-codes?postalCode=56151" \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

This response directly forwards the data from carikodepos.id, with a maximum of 5 results:

```json
{
  "data": [
    {
      "province": { "id": "33", "name": "JAWA TENGAH" },
      "city": { "id": "3308", "name": "KAB. MAGELANG" },
      "district": { "id": "330802", "name": "BANDONGAN" },
      "village": { "id": "3308022003", "name": "TONOBOYO" }
    }
  ]
}
```

The field structure above is based on actual usage in the FE (`data[0].province.name`, etc.) — if carikodepos.id changes their response structure, these fields could change without notice on our end, because there is no mapping/transformation in the backend (forwarded raw).

### Error

| Status | Condition                                                              | `errors`                                                                      |
| ------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 401    | Not logged in / session expired                                        | `Unauthorized`                                                                |
| 500    | Third-party API responds with a failed status                          | `Failed to retrieve the ZIP code data`                                        |
| 500    | Failed to connect to the third-party API entirely (timeout, DNS, etc.) | Generic message from the global error handler, not the specific message above |

## Notes

- **This endpoint is purely a proxy** — there is no caching, no postal code format validation (should be 5 digits), and no custom rate limiting on our end. Every buyer request will directly trigger 1 new request to carikodepos.id, without exception (including repeated requests for the exact same postal code).
- **An empty/missing `postalCode` is not rejected upfront** — the request is still forwarded to the external API (`q=undefined` in their URL), and only fails on the carikodepos.id side if they reject it. Ideally, an empty query should be rejected early with a 400 Bad Request, before calling the external API at all.
- **This dependency on an external service** means the availability of the address auto-fill feature relies on carikodepos.id's uptime — if their service goes down, this endpoint will always return a 500, regardless of our own server's condition.
