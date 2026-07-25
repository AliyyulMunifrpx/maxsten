import { ResponseError } from "../error/response_error.js";

export default function assertValidOperationalHours(operationalHours) {
  const seenDays = new Set();
  for (const hour of operationalHours) {
    if (seenDays.has(hour.day)) {
      throw new ResponseError(
        400,
        `Duplicate schedule for day ${hour.day} is not allowed`,
      );
    }
    seenDays.add(hour.day);

    if (
      hour.open_time &&
      hour.close_time &&
      hour.open_time === hour.close_time
    ) {
      throw new ResponseError(
        400,
        `open_time and close_time cannot be the same for day ${hour.day}`,
      );
    }
  }
}
