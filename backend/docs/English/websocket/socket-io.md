# WebSocket Events Documentation

Real-time event documentation (Socket.IO) used by the system outside of standard REST APIs.

---

## Connection & Authentication

Connect to the same Socket.IO server as the REST API base URL.

Authentication is performed **once when the Socket.IO connection is established** via `socket.handshake.auth`.

### Authentication Source Priority

Order of data retrieval by the server:

1. `socket.handshake.auth`
2. Cookie in `socket.handshake.headers.cookie`

#### Data Source Mapping Table

| Data | Auth Source | Cookie Fallback | Description |
| --- | --- | --- | --- |
| **Access Token** | `token` | `access_token` | Used for user authentication |
| **Refresh Token** | `refreshToken` | `refresh_token` | Used to renew expired access tokens |
| **Guest ID** | `guestId` | `guest_id` | Used to identify buyer guests |

---

### Example Connection from Frontend

```javascript
const socket = io(SOCKET_URL, {
  withCredentials: true,
  auth: {
    token: accessToken,
    refreshToken: refreshToken,
    guestId: guestId,
  },
});

```

*Note: The frontend is not required to re-send identity data on every event. Once authentication succeeds, identity is stored by the server on `socket.user`.*

---

### Authentication Rules

#### 1. Buyer Guest Authentication

* If neither `access_token` nor `refresh_token` is present, the server treats the connection as a **guest**.
* The server requires `guest_id` from `socket.handshake.auth.guestId` or the `guest_id` cookie.
* If both are unavailable, the connection is rejected with:
> `Unauthorized: Missing auth tokens and guest identity`


* If successful, the server sets:
```javascript
socket.user = {
  id: guestId,
  role: "buyer",
  name: "Guest",
};

```


*(Guests do not need to log in to use the queue feature).*

#### 2. Seller Authentication

* Sellers send the access token via `auth: { token, refreshToken }` or the `access_token` cookie.
* After validation through Supabase Auth, the server looks up the related user in the database based on `supabase_id`.
* If found, the server sets:
```javascript
socket.user = {
  ...prismaUser,
  role: "seller",
};

```



#### 3. Refresh Access Token

* If the access token has expired but the refresh token remains valid, the server performs a session refresh via Supabase.
* New tokens are sent to the client through the `token_refreshed` event.
* **Payload:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}

```


* **Client Listener:**
```javascript
socket.on("token_refreshed", (newTokens) => {
  localStorage.setItem("access_token", newTokens.accessToken);
  localStorage.setItem("refresh_token", newTokens.refreshToken);
});

```


* If it fails, the connection is rejected with:
> `Session Expired. Please login again.`



#### 4. Connection Error Handling

```javascript
socket.on("connect_error", (error) => {
  console.error(error.message);
});

```

**Possible error messages:**

* `Unauthorized: Missing auth tokens and guest identity`
* `Unauthorized: Invalid token`
* `Session Expired. Please login again.`
* `User database mismatch`

---

## Events Sent: Client $\rightarrow$ Server

| Event | Used By | Payload | Effect |
| --- | --- | --- | --- |
| **`JOIN_STORE_ROOM`** | Seller | — (empty) | Joins the `TOKO_<store.id>` room of their own store |
| **`JOIN_QUEUE_ROOM`** | Buyer | `queueId` (number) | Joins the `ANTREAN_<queueId>` room after ownership validation |
| **`LEAVE_QUEUE_ROOM`** | Buyer | `queueId` (number) | Leaves the `ANTREAN_<queueId>` room |

### Client $\rightarrow$ Server Event Details

#### `JOIN_STORE_ROOM`

* Used by sellers to join their store room. The server uses identity from `socket.user`, eliminating the need for `storeId` in the payload.
* **Room:** `TOKO_<store.id>`
* **Usage:**
```javascript
socket.emit("JOIN_STORE_ROOM");

```



#### `JOIN_QUEUE_ROOM`

* Used by buyers to join a specific queue room after the server verifies queue ownership in the database:
```javascript
const queue = await prisma.queue.findFirst({
  where: {
    id: queueId,
    guest_id: socket.user.id,
  },
});

```


* If valid, joins the `ANTREAN_<queueId>` room. If invalid or not found, the server replies with a `ROOM_ERROR` event.
* **Usage:**
```javascript
socket.emit("JOIN_QUEUE_ROOM", 42);

```



#### `LEAVE_QUEUE_ROOM`

* Used when a buyer leaves the order status detail page to stop receiving irrelevant updates.
* **Usage:**
```javascript
socket.emit("LEAVE_QUEUE_ROOM", 42);

```



---

## Events Sent: Server $\rightarrow$ Client

| Event | Target Room | Triggered By | Payload |
| --- | --- | --- | --- |
| **`NEW_QUEUE`** | `TOKO_<store.id>` | Buyer creates a new queue | New queue object |
| **`STATUS_UPDATED`** | `ANTREAN_<queueId>` & `TOKO_<store_id>` | Queue status change | `{ id, status, reason, triggered_by }` |
| **`ROOM_ERROR`** | Sender socket | Failed room join | `{ errors: string }` |
| **`token_refreshed`** | Sender socket | Successful token refresh | `{ accessToken, refreshToken }` |

### Server $\rightarrow$ Client Event Details

#### `NEW_QUEUE`

* Sent to the store room when a buyer successfully creates a new queue (the `store` field is destructured/removed before sending). Used by sellers to update their dashboard in real time.

#### `STATUS_UPDATED`

* Used for all queue status changes.
* **Base Payload:**
```json
{
  "id": 42,
  "status": "DIPROSES",
  "reason": null,
  "triggered_by": "seller"
}

```


* **`triggered_by` & `reason` Variations:**
* **Cancelled by Seller:**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Stok habis", "triggered_by": "seller" }

```


* **Cancelled by Buyer:**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Lama banget", "triggered_by": "buyer" }

```


* **Automatic Cancellation (System):**
```json
{ "id": 42, "status": "DIBATALKAN", "reason": "Pesanan telah melewati batas pembayaran", "triggered_by": "system" }

```





#### `ROOM_ERROR`

* Sent exclusively to the requesting socket when joining a room fails.
* **Payload:**
```json
{
  "errors": "Queue not found or unauthorized access."
}

```



---

## Important Notes for Frontend (FE)

1. **Not the Primary Source of Truth:** Socket.IO is not the main data source; the database and REST API remain the primary source of truth.
2. **Synchronization Trigger:** Use `STATUS_UPDATED` as a trigger to refetch data via API (e.g., using React Query):
```javascript
socket.on("STATUS_UPDATED", (payload) => {
  queryClient.invalidateQueries({
    queryKey: ["queue", payload.id],
  });
});

```


3. **Execution Timing of `JOIN_QUEUE_ROOM`:** Buyers are advised to call `JOIN_QUEUE_ROOM` immediately after queue creation succeeds and when opening the queue detail page.
