# Get All Products

Retrieve all products from a single store belonging to the currently logged-in user, complete with pagination and next-page prefetching.

## Endpoint

```
GET /api/stores/:publicId/products

```

`:publicId` is the store's `public_id` (not the internal product or store `id`).

## Auth

Cookie-based auth. `userId` from `req.user.id` (middleware) — used to ensure the requested store actually belongs to the logged-in user.

## Request

| Param      | Location  | Type          | Required | Description                       |
| ---------- | --------- | ------------- | -------- | --------------------------------- |
| `publicId` | URL param | string (UUID) | ✅       | The store's `public_id`           |
| `page`     | query     | number        | ❌       | Default `1`. 20 products per page |

## Request Example

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/products?page=1" \
  -b "access_token=<token>; refresh_token=<token>"

```

## Response

### 200 OK

```json
{
  "data": {
    "currentPage": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Nasi Goreng Spesial",
        "description": "Nasi goreng dengan telur dan ayam",
        "price": 20000,
        "image_url": "/uploads/product-1234567890.png",
        "is_available": true,
        "productAddonGroups": [
          {
            "addon_group": {
              "id": "550e8400-e29b-41d4-a716-446655440001",
              "name": "Level Pedas",
              "addons": [{ "id": 1, "name": "Tidak Pedas", "price": 0 }]
            }
          }
        ],
        "variants": [{ "id": 1, "name": "Pedas", "additional_price": 2000 }],
        "total_sold": 12
      }
    ],
    "nextPage": [{ "id": "...", "name": "Next page product", "total_sold": 3 }],
    "pagination": {
      "currentPage": 1,
      "limit": 20,
      "totalRows": 45,
      "totalPages": 3
    }
  }
}
```

### Errors

| Status | Condition                                                                 | `errors`           |
| ------ | ------------------------------------------------------------------------- | ------------------ |
| 400    | `publicId` is not a valid UUID format, or `page` is not a positive number | validation message |
| 401    | Not logged in / session expired                                           | `Unauthorized`     |
| 404    | Store not found, or found but does not belong to the logged-in user       | `Store not found`  |

## Notes

- `nextPage` contains prefetch data for the subsequent page (e.g., if requesting `page=1`, `nextPage` will contain the data for page 2). The goal is for the FE to instantly display the next page as soon as the user clicks "Next". In the background, the FE can still call this endpoint again with the new page to get updated data along with the next page's prefetch.
- If `nextPage` returns an empty array (`[]`), it means the requested `currentPage` is the final page.
- `total_sold` on each product is **not** a database column — it is calculated in real-time per request, representing the total `quantity` from all transactions with the `SELESAI` (COMPLETED) status that contain this product, exactly like in `GET /api/product/:productId`.
- Because this endpoint always filters by the logged-in `user_id`, the `publicId` sent must belong to the user's own store.
- Deleted variants and add-on groups (`is_delete: true`) are automatically filtered out from every product.
