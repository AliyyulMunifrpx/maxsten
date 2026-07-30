# Get Store Catalog (Buyer)

Retrieve detailed store information along with its product catalog. This is a **public endpoint** for buyers and includes **pagination**, **next-page prefetching**, and **fuzzy search** for product names.

## Endpoint

```http
GET /api/stores/:storeId/products
```

`:storeId` refers to the store's `public_id` (not the internal database `id`).

## Authentication

No authentication is required. This is a **public endpoint** and can be accessed without login cookies.

## Request

| Parameter | Location | Type          | Required | Description                                                                  |
| --------- | -------- | ------------- | -------- | ---------------------------------------------------------------------------- |
| `storeId` | URL Path | string (UUID) | ✅       | The store's `public_id`.                                                     |
| `page`    | Query    | number        | ❌       | Page number. Defaults to `1`. Each page contains up to 20 products.          |
| `keyword` | Query    | string        | ❌       | Product name search keyword. Supports typo tolerance using **Fuzzy Search**. |

## Example Request

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/products?page=1&keyword=Grilled Chicken"
```

## Response

### 200 OK

```json
{
  "data": {
    "store": {
      "name": "Warung Makan Enak",
      "description": "A cozy place to hang out",
      "logo_url": "https://example.com/logo.png",
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
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Honey Grilled Chicken Special",
        "price": 25000,
        "image_url": "https://example.com/ayam.jpg",
        "is_available": true,
        "total_sold": 15
      }
    ],
    "nextPage": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Butter Fried Chicken",
        "price": 22000,
        "image_url": null,
        "is_available": false,
        "total_sold": 8
      }
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 45,
      "totalPages": 3
    }
  }
}
```

## Error Responses

| Status | Condition                                                               | `errors`                             |
| ------ | ----------------------------------------------------------------------- | ------------------------------------ |
| 400    | `storeId` is not a valid UUID, or `page` is not a positive number.      | Validation error message (from Joi). |
| 404    | The store does not exist or has been soft-deleted (`is_delete = true`). | `Store not found`                    |

## Notes

- **`nextPage` contains prefetched data for the following page.** For example, when requesting `page=1`, the `nextPage` field contains the products for page 2. This allows the frontend to instantly display the next page when the user clicks **Next** or scrolls down (infinite scrolling) without waiting for another API request.
- If `nextPage` is an empty array (`[]`), the requested page is already the last available page.
- The store's `is_open` status is **calculated in real time** for every request based on its configured `operational_hours` or any manual override applied by the system.
- When the `keyword` query parameter is provided, the API performs a **Fuzzy Search** (powered by Fuse.js), allowing minor typos. For example, searching for `"Ayan Bkar"` can still match `"Ayam Bakar"`.
- If a product has `is_available: false`, the frontend should display it as **Out of Stock** and disable the purchase button.
- The `total_sold` field is **not stored in the database**. It is calculated in real time for each request by summing the `quantity` of all completed (`SELESAI`) orders associated with that product.
