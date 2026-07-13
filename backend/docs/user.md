# User API Specs

## Register User

**Endpoint:** `POST /api/users`

**Request Body:**

```json
{
  "username": "aliyyul",
  "password": "aliyyul123",
  "name": "Aliyyul Munif"
}
```

**Response Body (Success):**

```json
{
  "data": {
    "username": "aliyyul",
    "name": "Aliyyul Munif"
  }
}
```

**Response Body (Error):**

```json
{
  "errors": "username is already registered"
}
```

---

## Login User

**Endpoint:** `POST /api/users/login`

**Request Body:**

```json
{
  "username": "aliyyul",
  "password": "aliyyul123"
}
```

**Response Body (Success):**

```json
{
  "data": {
    "token": "unique-token"
  }
}
```

**Response Body (Error):**

```json
{
  "errors": "username or password wrong"
}
```

## Upadate User

**Endpoint:** `PATCH api/users/current`
**Headers:**

- Authorization: token
  **Request Body:**

```json
{
  "name": "aliyyul lagi", //optional
  "password": "new password" //optional
}
```

**Response Body Success:**

```json
{
  "data": {
    "username": "aliyyul",
    "name": "aliyyul lagi"
  }
}
```

**Response Body Error:**

```json
{ "errors": "name lenght max 100" }
```

## get user

**Endpoint:** `GET api/users/current`

**Headers:**
- Authorization: token

  **Response Body Success:**

```json
{
  "data": {
    "username": "aliyyul",
    "name": "aliyyul munif"
  }
}
```

**Response Body Error:**

```json
{ "errors": "Unauthorize" }
```

## logout user API

**Endpoint:** `DELETE api/users/logout`

**Headers:**
- Authorization: token

**Response Body Success:**

```json
{
  "data": "OK"
}
```

**Response Body Error:**

```json
{ "errors": "Unauthorize" }
```
