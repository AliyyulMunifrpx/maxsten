# contact api specs

## create contact api

**Endpoint:** `POST /api/contacts`
**Headers:**

- Authorization: token

**request body:**

```json
{
  "firstName": "aliyyul",
  "lastName": "munif",
  "email": "aliyyul@gmail.com",
  "phone": "082345678"
}
```

**response body success**

```json
{
  "data": {
    "id": 1,
    "firstName": "aliyyul",
    "lastName": "munif",
    "email": "aliyyul@gmail.com",
    "phone": "082345678"
  }
}
```

**response body error**

```json
{ "errors": "email is not valid format" }
```

## update contact api

**Endpoint:** `PUT /api/contacts/:id`
**Headers:**

- Authorization: token
  **request body:**

```json
{
  "firstName": "aliyyul",
  "lastName": "munif",
  "email": "aliyyul@gmail.com",
  "phone": "082345678"
}
```

**response body success**

```json
{
  "data": {
    "id": 1,
    "firstName": "aliyyul",
    "lastName": "munif",
    "email": "aliyyul@gmail.com",
    "phone": "082345678"
  }
}
```

**response body error**

```json
{ "errors": "email is not valid format" }
```

## get contact api

**Endpoint:** `GET /api/contacts/:id`
**Headers:**

- Authorization: token

**response body success**

```json
{
  "data": {
    "id": 1,
    "firstName": "aliyyul",
    "lastName": "munif",
    "email": "aliyyul@gmail.com",
    "phone": "082345678"
  }
}
```

**response body error**

```json
{ "errors": "contact is not found" }
```

## search contact api

**Endpoint:** `GET /api/contacts`
**Headers:**

- Authorization: token

**query params:**
-name: search by first name or last name, using like, optional
-email: search by email, using like, optional
-phone: search by phone, using like, optional
-page: number of page, default 1
-size: size per page, default 10

**response body success**

```json
{
  "data": [
    {
      "id": 1,
      "firstName": "aliyyul",
      "lastName": "munif",
      "email": "aliyyul@gmail.com",
      "phone": "082345678"
    },
    {
      "id": 1,
      "firstName": "aliyyul",
      "lastName": "munif",
      "email": "aliyyul@gmail.com",
      "phone": "082345678"
    },
    {
      "id": 1,
      "firstName": "aliyyul",
      "lastName": "munif",
      "email": "aliyyul@gmail.com",
      "phone": "082345678"
    }
  ],
  "paging": {
    "page": 1,
    "totalPage": 3,
    "totalItems": 30
  }
}
```

**response body error**

## remove contact api

**Endpoint:** `DELETE /api/contacts/delete/:id`
**Headers:**

- Authorization: token

**response body success**

```json
{
  "data": "OK"
}
```

**response body error**

```json
{ "errors": "contact is not found" }
```
