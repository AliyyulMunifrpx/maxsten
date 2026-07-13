import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import {
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
        select: {
          addon_group: {
            select: {
              id: true,
              name: true,
              addons: {
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
export default {
  getProduct,
  getAllProducts
};
