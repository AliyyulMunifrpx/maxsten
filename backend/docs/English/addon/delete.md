# Delete Add-on Group

Soft-delete an add-on group along with all add-ons it contains.

## Endpoint

```text
DELETE /api/stores/addon-groups/:addonGroupId
```

## Auth

Cookie-based authentication. The `userId` is obtained from `req.user.id` (middleware).

## Request

No request body is required. Only the `addonGroupId` URL parameter and a valid authentication cookie are needed.

## Example Request

```bash
curl -X DELETE https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>"
```

## Response

### 200 OK

```json
{
  "data": "OK"
}
```

### Errors

| Status | Condition                                                                                                    | `errors`                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 400    | `addonGroupId` is not a valid UUID                                                                           | Validation error message                                                                      |
| 401    | Not authenticated or session has expired                                                                     | `Unauthorized`                                                                                |
| 404    | The authenticated user does not have a store                                                                 | `Store not found`                                                                             |
| 404    | The add-on group does not exist, has been soft-deleted, or does not belong to the authenticated user's store | `Addon group not found`                                                                       |
| 409    | The add-on group is currently used by a product in an active queue (`BELUM_BAYAR` or `DIPROSES`)             | `Cannot delete this add-on group because a product using it is currently in an active queue.` |

## Notes

- **An add-on group cannot be deleted while it is being used by a product in an active queue.** This follows the same rule as `PATCH /api/stores/addon-groups/:addonGroupId` (Edit Add-on Group). The related queue(s) must be completed or canceled before the group can be deleted.
- **All add-ons within the group are automatically soft-deleted** together with the group. There is no need to call a separate endpoint to delete individual add-ons.
- **Products that are still associated with the deleted add-on group do not automatically lose the relationship.** The add-on group simply no longer appears in `GET /api/stores/addon-groups` or `GET /api/products/:productId` because those endpoints only return records with `is_delete: false`. Existing transaction history remains intact because the selected add-ons are stored as a snapshot in `queueDetails`, so deleting the add-on group does not affect past orders.
