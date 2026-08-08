export const ROUTES = {
  public: {
    home: "/",
    login: "/login",
    register: "/register",
    verifyEmail: "/verify-email",
    forgotPassword: "/forgot-password",
    updatePassword: "/update-password",
  },

  dashboard: {
    home: "/dashboard",
  },

  store: {
    create: "/store/create",
    edit: "/store/edit",
  },

  product: {
    list: "/products",
    create: "/products/create",
    detail: (id) => `/products/${id}`,
    edit: (id) => `/products/${id}/edit`,
  },
};
