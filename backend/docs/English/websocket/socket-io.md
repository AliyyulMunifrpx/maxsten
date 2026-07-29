# WebSocket Events

Documentation for the real-time Socket.IO events used by the system outside of the standard REST API.

## Connection & Authentication

Connect to the same Socket.IO server as the REST API base URL. Authentication is performed automatically **once when the connection is established** using the same cookies as the REST API (not through event payloads).

| Role                      | Cookie Used    | If Missing                                                           |
| ------------------------- | -------------- | -------------------------------------------------------------------- |
| Seller (authenticated)    | `access_token` | Falls back to guest authentication                                   |
| Buyer (no login required) | `guest_id`     | Connection is rejected with `"Unauthorized: Missing guest identity"` |

- `guest_id` is automatically obtained from the `POST` Create Queue response. If the buyer does not already have one, the server generates it and stores it as an `HttpOnly` cookie. The frontend does **not** need to generate its own `guest_id`.
- If authentication fails, the client will receive a `connect_error` event containing the error message.
- Once connected successfully, the authenticated identity is automatically available on the server as `socket.user`. The frontend does not need to send identity information with every event.

## Events Sent from CLIENT → SERVER

| Event              | Used By | Payload            | Effect                                                                                                                                                                                                           |
| ------------------ | ------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JOIN_STORE_ROOM`  | Seller  | — (no payload)     | Joins the seller's own `TOKO_<store.id>` room so they can receive real-time notifications for new queues and queue status updates on the dashboard.                                                              |
| `JOIN_QUEUE_ROOM`  | Buyer   | `queueId` (number) | Joins the `ANTREAN_<queueId>` room **only if** the queue belongs to the currently authenticated `guest_id`. Otherwise, the server responds with `ROOM_ERROR` (see below), and the socket will not join the room. |
| `LEAVE_QUEUE_ROOM` | Buyer   | `queueId` (number) | Leaves the `ANTREAN_<queueId>` room. Call this when the buyer leaves the order status page so they no longer receive unnecessary updates.                                                                        |

## Events Sent from SERVER → CLIENT

| Event            | Target Room                                        | Triggered By                                                                                                                                 | Payload                                                                                                                                                    |
| ---------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEW_QUEUE`      | `TOKO_<store.id>`                                  | A buyer successfully creates a new queue                                                                                                     | The complete queue object. **The `store` field is not included at all**—it is removed before the event is emitted, not merely stripped of some properties. |
| `STATUS_UPDATED` | `ANTREAN_<queueId>` **and** `TOKO_<store.id>`      | Queue status changes initiated by the seller, buyer, or the system (automatic cancellation via cron job)                                     | `{ id, status, reason, triggered_by }` — see details below.                                                                                                |
| `ROOM_ERROR`     | Sent only to the requesting socket (not broadcast) | Failed `JOIN_QUEUE_ROOM` / `JOIN_STORE_ROOM` (queue/store not found, does not belong to the authenticated user, or an internal server error) | `{ errors: string }`                                                                                                                                       |

### `STATUS_UPDATED` Payload Details

All status changes now use **the same event** and **the same payload structure**. The frontend only needs to listen to this single event for all queue status updates.

The `reason` field is always included in the payload. Its value is `null` whenever the status change is **not** a cancellation (for example, when transitioning to `DIPROSES` or `SELESAI`).

```json
{
  "id": 42,
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}
```

```json
{
  "id": 42,
  "status": "DIBATALKAN",
  "reason": "Out of stock",
  "triggered_by": "seller"
}
```

```json
{
  "id": 42,
  "status": "DIBATALKAN",
  "reason": "It took too long",
  "triggered_by": "buyer"
}
```

```json
{
  "id": 42,
  "status": "DIBATALKAN",
  "reason": "Queue has expired",
  "triggered_by": "system"
}
```

`triggered_by` can have one of the following values:

| Value      | Meaning                                                               | Possible `reason`                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"seller"` | Updated manually by the seller from the dashboard                     | Contains the seller's cancellation reason if provided, otherwise `null` for non-cancellation transitions (`DIPROSES`/`SELESAI`) or cancellations without a reason. |
| `"buyer"`  | Cancelled by the buyer                                                | Contains the buyer's cancellation reason if provided, otherwise `null`.                                                                                            |
| `"system"` | Automatically cancelled by the cron job after `expired_at` has passed | Always `"Queue has expired"`.                                                                                                                                      |

The payload is intentionally minimal (`id`, `status`, `reason`, and `triggered_by` only). It does **not** include `queueDetails` or any other queue data.

If the frontend needs additional information after receiving this event, it should update the corresponding queue in its local state using the `id`. A full refetch is only necessary if other fields that are not included in this payload are required.
