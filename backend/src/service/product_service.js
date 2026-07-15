import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import {
  createProductValidation,
  getAllProductValidation,
  getProductValidation,
} from "../validation/product_validation.js";
import { validate } from "../validation/validation.js";

const getProduct = async (userId, request) => {
  const req = validate(getProductValidation, request);
  const product = await prisma.product.findFirst({
    where: {
      id: req,
      is_delete: false,
      store: {
        user_id: userId,
        is_delete: false,
      },
    },
    select: {
      id: true,
      name: true,
      price: true,
      image_url: true,
      is_available: true,
      productAddonGroups: {
        where: {
          addon_group: {
            is_delete: false,
          },
        },
        select: {
          addon_group: {
            select: {
              id: true,
              name: true,
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
          },
        },
      },

      // Nested select lagi buat ngambil varian dari produk tersebut
      variants: {
        where: {
          is_delete: false,
        },
        select: {
          id: true,
          name: true,
          additional_price: true,
        },
      },
    },
  });
  if (!product) {
    throw new ResponseError(404, "product tidak ditemukan");
  }
  return product;
};
const getAllProducts = async (userId, request) => {
  const publicId = validate(getAllProductValidation, request);
  return await prisma.product.findMany({
    where: {
      store: {
        user_id: userId,
        is_delete: false,
        public_id: publicId,
      },
      is_delete: false, // kalau Product juga pakai soft delete
    },
    select: {
      id: true,
      name: true,
      price: true,
      image_url: true,
      is_available: true,
      productAddonGroups: {
        where: {
          addon_group: {
            is_delete: false,
          },
        },
        select: {
          addon_group: {
            select: {
              id: true,
              name: true,
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
          },
        },
      },

      variants: {
        where: {
          is_delete: false, // kalau ada soft delete
        },
        select: {
          id: true,
          name: true,
          additional_price: true,
        },
      },
    },
  });
};

const createProduct = async (request, file) => {
  if (typeof request.variants === "string") {
    try {
      request.variants = JSON.parse(request.variants);
    } catch (e) {
      request.variants = [];
    }
  }

  if (typeof request.addon_group_ids === "string") {
    try {
      request.addon_group_ids = JSON.parse(request.addon_group_ids);
    } catch (e) {
      request.addon_group_ids = [];
    }
  }

  if (typeof request.price === "string") {
    request.price = Number(request.price);
  }

  const req = validate(createProductValidation, request);

  const store = await prisma.store.findUnique({
    where: { user_id: req.userId, is_delete: false },
    select: { id: true },
  });
  if (!store) {
    throw new ResponseError(
      404,
      "Toko tidak ditemukan. Silakan pastikan toko sudah dibuat terlebih dahulu.",
    );
  }

  const existingProduct = await prisma.product.count({
    where: {
      store_id: store.id,
      name: req.name,
      is_delete: false,
    },
  });

  if (existingProduct > 0) {
    throw new ResponseError(
      400,
      `Produk dengan nama '${req.name}' sudah ada di toko ini.`,
    );
  }

  const productImagePath = file ? `/uploads/${file.filename}` : null;

  let parsedVariants = req.variants;
  if (typeof req.variants === "string") {
    try {
      parsedVariants = JSON.parse(req.variants);
    } catch (e) {
      parsedVariants = [];
    }
  }

  let parsedAddonGroupIds = req.addon_group_ids;
  if (typeof req.addon_group_ids === "string") {
    try {
      parsedAddonGroupIds = JSON.parse(req.addon_group_ids);
    } catch (e) {
      parsedAddonGroupIds = [];
    }
  }

  if (parsedAddonGroupIds && parsedAddonGroupIds.length > 0) {
    const validAddonGroups = await prisma.addonGroup.count({
      where: {
        id: { in: parsedAddonGroupIds },
        store_id: store.id,
        is_delete: false,
      },
    });
    if (validAddonGroups !== parsedAddonGroupIds.length) {
      throw new ResponseError(
        400,
        "Beberapa grup add-on tidak valid untuk toko ini.",
      );
    }
  }

  return await prisma.product.create({
    data: {
      name: req.name,
      price: Number(req.price),
      image_url: productImagePath,
      store_id: store.id,

      ...(parsedVariants &&
        parsedVariants.length > 0 && {
          variants: {
            create: parsedVariants.map((variant) => ({
              name: variant.name,
              additional_price: Number(variant.additional_price) || 0,
            })),
          },
        }),

      ...(parsedAddonGroupIds &&
        parsedAddonGroupIds.length > 0 && {
          productAddonGroups: {
            create: parsedAddonGroupIds.map((addonGroupId) => ({
              addon_group_id: addonGroupId,
            })),
          },
        }),
    },
    include: {
      variants: true,
      productAddonGroups: {
        include: {
          addon_group: {
            include: {
              addons: true,
            },
          },
        },
      },
    },
  });
};

const updateProductInfo = async (userId, productId, request) => {
  const req = validate(updateProductValidation, request);

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      is_delete: false,
      store: { user_id: userId, is_delete: false },
    },
    include: {
      variants: {
        where: { is_delete: false },
      },
    },
  });

  if (!product)
    throw new ResponseError(404, "Produk tidak ditemukan atau bukan milikmu");

  const reqVariants = req.variants || [];
  const existingVariantsToUpdate = reqVariants.filter((v) => v.id);
  const newVariantsToCreate = reqVariants.filter((v) => !v.id);

  const selectedAddonGroupIds = Array.isArray(req.addon_group_ids)
    ? req.addon_group_ids
    : [];

  if (selectedAddonGroupIds.length > 0) {
    const validAddonGroups = await prisma.addonGroup.count({
      where: {
        id: { in: selectedAddonGroupIds },
        is_delete: false,
        store: { user_id: userId },
      },
    });
    if (validAddonGroups !== selectedAddonGroupIds.length) {
      throw new ResponseError(
        400,
        "Beberapa grup add-on tidak valid untuk produk ini.",
      );
    }
  }

  const existingProductAddonGroups = await prisma.productAddonGroup.findMany({
    where: { product_id: productId },
    select: { addon_group_id: true },
  });

  const existingAddonGroupIds = existingProductAddonGroups.map(
    (row) => row.addon_group_id,
  );

  const addonGroupsToCreate = selectedAddonGroupIds.filter(
    (id) => !existingAddonGroupIds.includes(id),
  );
  const addonGroupsToDelete = existingAddonGroupIds.filter(
    (id) => !selectedAddonGroupIds.includes(id),
  );

  const retainedVariantIds = existingVariantsToUpdate.map((v) => v.id);

  try {
    return await prisma.product.update({
      where: { id: productId },
      data: {
        name: req.name,
        price: req.price,

        variants: {
          updateMany: {
            where: { id: { notIn: retainedVariantIds } },
            data: { is_delete: true },
          },
          update: existingVariantsToUpdate.map((v) => ({
            where: { id: v.id },
            data: { name: v.name, additional_price: v.additional_price },
          })),
          create: newVariantsToCreate.map((v) => ({
            name: v.name,
            additional_price: v.additional_price,
          })),
        },

        productAddonGroups: {
          ...(addonGroupsToDelete.length > 0 && {
            deleteMany: {
              addon_group_id: { in: addonGroupsToDelete },
            },
          }),
          ...(addonGroupsToCreate.length > 0 && {
            create: addonGroupsToCreate.map((addonGroupId) => ({
              addon_group_id: addonGroupId,
            })),
          }),
        },
      },
      include: { variants: true },
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw new ResponseError(
        400,
        "Tidak bisa memproses permintaan karena sedang ada pesanan aktif.",
      );
    }
    throw error;
  }
};

const updateProductImage = async (userId, productId, file) => {
  if (!file)
    throw new ResponseError(400, "Tidak ada file gambar yang diupload");

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      is_delete: false,
      store: { user_id: userId, is_delete: false },
    },
  });
  if (!product) throw new ResponseError(404, "Produk tidak ditemukan");

  return await prisma.product.update({
    where: { id: productId },
    data: { image_url: `/uploads/${file.filename}` },
    select: { id: true, name: true, image_url: true },
  });
};
export default {
  updateProductImage,
  createProduct,
  getProduct,
  getAllProducts,
  updateProductInfo,
};
