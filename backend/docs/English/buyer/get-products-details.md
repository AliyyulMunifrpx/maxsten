# Get Product Details (Buyer)

Retrieve the complete details of a specific product. This endpoint returns the product's basic information, available variants, add-on options, stock availability, and the total number of units sold.

## Endpoint

```
GET /api/stores/:storeId/products/:productId
```

- `:storeId` is the store's `public_id`.
- `:productId` is the product's internal `id`.

## Authentication

No authentication is required (Public Endpoint). Buyers can access this endpoint without a session cookie.

## Request

| Parameter   | Location  | Type          | Required | Description                                         |
| ----------- | --------- | ------------- | -------- | --------------------------------------------------- |
| `storeId`   | URL param | string (UUID) | ✅       | The `public_id` of the store that owns the product. |
| `productId` | URL param | string (UUID) | ✅       | The internal `id` of the product to retrieve.       |

## Example Request

```bash
curl -X GET "https://example.com/api/stores/123e4567-e89b-12d3-a456-426614174000/products/123e4567-e89b-12d3-a456-426614174000"
```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Brown Sugar Milk Coffee",
    "price": 18000,
    "is_available": true,
    "total_sold": 150,
    "description": "A blend of premium espresso with authentic Indonesian palm sugar.",
    "image_url": "https://example.com/images/kopi-susu.jpg",
    "variants": [
      {
        "id": "var-uuid-123",
        "name": "Normal Ice",
        "additional_price": 0
      },
      {
        "id": "var-uuid-456",
        "name": "Less Ice",
        "additional_price": 0
      }
    ],
    "addon_groups": [
      {
        "id": "ag-uuid-789",
        "name": "Optional Toppings",
        "addons": [
          {
            "id": "addon-uuid-001",
            "name": "Extra Boba",
            "price": 3000
          },
          {
            "id": "addon-uuid-002",
            "name": "Cream Cheese",
            "price": 5000
          }
        ]
      }
    ]
  }
}
```

### Error

| Status | Condition                                                                                              | `errors`                      |
| ------ | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 400    | `storeId` or `productId` is not a valid UUID.                                                          | Validation message (from Joi) |
| 404    | The product does not exist, has been deleted (`is_delete`), or does not belong to the specified store. | `Product not found`           |
| 404    | The specified store (`storeId`) does not exist or has been deleted.                                    | `Product not found`           |

## Notes

- **Automatically Filters Deleted Data:** Variants, add-on groups, and individual add-ons marked as deleted (`is_delete: true`) are automatically excluded from the response.
- **Out of Stock Handling:** If `is_available` is `false`, the frontend **must** display an out-of-stock state (for example, disable the "Add to Cart" button or display it in a disabled style).
- **Accurate `total_sold`:** The `total_sold` value is calculated in real time from the database using **only** queues with the `"SELESAI"` (Completed) status. Queues that are unpaid, in progress, or canceled are **not** included.
- **URL Guard:** The `storeId` parameter is required as an additional security check. If a buyer attempts to access a valid `productId` using another store's `storeId`, the API will correctly return **404 Not Found**.
