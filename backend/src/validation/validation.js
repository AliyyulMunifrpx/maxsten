import { ResponseError } from "../error/response_error.js";

const validate = function (schema, request) {
  const {error, value} = schema.validate(request, {
    abortEarly: false,
    allowUnknown: false //agar tidak ada data yang ga ada fieldnya, ya untuk keamanan lah
  });
  if (error) {
    throw new ResponseError(400, error.message);
  } else {
    return value;
  }
};

export { validate };
