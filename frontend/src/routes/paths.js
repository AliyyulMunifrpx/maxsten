import {
  Home,
  Package,
  ShoppingBag,
  ChartColumn,
  Store,
  CirclePlus,
  MessageCircleX,
  QrCode,
} from "lucide-react";

export const ROUTES = {
  public: {
    home: { path: "/", title: "Beranda" },
    login: { path: "/login", title: "Masuk" },
    register: { path: "/register", title: "Daftar" },
    verifyEmail: { path: "/verify-email", title: "Verifikasi Email" },
    forgotPassword: { path: "/forgot-password", title: "Lupa Kata Sandi" },
    updatePassword: { path: "/update-password", title: "Perbarui Kata Sandi" },
  },

  dashboard: {
    home: {
      path: "/dashboard",
      title: "Dashboard", // Tetap dipertahankan karena lebih umum di industri IT (bisa diganti "Dasbor" jika ingin 100% baku)
      icon: Home,
    },
  },

  store: {
    list: {
      path: "/store",
      title: "Toko",
      icon: Store,
    },
    create: { path: "/store/create", title: "Buat Toko" },
    edit: { path: "/store/edit", title: "Edit Toko" },
  },

  product: {
    list: {
      path: "/products",
      title: "Produk",
      icon: Package,
    },
    create: { path: "/products/create", title: "Tambah Produk" },
  },

  orders: {
    list: {
      path: "/orders",
      title: "Pesanan",
      icon: ShoppingBag,
      showBadge: true,
    },
  },

  addons: {
    list: {
      path: "/add-ons",
      title: "Add-on", // Biasanya tetap "Add-on" atau bisa diganti "Menu Tambahan"
      icon: CirclePlus,
    },
  },

  analytics: {
    list: {
      path: "/analytics",
      title: "Analitik",
      icon: ChartColumn,
    },
  },

  cancelReason: {
    list: {
      path: "/cancel-reasons",
      title: "Alasan Batal",
      icon: MessageCircleX,
    },
  },
  buyer: {
    catalog: {
      path: "/catalog/:storeId",
      title: "Katalog Toko",
    },
  },
  qrCode: {
    print: {
      path: "/qr-code",
      title: 'Qr-Code',
      icon: QrCode
    },
  },
};
