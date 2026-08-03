# AI Product Description Generator

Generates 2 automatic product description choices based on the product name, each with an appeal score.

## Endpoint

```
POST /api/ai/descriptions

```

> ⚠️ **The response can take up to ~30 seconds** — this endpoint calls a third-party AI service. Display a clear loading state, especially since this is likely called in the middle of filling out a form (creating/editing a product) rather than on a dedicated page.

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware).

## Request

Content-Type: `application/json`

| Field          | Type   | Required | Description                                                  |
| -------------- | ------ | -------- | ------------------------------------------------------------ |
| `product_name` | string | ✅       | The name of the product whose description is to be generated |

## Example Request

```bash
curl -X POST https://example.com/api/ai/descriptions \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"product_name": "Nasi Goreng Spesial"}'

```

## Response

### 200 OK

```json
{
  "data": {
    "recommendations": [
      {
        "text": "Nasi goreng dengan bumbu rempah pilihan, dilengkapi telur mata sapi dan ayam suwir gurih.",
        "score": 92
      },
      {
        "text": "Perpaduan nasi goreng klasik dengan cita rasa rumahan, disajikan hangat dengan pelengkap favorit.",
        "score": 87
      }
    ]
  }
}
```

`recommendations` always contains at least 1 choice, each item has `text` (description) and `score` (1–100, indicating how strongly the description is estimated to attract buyers).

### Error

| Status | Condition                                                                                                              | `errors`                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 401    | Not logged in / session expired                                                                                        | `Unauthorized`                                                           |
| 404    | User does not have a store yet                                                                                         | `Store not found`                                                        |
| 500    | Failed to get a response from AI (~30 second timeout, AI service down, or response does not match the expected format) | `Failed to generate an automatic product description. Please try again.` |

## Notes

- This endpoint **only generates draft text** and does not save anything directly to the product — the user must choose one of the results and fill it into the `description` field themselves when creating/updating a product (`POST /api/stores/products` / `PATCH /api/stores/products/:productId`).
- The `score` is an estimate from the AI, not a result of actual testing with buyers — it is best displayed as a selection guide (e.g., ordering/badge) rather than claimed as a precise figure to the user.
