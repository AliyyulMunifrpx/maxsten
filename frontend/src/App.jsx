// src/App.jsx
import { Routes, Route, Outlet, useParams } from "react-router-dom";
import AuthLayout from "./layouts/auth-layout";
import { ROUTES } from "./routes/paths";
import RegisterPage from "./pages/auth/register";
import VerifyEmailPage from "./pages/auth/verify-email";
import LoginPage from "./pages/auth/login";
import { Toaster } from "react-hot-toast";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import UpdatePasswordPage from "./pages/auth/update-password";
import ProtectedRoute from "./pages/auth/protected-route";
import DashboardLayout from "./layouts/dashboard-layout";
import DashboardPage from "./pages/dashboard/dashboard";
import CreateStorePage from "./pages/store/create";
import ProductPage from "./pages/product/page";
import AddonsPage from "./pages/addons/page";
import StorePage from "./pages/store/page";
import AnalyticsPage from "./pages/analytics/page";
import OrderPage from "./pages/order/page";
import { CartProvider } from "./context/cart-context";
import CancelReasonsPage from "./pages/cancel-reason/page.jsx";
import StoreCatalogPage from "./pages/buyer/catalog.jsx";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./hooks/socket.js";
import { useEffect } from "react";
import StoreQrPage from "./pages/qr-code/page.jsx";

// KOMPONEN LAYOUT UNTUK MENGAMBIL PARAMETER URL
const StoreLayout = () => {
  const { storeId } = useParams();
  return (
    <CartProvider storeId={storeId}>
      <Outlet />
    </CartProvider>
  );
};
function ProtectedLayout() {
  return (
    <>
      <SocketListener />

      <Outlet />
    </>
  );
}
function SocketListener() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.emit("JOIN_STORE_ROOM");

    const handleNewQueue = () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      queryClient.invalidateQueries({ queryKey: ["store-queues"] });
    };

    const handleStatusUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      queryClient.invalidateQueries({ queryKey: ["store-queues"] });
    };

    socket.on("NEW_QUEUE", handleNewQueue);
    socket.on("STATUS_UPDATED", handleStatusUpdated);

    return () => {
      socket.off("NEW_QUEUE", handleNewQueue);
      socket.off("STATUS_UPDATED", handleStatusUpdated);
    };
  }, [socket, queryClient]);

  return null;
}
function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.public.login.path} element={<LoginPage />} />
          <Route
            path={ROUTES.public.register.path}
            element={<RegisterPage />}
          />
          <Route
            path={ROUTES.public.verifyEmail.path}
            element={<VerifyEmailPage />}
          />
          <Route
            path={ROUTES.public.forgotPassword.path}
            element={<ForgotPasswordPage />}
          />
          <Route
            path={ROUTES.public.updatePassword.path}
            element={<UpdatePasswordPage />}
          />
        </Route>

        {/* ✅ HANYA 1 ROUTE UNTUK BUYER (Semuanya dihandle via Modal) */}
        <Route path={ROUTES.buyer.catalog.path} element={<StoreLayout />}>
          <Route index element={<StoreCatalogPage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route element={<DashboardLayout />}>
              <Route
                path={ROUTES.dashboard.home.path}
                element={<DashboardPage />}
              />

              <Route path={ROUTES.store.list.path} element={<StorePage />} />

              <Route path={ROUTES.orders.list.path} element={<OrderPage />} />

              <Route
                path={ROUTES.store.create.path}
                element={<CreateStorePage />}
              />

              <Route
                path={ROUTES.product.list.path}
                element={<ProductPage />}
              />

              <Route path={ROUTES.addons.list.path} element={<AddonsPage />} />

              <Route
                path={ROUTES.analytics.list.path}
                element={<AnalyticsPage />}
              />

              <Route
                path={ROUTES.cancelReason.list.path}
                element={<CancelReasonsPage />}
              />
              <Route
                path={ROUTES.qrCode.print.path}
                element={<StoreQrPage />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
