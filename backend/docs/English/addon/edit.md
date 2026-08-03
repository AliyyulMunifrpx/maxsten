# Edit Addon Group

Update the add-on group name along with its list of add-ons as a whole (_full replace_).

## Endpoint

```text
PATCH /api/stores/addon-groups/:addonGroupId

```

## Auth

Cookie-based auth. `userId` is obtained from `req.user.id` (middleware).

## Request

**Content-Type:** `application/json`

| Field            | Type   | Required | Description                                                                                                   |
| ---------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| `name`           | string | ✅       | Maximum 100 characters. Stored entirely in lowercase after being trimmed. Must be unique among active groups. |
| `addons`         | array  | ✅       | Minimum 1 item. See the _full-replace_ rules below.                                                           |
| `addons[].id`    | string | ❌       | Include to _update_ an existing add-on. Leave empty to create a new add-on.                                   |
| `addons[].name`  | string | ✅       | Maximum 100 characters. Must be unique within this group. Stored entirely in lowercase after being trimmed.   |
| `addons[].price` | number | ✅       | Cannot be negative (can be `0`).                                                                              |

### `addons` Rules (Full Replace based on `id`)

- **Update:** Items **with an `id**` matching an existing add-on in this group will be updated (`name`, `price`).
- **Create:** Items **without an `id**` are treated as new add-ons, automatically created.
- **Delete:** Old add-ons **not included** in this array are automatically deleted (_soft-delete_).
- **⚠️ Prevent Delete & Recreate:** You are not allowed to send a new add-on (without an `id`) with the exact same name as an old add-on that is being excluded (_deleted_). If you want to update it, use that add-on's `id`. (If violated, the API will return a 400 error).
- **Invalid ID:** Sending an `id` that does not exist or does not belong to this group will cause the entire request to be rejected (400), with no changes saved.

## Example Request

```bash
curl -X PATCH https://example.com/api/stores/addon-groups/550e8400-e29b-41d4-a716-446655440000 \
  -b "access_token=<token>; refresh_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Topping Minuman",
    "addons": [
      { "id": "addon-uuid-1", "name": "Boba", "price": 3500 },
      { "name": "Jelly", "price": 2000 }
    ]
  }'

```

## Response

### 200 OK

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "topping minuman",
    "created_at": "2026-07-01T00:00:00.000Z",
    "addons": [
      {
        "id": "addon-uuid-1",
        "name": "boba",
        "price": 3500,
        "created_at": "2026-07-01T00:00:00.000Z"
      },
      {
        "id": "addon-uuid-2",
        "name": "jelly",
        "price": 2000,
        "created_at": "2026-08-03T10:00:00.000Z"
      }
    ]
  }
}
```

### Error

| Status | Condition                                                                                                                                | `errors`                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 400    | Payload validation failed (`addons` empty, `price` negative, etc.).                                                                      | _Joi message_                                                                               |
| 400    | Duplicate add-on names exist within the `addons` array sent in the same request.                                                         | `Add-on names within a group must be unique`                                                |
| 400    | One or more `addons[].id` not found or do not belong to this group.                                                                      | `Invalid add-on`                                                                            |
| 400    | The name of a new add-on (without an ID) clashes with an old add-on trying to be _soft-deleted_ (because it was omitted from the array). | `Add-on name already used by an existing add-on in this group`                              |
| 401    | Not logged in / session expired.                                                                                                         | `Unauthorized`                                                                              |
| 404    | User does not have a store.                                                                                                              | `Store not found`                                                                           |
| 404    | `addonGroupId` not found / already deleted / does not belong to this store.                                                              | `Addon Group not found`                                                                     |
| 409    | This add-on group is currently being used by a product in an active queue (`BELUM_BAYAR` / `DIPROSES`).                                  | `Cannot edit this add-on group because a product using it is currently in an active queue.` |
| 409    | The newly added add-on name is already used by another active add-on in this group in the database.                                      | `An add-on with this name already exists in this group`                                     |
| 409    | The new group name is already used by another active add-on group in the same store.                                                     | `An add-on group with this name already exists`                                             |

## Additional Notes

- **Active Queue Block:** Add-on groups currently used by products in an active queue **cannot be edited at all**. The entire edit process will be rejected if even 1 user product is currently being processed in a queue (`BELUM_BAYAR` or `DIPROSES`). Complete or cancel the respective queue first.
- **Casing Format:** Group `name` and `addons[].name` are stored entirely in _lowercase_. If the buyer/seller interface requires nicely capitalized text (e.g., "Topping Minuman"), the Frontend needs to apply _title-case_ independently (e.g., `text-transform: capitalize` in CSS).
