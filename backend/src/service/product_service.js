import { unlink } from "fs/promises";
import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import fs from "fs/promises";
import path from "path";
import {
  createProductValidation,
  deleteProductValidation,
  getAllProductValidation,
  getProductValidation,
  updateAvailabilityValidation,
  updateProductValidation,
} from "../validation/product_validation.js";
import { validate } from "../validation/validation.js";
const getProduct = async (userId, request) => {
  const req = validate(getProductValidation, request); // Asumsi ini balikin ID string/UUID

  // Langsung tembak ke produknya aja, filternya udah sangat aman
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
      description: true,
      price: true,
      image_url: true,
      is_available: true,
      productAddonGroups: {
        where: { addon_group: { is_delete: false } },
        select: {
          addon_group: {
            select: {
              id: true,
              name: true,
              addons: {
                where: { is_delete: false },
                select: { id: true, name: true, price: true },
              },
            },
          },
        },
      },
      variants: {
        where: { is_delete: false },
        select: { id: true, name: true, additional_price: true },
      },
    },
  });

  if (!product) {
    throw new ResponseError(404, "Product not found");
  }

  const soldAggregate = await prisma.queueDetail.aggregate({
    _sum: { quantity: true },
    where: {
      product_id: product.id,
      queue: { status: "SELESAI" },
    },
  });

  return {
    ...product,
    total_sold: soldAggregate._sum.quantity || 0,
  };
};
const getAllProducts = async (userId, request) => {
  const req = validate(getAllProductValidation, request);
  const pageNum = req.page;

  const store = await prisma.store.findFirst({
    where: {
      public_id: req.publicId,
      user_id: userId,
      is_delete: false,
    },
    select: { id: true },
  });

  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  const skipCurrent = (pageNum - 1) * 20;
  const skipNext = pageNum * 20;

  // 3 query jalan bareng: halaman sekarang, halaman berikutnya (prefetch),
  // dan total row buat pagination metadata.
  const [currentPageProducts, nextPageProducts, totalRows] = await Promise.all([
    prisma.product.findMany({
      where: { store_id: store.id, is_delete: false },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image_url: true,
        is_available: true,
        productAddonGroups: {
          where: { addon_group: { is_delete: false } },
          select: {
            addon_group: {
              select: {
                id: true,
                name: true,
                addons: {
                  where: { is_delete: false },
                  select: { id: true, name: true, price: true },
                },
              },
            },
          },
        },
        variants: {
          where: { is_delete: false },
          select: { id: true, name: true, additional_price: true },
        },
      },
      orderBy: { created_at: "desc" },
      skip: skipCurrent,
      take: 20,
    }),
    prisma.product.findMany({
      where: { store_id: store.id, is_delete: false },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image_url: true,
        is_available: true,
        productAddonGroups: {
          where: { addon_group: { is_delete: false } },
          select: {
            addon_group: {
              select: {
                id: true,
                name: true,
                addons: {
                  where: { is_delete: false },
                  select: { id: true, name: true, price: true },
                },
              },
            },
          },
        },
        variants: {
          where: { is_delete: false },
          select: { id: true, name: true, additional_price: true },
        },
      },
      orderBy: { created_at: "desc" },
      skip: skipNext,
      take: 20,
    }),
    prisma.product.count({
      where: { store_id: store.id, is_delete: false },
    }),
  ]);

  // total_sold buat SEMUA produk di kedua halaman, 1 query groupBy
  // (bukan 1 query aggregate per produk - biar gak N+1).
  const allProductIds = [...currentPageProducts, ...nextPageProducts].map(
    (p) => p.id,
  );

  const soldAggregates = allProductIds.length
    ? await prisma.queueDetail.groupBy({
        by: ["product_id"],
        where: {
          product_id: { in: allProductIds },
          queue: { status: "SELESAI" },
        },
        _sum: { quantity: true },
      })
    : [];

  const soldMap = new Map(
    soldAggregates.map((row) => [row.product_id, row._sum.quantity || 0]),
  );

  const attachSold = (products) =>
    products.map((p) => ({ ...p, total_sold: soldMap.get(p.id) || 0 }));

  return {
    currentPage: attachSold(currentPageProducts),
    nextPage: attachSold(nextPageProducts),
    pagination: {
      currentPage: pageNum,
      limit: 20,
      totalRows,
      totalPages: Math.ceil(totalRows / 20),
    },
  };
};
const createProduct = async (request, file) => {
  // Simpan nama sementara buat jaga-jaga kalau error P2002 terjadi
  let productName = request.name;

  try {
    // ==========================================
    // SEMUA LOGIKA LU MASUK KE DALAM TRY DI SINI
    // ==========================================

    // 1. Rapihkan data string dari FormData
    if (typeof request.variants === "string") {
      try {
        request.variants = JSON.parse(request.variants);
      } catch (e) {
        throw new ResponseError(400, "Invalid data format variants");
      }
    }

    if (typeof request.addon_group_ids === "string") {
      try {
        request.addon_group_ids = JSON.parse(request.addon_group_ids);
      } catch (e) {
        throw new ResponseError(
          400,
          "The format of the addon_group_ids data is invalid",
        );
      }
    }

    if (typeof request.price === "string") {
      request.price = Number(request.price);
    }

    // 2. Validasi dengan Zod
    const req = validate(createProductValidation, request);
    productName = req.name; // Update nama dari hasil validasi Zod yang bersih

    // 3. Cek apakah toko milik user ini ada
    const store = await prisma.store.findFirst({
      where: { user_id: req.userId, is_delete: false },
      select: { id: true },
    });

    if (!store) {
      throw new ResponseError(404, "Store not found");
    }

    // 4. Validasi Add-on (Satpam Add-on)
    if (req.addon_group_ids && req.addon_group_ids.length > 0) {
      const validAddonGroups = await prisma.addonGroup.count({
        where: {
          id: { in: req.addon_group_ids },
          store_id: store.id,
          is_delete: false,
        },
      });
      if (validAddonGroups !== req.addon_group_ids.length) {
        throw new ResponseError(
          400,
          "Some add-on groups are not valid for this store.",
        );
      }
    }

    const productImagePath = file ? `/uploads/${file.filename}` : null;

    // 5. Eksekusi Create
    return await prisma.product.create({
      data: {
        name: req.name,
        description: req.description,
        price: req.price,
        image_url: productImagePath,
        store_id: store.id,

        ...(req.variants &&
          req.variants.length > 0 && {
            variants: {
              create: req.variants.map((variant) => ({
                name: variant.name,
                additional_price: Number(variant.additional_price) || 0,
              })),
            },
          }),

        ...(req.addon_group_ids &&
          req.addon_group_ids.length > 0 && {
            productAddonGroups: {
              create: req.addon_group_ids.map((addonGroupId) => ({
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
              include: { addons: true },
            },
          },
        },
      },
    });
  } catch (error) {
    // ==========================================
    // ZONA PENGHANCURAN FILE GAGAL UPLOAD
    // ==========================================

    // 1. APAPUN ERRORNYA (Zod, Prisma, 404), HAPUS FILE FISIKNYA!
    if (file) {
      await fs.unlink(file.path).catch(() => {});
    }

    // 2. Tangani error spesifik Prisma
    if (error.code === "P2002") {
      throw new ResponseError(
        400,
        `A product named '${productName}' already exists in this store`,
      );
    }

    // 3. Lempar sisa errornya ke Error Middleware biar diurus di sana
    throw error;
  }
};

const updateProductInfo = async (userId, productId, request) => {
  const req = validate(updateProductValidation, request);

  const store = await prisma.store.findFirst({
    where: { user_id: userId, is_delete: false },
  });
  if (!store) {
    throw new ResponseError(404, "Store not found");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the product row (prevents race conditions between concurrent requests)
      const lockedProduct = await tx.$queryRaw`
  SELECT p.id FROM "products" p
  INNER JOIN "stores" s ON p.store_id = s.id
  WHERE p.id = ${productId}
    AND p.is_delete = false
    AND s.user_id = ${userId}
    AND s.is_delete = false
  FOR UPDATE
`;
      if (!lockedProduct || lockedProduct.length === 0) {
        throw new ResponseError(404, "Product not found or not owned by you");
      }

      const product = await tx.product.findFirst({
        where: {
          id: productId,
          is_delete: false,
          store: { user_id: userId, is_delete: false },
        },
        include: { variants: { where: { is_delete: false } } },
      });
      if (!product)
        throw new ResponseError(404, "Product not found or not owned by you");

      const reqVariants = req.variants || [];
      const existingVariantIds = product.variants.map((v) => v.id);

      const invalidVariantIds = reqVariants
        .filter((v) => v.id && !existingVariantIds.includes(v.id))
        .map((v) => v.id);
      if (invalidVariantIds.length > 0) {
        throw new ResponseError(
          400,
          "Some variants are invalid or do not belong to this product.",
        );
      }

      const existingVariantsToUpdate = reqVariants.filter(
        (v) => v.id && existingVariantIds.includes(v.id),
      );
      const newVariantsToCreate = reqVariants.filter((v) => !v.id);
      const retainedVariantIds = existingVariantsToUpdate.map((v) => v.id);
      const variantIdsToDelete = existingVariantIds.filter(
        (id) => !retainedVariantIds.includes(id),
      );

      const selectedAddonGroupIds = Array.isArray(req.addon_group_ids)
        ? req.addon_group_ids
        : [];

      if (selectedAddonGroupIds.length > 0) {
        const validAddonGroups = await tx.addonGroup.count({
          where: {
            id: { in: selectedAddonGroupIds },
            is_delete: false,
            store: { user_id: userId, is_delete: false },
          },
        });
        if (validAddonGroups !== selectedAddonGroupIds.length) {
          throw new ResponseError(
            400,
            "Some add-on groups are invalid for this product.",
          );
        }
      }

      const existingProductAddonGroups = await tx.productAddonGroup.findMany({
        where: { product_id: productId },
        select: { addon_group_id: true },
      });
      const existingAddonGroupIds = existingProductAddonGroups.map(
        (r) => r.addon_group_id,
      );

      const addonGroupsToCreate = selectedAddonGroupIds.filter(
        (id) => !existingAddonGroupIds.includes(id),
      );
      const addonGroupsToDelete = existingAddonGroupIds.filter(
        (id) => !selectedAddonGroupIds.includes(id),
      );

      // Check whether this product currently has any active queue.
      const activeQueueCount = await tx.queueDetail.count({
        where: {
          product_id: productId,
          queue: { status: { in: ["BELUM_BAYAR", "DIPROSES"] } },
        },
      });
      const hasActiveQueue = activeQueueCount > 0;

      if (hasActiveQueue) {
        // If there's an active queue, only name & description may change.
        // price, variants, and addon groups are frozen.
        const priceChanged =
          req.price !== undefined && req.price !== product.price;

        const variantsChanged =
          newVariantsToCreate.length > 0 ||
          variantIdsToDelete.length > 0 ||
          existingVariantsToUpdate.some((v) => {
            const current = product.variants.find((pv) => pv.id === v.id);
            return (
              current &&
              (v.name !== current.name ||
                v.additional_price !== current.additional_price)
            );
          });

        const addonGroupsChanged =
          addonGroupsToCreate.length > 0 || addonGroupsToDelete.length > 0;

        if (priceChanged || variantsChanged || addonGroupsChanged) {
          throw new ResponseError(
            400,
            "This product has an active order in progress. Only the name and description can be updated.",
          );
        }
      }

      return await tx.product.update({
        where: { id: productId },
        data: {
          name: req.name,
          price: req.price,
          description: req.description,
          updated_at: new Date(),
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
              deleteMany: { addon_group_id: { in: addonGroupsToDelete } },
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
    });
  } catch (error) {
    if (error instanceof ResponseError) throw error;
    if (error.code === "P2002") {
      throw new ResponseError(
        409,
        "This change conflicts with another update in progress, please try again.",
      );
    }
    throw error;
  }
};
const updateProductImage = async (userId, productId, file) => {
  if (!file) throw new ResponseError(400, "No image files were uploaded");

  // 1. Cari produk sekaligus pastikan kepemilikannya
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      is_delete: false,
      store: { user_id: userId, is_delete: false },
    },
    select: { id: true, image_url: true },
  });

  if (!product) {
    // PENTING: Kalau produk nggak ketemu, file baru yang terlanjur di-upload oleh multer
    // harus dihapus agar tidak menjadi sampah di server!
    if (file.path) {
      try {
        await unlink(file.path);
      } catch (e) {}
    }
    throw new ResponseError(404, "Product not found");
  }

  const oldImageUrl = product.image_url;
  const newImageUrl = `/uploads/${file.filename}`;

  // 2. Update database terlebih dahulu
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: { image_url: newImageUrl },
    select: { id: true, name: true, image_url: true },
  });

  // 3. Jika update database sukses dan produk punya gambar lama, hapus file lamanya
  if (oldImageUrl) {
    try {
      const oldFilePath = path.join(process.cwd(), "public", oldImageUrl);
      await unlink(oldFilePath);
    } catch (error) {
      // Abaikan jika file lama sudah tidak ada (ENOENT)
    }
  }

  return updatedProduct;
};
const updateProductAvailability = async (userId, request) => {
  const req = validate(updateAvailabilityValidation, request);
  const product = await prisma.product.findFirst({
    where: {
      id: req.productId,
      is_delete: false,
      store: {
        user_id: userId,
        is_delete: false,
      },
    },
  });

  if (!product) {
    throw new ResponseError(404, "Product not found");
  }

  return await prisma.product.update({
    where: { id: req.productId },
    data: { is_available: req.is_available },
    select: {
      id: true,
      name: true,
      is_available: true,
    },
  });
};
const deleteProduct = async (userId, id) => {
  const productId = validate(deleteProductValidation, id);
  // 1. Jalankan transaksi dengan pessimistic locking
  return await prisma.$transaction(async (tx) => {
    // Lock row produk untuk mencegah race condition dari request bersamaan
    const lockedProduct = await tx.$queryRaw`
  SELECT p.id FROM "products" p
  INNER JOIN "stores" s ON p.store_id = s.id
  WHERE p.id = ${productId}
    AND p.is_delete = false
    AND s.user_id = ${userId}
    AND s.is_delete = false
  FOR UPDATE
`;
    if (!lockedProduct || lockedProduct.length === 0) {
      throw new ResponseError(404, "Product not found or not owned by you");
    }
    // 2. Cari produk sekaligus pastikan kepemilikan store milik user yang login
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        is_delete: false,
        store: {
          user_id: userId,
          is_delete: false,
        },
      },
      select: {
        id: true,
        image_url: true,
      },
    });

    if (!product) {
      throw new ResponseError(404, "Product not found or not owned by you");
    }

    // 3. Cek apakah produk ini sedang ada di antrean aktif
    const activeQueueCount = await tx.queueDetail.count({
      where: {
        product_id: productId,
        queue: {
          status: { in: ["BELUM_BAYAR", "DIPROSES"] },
        },
      },
    });

    if (activeQueueCount > 0) {
      throw new ResponseError(
        400,
        "Cannot delete product with active orders in progress",
      );
    }

    // 4. Lakukan Soft Delete pada produk & varian
    const deletedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        is_delete: true,
        variants: {
          updateMany: {
            where: { is_delete: false },
            data: { is_delete: true },
          },
        },
      },
      select: {
        id: true,
        name: true,
        is_delete: true,
      },
    });

    // 5. Cleanup file fisik gambar produk jika ada
    if (product.image_url) {
      try {
        const filePath = path.join(process.cwd(), "public", product.image_url);
        await unlink(filePath);
      } catch (error) {
        // Abaikan jika file fisik tidak ditemukan
      }
    }

    return deletedProduct;
  });
};

export default {
  updateProductImage,
  createProduct,
  getProduct,
  getAllProducts,
  updateProductInfo,
  updateProductAvailability,
  deleteProduct,
};
