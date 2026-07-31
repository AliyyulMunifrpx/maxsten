import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import {
  createCancelReasonValidation,
  deleteReasonTemplateValidation,
  getReasonTemplateValidation,
  updateCancelReasonValidation,
} from "../validation/reason_validation.js";
import { validate } from "../validation/validation.js";

const createCancelReason = async (request) => {
  const req = validate(createCancelReasonValidation, request);

  // 2. Cari toko milik user yang lagi login
  const store = await prisma.store.findFirst({
    where: {
      user_id: req.user_id,
      is_delete: false,
    },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  try {
    return await prisma.cancelReasonTemplate.create({
      data: {
        store_id: store.id,
        reason: req.reason,
      },
      select: {
        id: true,
        reason: true,
        created_at: true,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ResponseError(
        409,
        "A cancellation reason with this text already exists.",
      );
    }
    throw error;
  }
};
const updateCancelReason = async (request) => {
  const req = validate(updateCancelReasonValidation, request);

  const existingReason = await prisma.cancelReasonTemplate.findFirst({
    where: {
      id: req.id,
      is_delete: false,
      store: {
        user_id: req.user_id,
        is_delete: false,
      },
    },
    select: { id: true },
  });

  if (!existingReason) {
    throw new ResponseError(
      404,
      "Reason template not found or you do not have access",
    );
  }

  try {
    return await prisma.cancelReasonTemplate.update({
      where: {
        id: req.id,
      },
      data: {
        reason: req.reason,
      },
      select: {
        id: true,
        reason: true,
        created_at: true,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ResponseError(
        409,
        "A cancellation reason with this text already exists.",
      );
    }
    throw error;
  }
};
const getCancelReasons = async (request) => {
  const req = validate(getReasonTemplateValidation, request);
  const store = await prisma.store.findFirst({
    where: { user_id: req, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  return prisma.cancelReasonTemplate.findMany({
    where: {
      store_id: store.id,
      is_delete: false,
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      created_at: true,
    },
  });
};
const deleteReasonTemplate = async (request) => {
  const req = validate(deleteReasonTemplateValidation, request);
  const store = await prisma.store.findFirst({
    where: {
      user_id: req.user_id,
      is_delete: false,
    },
    select: {
      id: true,
    },
  });
  if (!store) {
    throw new ResponseError(404, "Store not found");
  }
  const template = await prisma.cancelReasonTemplate.findFirst({
    where: {
      store_id: store.id,
      id: req.id,
      is_delete: false,
    },
    select: {
      id: true,
    },
  });
  if (!template) {
    throw new ResponseError(404, "Cancellation reason template not found");
  }
  try {
    await prisma.cancelReasonTemplate.update({
      where: {
        id: template.id,
      },
      data: {
        is_delete: true,
      },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new ResponseError(404, "Cancellation reason template not found");
    }
    throw error;
  }
};
export default {
  createCancelReason,
  getCancelReasons,
  updateCancelReason,
  deleteReasonTemplate,
};
