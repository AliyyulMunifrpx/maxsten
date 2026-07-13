# address api specs

## create address api

**Endpoint:** `POST /api/contacts/:contactid/addresses`
**Headers:**

- Authorization: token

**request body:**

```json
{
  "street": "jalan jalan",
  "city": "kota apa gitu",
  "province": "provinsi apa gitu",
  "country": "negara apa gitu",
  "postalCode": "56151"
}
```

**response body success**

```json
{
  "data": {
    "id": 1,
    "street": "jalan jalan",
    "city": "kota apa gitu",
    "province": "provinsi apa gitu",
    "country": "negara apa gitu",
    "postalCode": "56151"
  }
}
```

**response body error**

```json
{
  "errors": "country is required"
}
```

## update address api

**Endpoint:** `PUT /api/contacts/:contactid/addresses/:addressid`
**request body:**

```json
{
  "street": "jalan jalan",
  "city": "kota apa gitu",
  "province": "provinsi apa gitu",
  "country": "negara apa gitu",
  "postalCode": "56151"
}
```

**response body success**

```json
{
  "data": {
    "id": 1,
    "street": "jalan jalan",
    "city": "kota apa gitu",
    "province": "provinsi apa gitu",
    "country": "negara apa gitu",
    "postalCode": "56151"
  }
}
```

**response body error**

```json
{
  "errors": "country is required"
}
```

## get address api

**Endpoint:** `GET  /api/contacts/:contactid/addresses/:addressid`

**response body success**

```json
{
  "data": {
    "id": 1,
    "street": "jalan jalan",
    "city": "kota apa gitu",
    "province": "provinsi apa gitu",
    "country": "negara apa gitu",
    "postalCode": "56151"
  }
}
```

**response body error**

```json
{
  "errors": "contact is not found"
}
```

## list addreesses api

**Endpoint:** `GET /api/contacts/:contactid/addresses`

**response body success**

```json
{
  "data": [
    {
      "id": 1,
      "street": "jalan jalan",
      "city": "kota apa gitu",
      "province": "provinsi apa gitu",
      "country": "negara apa gitu",
      "postalCode": "56151"
    },
    {
      "id": 1,
      "street": "jalan jalan",
      "city": "kota apa gitu",
      "province": "provinsi apa gitu",
      "country": "negara apa gitu",
      "postalCode": "56151"
    },
    {
      "id": 1,
      "street": "jalan jalan",
      "city": "kota apa gitu",
      "province": "provinsi apa gitu",
      "country": "negara apa gitu",
      "postalCode": "56151"
    }
  ]
}
```

**response body error**

```json
{
  "errors": "contact is not found"
}
```

## remove address api

**Headers:**

- Authorization: token

**Endpoint:** `DELETE  /api/contacts/:contactid/addresses/:addressid`
**response body success**

```json
{
  "data": "OK"
}
```

**response body error**

```json
{ "errors": "address is not found" }
```
