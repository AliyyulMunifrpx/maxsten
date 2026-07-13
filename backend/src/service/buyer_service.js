import { prisma } from "../application/database.js";
import { ResponseError } from "../error/response_error.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import {
  cancelQueueValidation,
  createQueueValidation,
  getAllProductDisplayValidation,
  getQueueValidation,
} from "../validation/buyer_validation.js";
import { validate } from "../validation/validation.js";

const createQueue = async (request) => {
  const req = validate(createQueueValidation, request);
  
  // 1. Tarik data toko sekalian sama jadwal operasionalnya
  const store = await prisma.store.findFirst({
    where: { public_id: req.public_id, is_delete: false },
    include: {
      operational_hours: true, // Wajib ditarik biar bisa ngitung jam
    }
  });

  if (!store) throw new ResponseError(404, "ERR_STORE_NOT_FOUND");

  // 2. Kalkulasi apakah detik ini toko beneran buka?
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);
  
  // 3. Kalau ternyata tutup, tolak pesanannya
  if (!isStoreOpen) {
    throw new ResponseError(400, "Maaf toko sedang tutup");
  }
  // 1. CEK GUEST_ID (Guard Clause)
  await prisma.guest.upsert({
    where: { id: req.guest_id },
    update: {},
    create: { id: req.guest_id },
  });

  // 2. Pastikan Guest tidak punya antrean aktif
  const activeQueue = await prisma.queue.findFirst({
    where: {
      guest_id: req.guest_id,
      store_id: store.id,
      status: "BELUM_BAYAR",
    },
  });
  if (activeQueue) {
    throw new ResponseError(400, "ERR_ACTIVE_QUEUE_EXISTS");
  }

  // 3. Ambil Produk SEKALI GUS dengan variannya dan addon untuk kalkulasi harga
  const requestedProductIds = [
    ...new Set(req.items.map((item) => item.product_id)),
  ];
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: requestedProductIds }, store_id: store.id },
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

  if (existingProducts.length !== requestedProductIds.length) {
    throw new ResponseError(404, "Beberapa produk tidak ditemukan");
  }

  // 4. HITUNG TOTAL HARGA (Produk + Varian + Addon)
  let totalPrice = 0;
  const productMap = new Map(existingProducts.map((p) => [p.id, p]));

  const queueDetailsData = req.items.map((item) => {
    const product = productMap.get(item.product_id);
    let variantPrice = 0;
    let validVariantId = null;

    // Kalau pembeli milih varian, cek harganya
    if (item.variant_id) {
      const selectedVariant = product.variants.find(
        (v) => v.id === item.variant_id,
      );
      if (selectedVariant) {
        variantPrice = selectedVariant.additional_price;
        validVariantId = selectedVariant.id;
      } else {
        throw new ResponseError(
          400,
          `Varian tidak valid untuk produk ${product.name}`,
        );
      }
    }

    // Ambil daftar addon yang tersedia untuk produk ini
    const availableAddons = product.productAddonGroups.flatMap((pag) =>
      pag.addon_group.addons,
    );
    const addonMap = new Map(availableAddons.map((addon) => [addon.id, addon]));

    const selectedAddonIds = Array.isArray(item.selected_addons)
      ? [...new Set(item.selected_addons)]
      : [];

    const selectedAddonDetails = selectedAddonIds.map((addonId) => {
      const addon = addonMap.get(addonId);
      if (!addon) {
        throw new ResponseError(
          400,
          `Pilihan add-on tidak valid untuk produk ${product.name}`,
        );
      }
      return {
        id: addon.id,
        name: addon.name,
        price: addon.price,
      };
    });

    const addonPrice = selectedAddonDetails.reduce(
      (sum, addon) => sum + addon.price,
      0,
    );

    // Kalkulasi: (Harga Dasar + Harga Varian + Harga Addon) x Jumlah
    totalPrice += (product.price + variantPrice + addonPrice) * item.quantity;

    return {
      product_id: item.product_id,
      variant_id: validVariantId, // Simpan varian ke keranjang
      quantity: item.quantity,
      selected_addons: selectedAddonDetails,
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastQueue = await prisma.queue.findFirst({
    where: { store_id: store.id, created_at: { gte: today } },
    orderBy: { queue_number: "desc" },
  });

  const queueNumber = lastQueue ? lastQueue.queue_number + 1 : 1;
// Ambil ID semua produk yang mau dibeli dari request
const productIds = req.items.map((item) => item.product_id);

// Cari produknya di database
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
});

// 👉 [SATPAM BARU] Cek apakah ada produk yang stoknya habis atau dihapus
for (const item of req.items) {
  const productData = products.find((p) => p.id === item.product_id);
  
  if (!productData) {
    throw new ResponseError(404, "Ada produk yang tidak ditemukan.");
  }
  
  if (!productData.is_available) {
    // Kalau habis, tolak pesanannya dari backend!
    throw new ResponseError(400, `Maaf, produk ${productData.name} baru saja habis.`);
  }
}
  // 5. SIMPAN KE DATABASE
  return await prisma.queue.create({
    data: {
      store_id: store.id,
      queue_number: queueNumber,
      guest_id: req.guest_id,
      note: req.note,
      total_price: totalPrice,
      queueDetails: {
        create: queueDetailsData,
      },
    },
    include: {
      store: true, // Biar controllernya tau public_id toko buat notif Socket
      queueDetails: {
        include: {
          product: true,
          variant: true, // <-- Tampilkan varian di balasan API
        },
      },
    },
  });
};
const getAllProductDisplay = async (request) => {
  const req = validate(getAllProductDisplayValidation, request);
  const store = await prisma.store.findUnique({
    where: {
      public_id: req,
      is_delete: false
    },
    select: {
      name: true,
      description: true, 
      address: true, 
      logo_url: true, 
      
      // ❌ HAPUS is_open: true

      // ✅ WAJIB DITAMBAH: Tarik data buat dihitung sama helper
      manual_status: true,
      manual_updated_at: true,
      operational_hours: true,

      products: {
        select: {
          id: true,
          name: true,
          price: true,
          image_url: true, 
          is_available: true,
          variants: {
            select: {
              id: true,
              name: true,
              additional_price: true,
            },
          },
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
        },
      },
    },
  });

  if (!store) {
    throw new ResponseError(404, "ERR_STORE_NOT_FOUND");
  }

  // 🔥 KALKULASI ON-THE-FLY UNTUK PEMBELI 🔥
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  return {
    ...store,
    is_open: isStoreOpen, // Kembalikan ke frontend pembeli sebagai boolean
  };
};
const getQueue = async (request) => {
  const req = validate(getQueueValidation, request);
  const queue = await prisma.queue.findUnique({
    where: {
      id: req.queueId,
      store: {
        public_id: req.public_id,
        is_delete:false
      },
    },
    include: {
      queueDetails: {
        include: {
          product: true,
          variant: true, // <-- Tambahan biar di struk kelihatan nama variannya
        },
      },
    },
  });

  if (!queue) {
    throw new ResponseError(404, "ERR_QUEUE_NOT_FOUND");
  }

  return queue;
};
const cancelQueue = async (request) => {
  const req = validate(cancelQueueValidation, request);

  // 1. Cari antrean yang spesifik milik toko dan guest ini
  const queue = await prisma.queue.findFirst({
    where: {
      id: req.queueId,
      store: { public_id: req.public_id, is_delete: false },
      guest_id: req.guest_id,
    },
  });

  if (!queue) {
    throw new ResponseError(404, "Pesanan tidak ditemukan atau bukan milikmu.");
  }

  // 2. Guard Clause: Cuma boleh batal kalau belum diproses!
  if (queue.status !== "BELUM_BAYAR") {
    throw new ResponseError(400, "Pesanan sudah diproses, tidak bisa dibatalkan.");
  }

  // 3. Update statusnya jadi DIBATALKAN
  return await prisma.queue.update({
    where: { id: queue.id },
    data: { status: "DIBATALKAN" },
    include: {
      queueDetails: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
};
export default { createQueue, getAllProductDisplay, getQueue , cancelQueue};
