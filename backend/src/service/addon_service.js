import {
  createAddonGroupValidation,
  deleteAddonGroupValidation,
  editAddonGroupsValidation,
  getAddonGroupsValidation,
  getAddonGroupValidation,
} from "../validation/addon_validation.js";
import { ResponseError } from "../error/response_error.js";
import { validate } from "../validation/validation.js";
import { prisma } from "../application/database.js";

const editAddonGroups = async (userId, request) => {
  if (typeof request.addons === "string") {
    try {
      request.addons = JSON.parse(request.addons);
    } catch {
      request.addons = [];
    }
  }

  const req = validate(editAddonGroupsValidation, request);

  return await prisma.$transaction(async (tx) => {
    // Cek toko
    const store = await tx.store.findFirst({
      where: {
        user_id: userId,
        is_delete: false,
      },
      select: {
        id: true,
      },
    });

    if (!store) {
      throw new ResponseError(404, "Toko tidak ditemukan");
    }

    // Cek addon group
    const addonGroup = await tx.addonGroup.findFirst({
      where: {
        id: req.id,
        store_id: store.id,
        is_delete: false,
      },
    });
    if (!addonGroup) {
      throw new ResponseError(
        404,
        "Addon Group tidak ditemukan atau tidak valid",
      );
    }

    // Ambil addon yang masih aktif
    const existingAddons = await tx.addon.findMany({
      where: {
        addon_group_id: req.id,
        is_delete: false,
      },
      select: {
        id: true,
      },
    });

    const existingIds = existingAddons.map((item) => item.id);

    const incomingIds = req.addons
      .filter((item) => item.id)
      .map((item) => item.id);

    // Validasi supaya frontend tidak bisa update addon group lain
    const invalidId = incomingIds.find((id) => !existingIds.includes(id));

    if (invalidId) {
      throw new ResponseError(400, "Addon tidak valid");
    }

    // Update nama group
    await tx.addonGroup.update({
      where: {
        id: req.id,
      },
      data: {
        name: req.name,
      },
    });

    // Soft delete addon yang dihapus
    await tx.addon.updateMany({
      where: {
        addon_group_id: req.id,
        is_delete: false,
        id: {
          notIn: incomingIds,
        },
      },
      data: {
        is_delete: true,
      },
    });

    // Update addon lama
    for (const addon of req.addons.filter((item) => item.id)) {
      await tx.addon.update({
        where: {
          id: addon.id,
        },
        data: {
          name: addon.name,
          price: Number(addon.price),
          is_delete: false,
        },
      });
    }

    // Tambah addon baru
    const newAddons = req.addons
      .filter((item) => !item.id)
      .map((item) => ({
        addon_group_id: req.id,
        name: item.name,
        price: Number(item.price),
      }));

    if (newAddons.length > 0) {
      await tx.addon.createMany({
        data: newAddons,
      });
    }

    // Return data terbaru
    return await tx.addonGroup.findUnique({
      where: {
        id: req.id,
      },
      include: {
        addons: {
          where: {
            is_delete: false,
          },
        },
      },
    });
  });
};
const getAddonGroup = async (userId) => {
  const groupId = validate(getAddonGroupValidation);
  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      id: true,
    },
  });
  if (!store) {
    throw new ResponseError(404, "toko tidak ditemukan");
  }
  const result = await prisma.addonGroup.findFirst({
    where: {
      store_id: store.id,
      id: groupId,
      is_delete: false,
    },
    include: {
      addons: {
        where: {
          is_delete: false,
        },
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });
  return result;
};

const createAddonGroup = async (request) => {
  if (typeof request.addons === "string") {
    try {
      request.addons = JSON.parse(request.addons);
    } catch (e) {
      request.addons = [];
    }
  }

  const req = validate(createAddonGroupValidation, request);

  const store = await prisma.store.findFirst({
    where: { user_id: req.userId, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan.");
  }

  return prisma.addonGroup.create({
    data: {
      name: req.name,
      store_id: store.id,
      addons: {
        create: req.addons.map((addon) => ({
          name: addon.name,
          price: Number(addon.price),
        })),
      },
    },
    include: {
      addons: true,
    },
  });
};

const getAddonGroups = async (request) => {
  const req = validate(getAddonGroupsValidation, request);

  const store = await prisma.store.findFirst({
    where: { user_id: req, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan.");
  }

  return prisma.addonGroup.findMany({
    where: { store_id: store.id, is_delete: false },
    include: {
      addons: {
        where: {
          is_delete: false,
        },
      },
    },
  });
};
const deleteAddonGroup = async (userId, request) => {
  const req = validate(deleteAddonGroupValidation, request);
  const store = await prisma.store.findFirst({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      id: true,
    },
  });
  if (!store) {
    throw new ResponseError(404, "toko tidak ditemukan");
  }
  const addonGroup = await prisma.addonGroup.findFirst({
    where: {
      store_id: store.id,
      id: req,
      is_delete: false,
      store: {
        user_id: userId,
      },
    },
    select: {
      id: true,
    },
  });
  if (!addonGroup) {
    throw new ResponseError(404, "grup addon tidak ditemukan");
  }
  await prisma.addonGroup.updateMany({
    where: {
      id: addonGroup.id,
    },
    data: {
      is_delete: true,
    },
  });
};
export default {
  editAddonGroups,
  getAddonGroup,
  createAddonGroup,
  getAddonGroups,
  deleteAddonGroup,
};
