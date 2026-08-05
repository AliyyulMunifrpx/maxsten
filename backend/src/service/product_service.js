import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
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
import { uploadImageToSupabase } from "../utils/upload_to_supabase.js";
import { deleteImageFromSupabase } from "../utils/delete_to_supabase.js";
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
  let productName = request.name;

  // 1. Deklarasikan variabel untuk menampung data dari Supabase
  let uploadedImageUrl = null;
  let supabaseFileName = null;

  try {
    // 1. Rapihkan data string dari FormData
    if (typeof request.variants === "string") {
      // Abaikan jika string kosong
      if (request.variants.trim() === "") {
        delete request.variants; // atau set menjadi [] jika itu ekspektasi database/logic Anda
      } else {
        try {
          request.variants = JSON.parse(request.variants);
        } catch (e) {
          throw new ResponseError(400, "Invalid data format variants");
        }
      }
    }

    if (typeof request.addon_group_ids === "string") {
      // Abaikan jika string kosong
      if (request.addon_group_ids.trim() === "") {
        delete request.addon_group_ids; // atau set menjadi [] jika itu ekspektasi database/logic Anda
      } else {
        try {
          request.addon_group_ids = JSON.parse(request.addon_group_ids);
        } catch (e) {
          throw new ResponseError(
            400,
            "The format of the addon_group_ids data is invalid",
          );
        }
      }
    }
    if (typeof request.price === "string") {
      request.price = Number(request.price);
    }

    // 2. Validasi dengan Zod
    const req = validate(createProductValidation, request);
    productName = req.name;

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

    // --- 5. UPLOAD GAMBAR KE SUPABASE (Jika Ada) ---
    if (file) {
      // Kita panggil bucket "product-images", dan bebas pakai folder apa, misal "images"
      const result = await uploadImageToSupabase(
        file,
        "product-images",
        "images",
      );
      uploadedImageUrl = result.url;
      supabaseFileName = result.fileName;
    }
    // -----------------------------------------------

    const variantNames = (req.variants ?? []).map((v) =>
      v.name.trim().toLowerCase(),
    );

    if (variantNames.length !== new Set(variantNames).size) {
      throw new ResponseError(
        400,
        "Variant names within a product must be unique",
      );
    }

    // 6. Eksekusi Create
    const newProduct = await prisma.product.create({
      data: {
        name: req.name.trim().toLowerCase(),
        description:
          req.description !== undefined ? req.description.trim() : undefined,
        price: req.price,
        image_url: uploadedImageUrl, // <-- Masukkan URL Supabase di sini
        store_id: store.id,

        ...(req.variants &&
          req.variants.length > 0 && {
            variants: {
              create: req.variants.map((variant) => ({
                name: variant.name.trim().toLowerCase(),
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
        variants: {
          where: {
            is_delete: false,
          },
        },
        productAddonGroups: {
          where: {
            addon_group: {
              is_delete: false,
            },
          },
          include: {
            addon_group: {
              include: {
                addons: {
                  where: {
                    is_delete: false,
                  },
                },
              },
            },
          },
        },
      },
    });
    return newProduct;
  } catch (error) {
    // ==========================================
    // ZONA PENGHANCURAN FILE ZOMBIE
    // ==========================================

    // 1. Jika gambar sudah terupload ke Supabase, TAPI Prisma (atau validasi setelahnya) gagal, hapus gambarnya!
    if (supabaseFileName) {
      await deleteImageFromSupabase(supabaseFileName, "product-images").catch(
        () => {},
      );
    }

    // Catatan: fs.unlink dihapus karena kita pakai memoryStorage

    if (error.code === "P2002") {
      const modelName = error.meta?.modelName;

      if (modelName === "Product") {
        throw new ResponseError(
          409,
          `A product named '${productName}' already exists in this store.`,
        );
      }

      if (modelName === "ProductVariant" || modelName === "Variant") {
        throw new ResponseError(
          409,
          "A variant with this name already exists in this product.",
        );
      }
    }

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
      const variantNames = reqVariants.map((v) => v.name.trim().toLowerCase());

      if (variantNames.length !== new Set(variantNames).size) {
        throw new ResponseError(
          400,
          "Variant names within a product must be unique",
        );
      }
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
          name: req.name ? req.name.trim().toLowerCase() : undefined,
          price: req.price,
          description:
            req.description !== undefined ? req.description.trim() : undefined,
          updated_at: new Date(),

          variants: {
            updateMany: {
              where: {
                id: {
                  notIn: retainedVariantIds,
                },
              },
              data: {
                is_delete: true,
              },
            },

            update: existingVariantsToUpdate.map((v) => ({
              where: {
                id: v.id,
              },
              data: {
                name: v.name.trim().toLowerCase(),
                additional_price: v.additional_price,
              },
            })),

            create: newVariantsToCreate.map((v) => ({
              name: v.name.trim().toLowerCase(),
              additional_price: v.additional_price,
            })),
          },

          productAddonGroups: {
            ...(addonGroupsToDelete.length > 0 && {
              deleteMany: {
                addon_group_id: {
                  in: addonGroupsToDelete,
                },
              },
            }),

            ...(addonGroupsToCreate.length > 0 && {
              create: addonGroupsToCreate.map((addonGroupId) => ({
                addon_group_id: addonGroupId,
              })),
            }),
          },
        },
        include: {
          variants: {
            where: {
              is_delete: false,
            },
          },

          productAddonGroups: {
            where: {
              addon_group: {
                is_delete: false,
              },
            },
            include: {
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
        },
      });
    });
  } catch (error) {
    if (error.code === "P2002") {
      const target = error.meta?.target;

      if (target?.includes("product_name_active_unique")) {
        throw new ResponseError(
          409,
          "A product with this name already exists in your store.",
        );
      }

      if (target?.includes("variant_name_active_unique")) {
        throw new ResponseError(
          409,
          "A variant with this name already exists in this product.",
        );
      }

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
    // 🔥 PERBAIKAN 1: Tidak perlu lagi fs.unlink.
    // File ada di memori RAM dan akan otomatis dibersihkan Node.js
    // jika kita throw error di sini.
    throw new ResponseError(404, "Product not found");
  }

  const oldImageUrl = product.image_url;

  // Siapkan variabel untuk menampung hasil upload Supabase
  let uploadedImageUrl = null;
  let newSupabaseFileName = null;

  // --- 2. UPLOAD GAMBAR BARU KE SUPABASE ---
  // Upload harus sukses dulu sebelum menyentuh database
  const result = await uploadImageToSupabase(file, "product-images", "images");
  uploadedImageUrl = result.url;
  newSupabaseFileName = result.fileName;

  let updatedProduct;
  try {
    // --- 3. UPDATE DATABASE ---
    updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { image_url: uploadedImageUrl }, // Gunakan URL Publik dari Supabase
      select: { id: true, name: true, image_url: true },
    });
  } catch (error) {
    // --- 4. ROLLBACK (ANTI ZOMBIE FILE) ---
    // Jika database gagal update (misal karena timeout Prisma),
    // hapus file yang BARU SAJA berhasil di-upload ke Supabase
    if (newSupabaseFileName) {
      await deleteImageFromSupabase(
        newSupabaseFileName,
        "product-images",
      ).catch(() => {});
    }
    throw error; // Lempar ulang errornya agar ditangkap oleh error middleware
  }

  // --- 5. HAPUS GAMBAR LAMA (JIKA ADA) ---
  // Kode ini hanya jalan jika proses update Database berhasil 100%
  if (oldImageUrl) {
    if (oldImageUrl.includes("supabase.co")) {
      try {
        // Ekstrak nama file lama dari URL Publik Supabase
        const parts = oldImageUrl.split("/product-images/");

        if (parts.length > 1) {
          const oldFileName = parts[1];
          // Hapus gambar lama dari bucket
          await deleteImageFromSupabase(oldFileName, "product-images");
        }
      } catch (error) {
        // Log error tanpa throw agar API tetap merespons kesuksesan update produk
        console.error(
          `[updateProductImage] Failed to delete OLD image from Supabase for product ${productId}:`,
          error.message,
        );
      }
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
  let imageToDeleteUrl = null;

  // Mulai Transaksi Database
  const deletedProduct = await prisma.$transaction(async (tx) => {
    // 1. Lock row produk untuk mencegah race condition
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

    // 2. Cari produk (untuk mendapatkan image_url)
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        is_delete: false,
        store: { user_id: userId, is_delete: false },
      },
      select: { id: true, image_url: true },
    });

    if (!product) {
      throw new ResponseError(404, "Product not found or not owned by you");
    }

    // SIMPAN URL GAMBAR untuk diproses di luar transaksi
    if (product.image_url) {
      imageToDeleteUrl = product.image_url;
    }

    // 3. Cek antrean aktif
    const activeQueueCount = await tx.queueDetail.count({
      where: {
        product_id: productId,
        queue: { status: { in: ["BELUM_BAYAR", "DIPROSES"] } },
      },
    });

    if (activeQueueCount > 0) {
      throw new ResponseError(
        400,
        "Cannot delete product with active orders in progress",
      );
    }

    // 4. Soft Delete pada produk & varian
    return await tx.product.update({
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
      select: { id: true, name: true, is_delete: true },
    });
  }); // <--- TRANSAKSI DATABASE SELESAI DI SINI (Koneksi & Lock dilepas)

  // --- 5. Cleanup file gambar produk di Supabase ---
  // Dieksekusi DI LUAR transaksi agar tidak memblokir database
  if (imageToDeleteUrl && imageToDeleteUrl.includes("supabase.co")) {
    try {
      const parts = imageToDeleteUrl.split("/product-images/");
      if (parts.length > 1) {
        const fileName = parts[1];
        await deleteImageFromSupabase(fileName, "product-images");
      }
    } catch (error) {
      // Transaksi database sudah berhasil, jadi kita cukup log error-nya saja
      // jika Supabase gagal menghapus gambarnya.
      console.error(
        `[deleteProduct] Failed to delete image from Supabase for product ${productId}:`,
        error.message,
      );
    }
  }

  return deletedProduct;
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
