# Get Store Catalog (Buyer)

Retrieve detailed store information along with its product list. This endpoint is public (for buyers) and comes with built-in pagination, next-page prefetching, and a typo-tolerant product search feature (_Fuzzy Search_).

## Endpoint

```text
GET /api/stores/:storeId/products

```

`:storeId` is the `public_id` of the store (not the internal database `id`).

## Auth

No authentication required (Public Endpoint). Can be accessed by anyone without a login cookie.

## Request

| Param     | Location  | Type          | Required | Description                                                                                         |
| --------- | --------- | ------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `storeId` | URL param | string (UUID) | ✅       | The `public_id` of the store                                                                        |
| `page`    | query     | number        | ❌       | Default is `1`. 20 products per page                                                                |
| `keyword` | query     | string        | ❌       | If provided, searches using **Fuzzy Search** (typo-tolerant) on the product name — see notes below. |

## Example Request

```bash
# Without search
curl "https://example.com/api/stores/str_8kd93jf82j/products?page=1"

# With search
curl "https://example.com/api/stores/str_8kd93jf82j/products?keyword=ayam%20bakar"

```

## Response

### 200 OK

```json
{
  "data": {
    "store": {
      "name": "Warung Makan Enak",
      "description": "Testing API Pembeli",
      "logo_url": "/uploads/logo-123.png",
      "is_open": true,
      "street_address": "Jl. Pembeli 1",
      "village": "Desa",
      "district": "Kecamatan",
      "city": "Kota",
      "province": "Provinsi",
      "postal_code": "12345",
      "latitude": -7.0,
      "longitude": 110.0
    },
    "currentPage": [
      {
        "id": "prod-uuid-1",
        "name": "Ayam Bakar Madu Spesial",
        "description": "ayam bakar enak",
        "price": 25000,
        "image_url": null,
        "is_available": true,
        "total_sold": 3
      }
    ],
    "nextPage": [
      "...next 20 products of the following page, or [] if exhausted..."
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 22,
      "totalPages": 2
    }
  }
}
```

If `keyword` is provided but no sufficiently similar or relevant products are found, `currentPage`/`nextPage` will return an empty array `[]`.

### Error

| Status | Condition                                                                | `errors`           |
| ------ | ------------------------------------------------------------------------ | ------------------ |
| 400    | `storeId` is not a valid UUID format, or `page` is not a positive number | Validation message |
| 404    | Store not found / deleted                                                | `Store not found`  |

## Notes

- **The `store` object in this response is concise**, specifically tailored for public display — it excludes `payment_timeout`, `manual_status`, raw `operational_hours`, or internal `id`s. `is_open` is automatically calculated (using the same logic as `GET /api/stores/me`), so the frontend can use it directly without re-calculating.
- **`is_available` is included for every product** — the frontend can highlight out-of-stock products (`is_available: false`) directly in the catalog without needing extra requests.
- **Search (`keyword`) uses Fuzzy Search (Typo-Tolerant)** — the search matches text similarity on product names. If there is a minor typo (e.g., typing "aym bakar" to find "Ayam Bakar"), the system can still find it. If the similarity score is too low, the result will be empty (this does not indicate a system error).
- **If `keyword` is provided, pagination behavior changes** — the system retrieves all matching results from the fuzzy algorithm, then manually chunks them in memory per page (20 items/page). `totalRows` will represent the total number of products that _match_ the search keyword.
- `total_sold` per product is calculated exclusively from transactions with the `SELESAI` (completed) status — just like other product endpoints, cancelled transactions are not included.
- Just like `GET /api/stores/:publicId/products`, `nextPage` contains prefetch data to load the next page faster on the frontend.
