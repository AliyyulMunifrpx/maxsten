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
const getAddonGroup = async (request) => {
  const req = validate(getAddonGroupValidation, request);

  const result = await prisma.addonGroup.findFirst({
    where: {
      id: req.addon_group_id,
      is_delete: false,
      store: {
        user_id: req.user_id,
        is_delete: false,
      },
    },
    select: {
      id: true,
      name: true,
      created_at: true,
      addons: {
        where: { is_delete: false },
        select: {
          id: true,
          name: true,
          price: true,
          created_at: true,
        },
      },
    },
  });

  if (!result) {
    throw new ResponseError(
      404,
      "The add-on group was not found, or you do not have access",
    );
  }

  return result;
};
const createAddonGroup = async (request) => {
  if (typeof request.addons === "string") {
    try {
      request.addons = JSON.parse(request.addons);
    } catch (e) {
      throw new ResponseError(
        400,
        "Invalid addons data format. Must be a valid JSON array",
      );
    }
  }

  const req = validate(createAddonGroupValidation, request);

  const store = await prisma.store.findFirst({
    where: { user_id: req.userId, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  const addonNames = req.addons.map((a) => a.name.toLowerCase());
  const hasDuplicateAddons = addonNames.length !== new Set(addonNames).size;
  if (hasDuplicateAddons) {
    throw new ResponseError(400, "Add-on names within a group must be unique");
  }

  try {
    return await prisma.addonGroup.create({
      data: {
        name: req.name.trim().toLowerCase(),
        store_id: store.id,
        addons: {
          create: req.addons.map((addon) => ({
            name: addon.name.trim().toLowerCase(),
            price: addon.price,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        addons: {
          where: {
            is_delete: false,
          },
          select: {
            id: true,
            name: true,
            price: true,
            created_at: true,
          },
        },
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ResponseError(
        409,
        "An add-on group with this name already exists",
      );
    }
    throw error;
  }
};
const editAddonGroups = async (request) => {
  const req = validate(editAddonGroupsValidation, request);
  try {
    return await prisma.$transaction(async (tx) => {
      const store = await tx.store.findFirst({
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

      const addonGroup = await tx.addonGroup.findFirst({
        where: {
          id: req.id,
          store_id: store.id,
          is_delete: false,
        },
      });
      if (!addonGroup) {
        throw new ResponseError(404, "Addon Group not found");
      }

      // 🚨 NEW LOGIC: CEK ANTREAN AKTIF SEBELUM EDIT
      const isQueueActive = await tx.queue.findFirst({
        where: {
          store_id: store.id,
          status: {
            in: ["BELUM_BAYAR", "DIPROSES"],
          },
          queueDetails: {
            some: {
              product: {
                productAddonGroups: {
                  some: {
                    addon_group_id: req.id,
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });

      if (isQueueActive) {
        throw new ResponseError(
          409,
          "Cannot edit this add-on group because a product using it is currently in an active queue.",
        );
      }
      // 🚨 END OF NEW LOGIC

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

      const invalidId = incomingIds.find((id) => !existingIds.includes(id));

      if (invalidId) {
        throw new ResponseError(400, "Invalid add-on");
      }

      await tx.addonGroup.update({
        where: {
          id: req.id,
        },
        data: {
          name: req.name.trim().toLowerCase(),
        },
      });

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

      for (const addon of req.addons.filter((item) => item.id)) {
        await tx.addon.update({
          where: {
            id: addon.id,
          },
          data: {
            name: addon.name.trim().toLowerCase(),
            price: addon.price,
            is_delete: false,
          },
        });
      }

      const newAddons = req.addons
        .filter((item) => !item.id)
        .map((item) => ({
          addon_group_id: req.id,
          name: item.name.trim().toLowerCase(),
          price: item.price,
        }));

      if (newAddons.length > 0) {
        await tx.addon.createMany({
          data: newAddons,
        });
      }

      return await tx.addonGroup.findFirst({
        where: {
          id: req.id,
          store_id: store.id,
          is_delete: false,
        },
        select: {
          id: true,
          name: true,
          created_at: true,
          addons: {
            where: {
              is_delete: false,
            },
            select: {
              id: true,
              name: true,
              price: true,
              created_at: true,
            },
          },
        },
      });
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ResponseError(
        409,
        "An add-on group with this name already exists",
      );
    }
    throw error;
  }
};
const getAddonGroups = async (request) => {
  const req = validate(getAddonGroupsValidation, request);

  const store = await prisma.store.findFirst({
    where: { user_id: req, is_delete: false },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }
  return await prisma.addonGroup.findMany({
    where: {
      store_id: store.id,
      is_delete: false,
    },
    orderBy: {
      created_at: "asc",
    },
    select: {
      id: true,
      name: true,
      created_at: true,
      addons: {
        where: {
          is_delete: false,
        },
        orderBy: {
          created_at: "asc",
        },
        select: {
          id: true,
          name: true,
          price: true,
          created_at: true,
        },
      },
    },
  });
};
const deleteAddonGroup = async (request) => {
  const req = validate(deleteAddonGroupValidation, request);

  await prisma.$transaction(async (tx) => {
    // 1. Cek Toko
    const store = await tx.store.findFirst({
      where: {
        user_id: req.user_id,
        is_delete: false, // 👈 Tambahin ini biar ga nyari toko yang udah dihapus
      },
    });

    if (!store) {
      throw new ResponseError(404, "Store not found");
    }

    // 2. Cek Grup Addon
    const addonGroup = await tx.addonGroup.findFirst({
      where: {
        id: req.id,
        store_id: store.id,
        is_delete: false, // 👈 Tambahin ini biar ga error hapus data 2 kali
      },
    });

    if (!addonGroup) {
      throw new ResponseError(404, "Addon group not found");
    }

    // 3. 🚨 CEK ANTREAN AKTIF (Jawaban dari pertanyaan lu)
    const isQueueActive = await tx.queue.findFirst({
      where: {
        store_id: store.id, // Pastikan antrean di toko ini
        status: {
          in: ["BELUM_BAYAR", "DIPROSES"], // Status aktif
        },
        // Cek apakah di dalam antrean ini...
        queueDetails: {
          some: {
            // ...ada produk...
            product: {
              // ...yang terhubung dengan grup addon ini
              productAddonGroups: {
                some: {
                  addon_group_id: req.id,
                },
              },
            },
          },
        },
      },
      select: { id: true }, // Ambil ID aja biar ringan query-nya
    });

    // Kalau ada antrean yang nyangkut, TOLAK penghapusan!
    if (isQueueActive) {
      throw new ResponseError(
        409,
        "Cannot delete this add-on group because a product using it is currently in an active queue.",
      );
    }

    // 4. Lanjut Soft-Delete Addon (Child)
    await tx.addon.updateMany({
      where: {
        addon_group_id: req.id,
        is_delete: false,
      },
      data: {
        is_delete: true,
      },
    });

    // 5. Lanjut Soft-Delete Addon Group (Parent)
    await tx.addonGroup.update({
      where: {
        id: req.id,
      },
      data: {
        is_delete: true,
      },
    });
  });
};
export default {
  editAddonGroups,
  getAddonGroup,
  createAddonGroup,
  getAddonGroups,
  deleteAddonGroup,
};
