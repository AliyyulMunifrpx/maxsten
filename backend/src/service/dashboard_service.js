import { prisma } from "../application/database.js";
import { calculateStoreStatus } from "../utils/store_status_helper.js";
import { getDashboardValidation } from "../validation/dashboard_validation.js";
import { validate } from "../validation/validation.js";

const getDashboard = async (request) => {
  const userId = validate(getDashboardValidation, request);

  const store = await prisma.store.findUnique({
    where: {
      user_id: userId,
      is_delete: false,
    },
    select: {
      id: true, // ID diperlukan untuk query antrean agregasi
      public_id: true,
      name: true,
      description: true,
      address: true,
      logo_url: true,
      manual_status: true,
      manual_updated_at: true,
      operational_hours: true, // Tetap diambil untuk logic calculateStoreStatus

      _count: {
        select: {
          products: { where: { is_delete: false } },
          addonGroups: { where: { is_delete: false } },
        },
      },
      products: {
        where: { is_delete: false },
        take: 5,
        select: {
          id: true,
          name: true,
          price: true,
          image_url: true,
          is_available: true,
        },
      },
      addonGroups: {
        where: { is_delete: false },
        take: 5,
        select: {
          id: true,
          name: true,
          addons: {
            where: { is_delete: false },
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!store) {
    throw new ResponseError(404, "Toko tidak ditemukan");
  }

  // ==========================================
  // LOGIKA RINGKASAN PENJUALAN HARI INI
  // ==========================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aggSelesai = await prisma.queue.aggregate({
    where: {
      store_id: store.id,
      status: "SELESAI",
      created_at: { gte: today },
    },
    _sum: { total_price: true },
    _count: true,
  });

  const aggBatal = await prisma.queue.aggregate({
    where: {
      store_id: store.id,
      status: "DIBATALKAN",
      created_at: { gte: today },
    },
    _count: true,
  });

  // Kalkulasi status buka/tutup secara realtime
  const isStoreOpen = calculateStoreStatus(store, store.operational_hours);

  // Rapikan response, JANGAN masukkan operational_hours ke hasil return
  return {
    public_id: store.public_id,
    name: store.name,
    description: store.description,
    address: store.address,
    logo_url: store.logo_url,
    is_open: isStoreOpen,
    total_products: store._count.products,
    total_addon_groups: store._count.addon_groups,
    products: store.products,
    addon_groups: store.addon_groups,

    // Data snapshot untuk metrik dashboard
    sales_today: {
      omzet: aggSelesai._sum.total_price || 0,
      pesanan_selesai: aggSelesai._count || 0,
      pesanan_batal: aggBatal._count || 0,
    },
  };
};

export default { getDashboard };
