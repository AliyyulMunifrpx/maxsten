// src/App.jsx

import { useEffect } from "react";
import { Routes, Route, Outlet, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

// ============================================================
// LAYOUT
// ============================================================
import AuthLayout from "./layouts/auth-layout";
import DashboardLayout from "./layouts/dashboard-layout";

// ============================================================
// GUARD
// ============================================================
import ProtectedRoute from "./pages/auth/protected-route";

// ============================================================
// CONTEXT
// ============================================================
import { CartProvider } from "./context/cart-context";

// ============================================================
// HOOKS
// ============================================================
import { useSocket } from "./hooks/socket.js";

// ============================================================
// ROUTES
// ============================================================
import { ROUTES } from "./routes/paths";

// ============================================================
// PUBLIC PAGES
// ============================================================
import HomePage from "./pages/landing-page/home-page.jsx";

import LoginPage from "./pages/auth/login";
import RegisterPage from "./pages/auth/register";
import VerifyEmailPage from "./pages/auth/verify-email";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import UpdatePasswordPage from "./pages/auth/update-password";

// ============================================================
// BUYER PAGES
// ============================================================
import StoreCatalogPage from "./pages/buyer/catalog.jsx";

// ============================================================
// DASHBOARD PAGES
// ============================================================
import DashboardPage from "./pages/dashboard/dashboard";
import StorePage from "./pages/store/page";
import CreateStorePage from "./pages/store/create";
import ProductPage from "./pages/product/page";
import AddonsPage from "./pages/addons/page";
import OrderPage from "./pages/order/page";
import AnalyticsPage from "./pages/analytics/page";
import CancelReasonsPage from "./pages/cancel-reason/page.jsx";
import StoreQrPage from "./pages/qr-code/page.jsx";
import LandingPageLayout from "./layouts/landing-page-layout.jsx";

// ============================================================
// BUYER STORE LAYOUT
// ============================================================
function StoreLayout() {
  const { storeId } = useParams();

  return (
    <CartProvider storeId={storeId}>
      <Outlet />
    </CartProvider>
  );
}

// ============================================================
// SOCKET LISTENER
// ============================================================
function SocketListener() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    // Join toko room
    socket.emit("JOIN_STORE_ROOM");

    const invalidateQueueQueries = () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });

      queryClient.invalidateQueries({
        queryKey: ["store-queues"],
      });
    };

    socket.on("NEW_QUEUE", invalidateQueueQueries);
    socket.on("STATUS_UPDATED", invalidateQueueQueries);

    return () => {
      socket.off("NEW_QUEUE", invalidateQueueQueries);
      socket.off("STATUS_UPDATED", invalidateQueueQueries);
    };
  }, [socket, queryClient]);

  return null;
}

// ============================================================
// PROTECTED APP LAYOUT
// ============================================================
function ProtectedLayout() {
  return (
    <>
      <SocketListener />
      <Outlet />
    </>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  return (
    <>
      <Toaster position="top-center" />

      <Routes>
        {/* ======================================================
            PUBLIC
        ====================================================== */}

        {/* Landing Page */}

        <Route element={<LandingPageLayout></LandingPageLayout>}>
          {" "}
          <Route path={ROUTES.public.home.path} element={<HomePage />} />
        </Route>
        {/* Authentication */}
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

        {/* ======================================================
            BUYER
        ====================================================== */}

        <Route path={ROUTES.buyer.catalog.path} element={<StoreLayout />}>
          <Route index element={<StoreCatalogPage />} />
        </Route>

        {/* ======================================================
            PROTECTED
        ====================================================== */}

        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route element={<DashboardLayout />}>
              {/* ------------------------------------------------
                  DASHBOARD
              ------------------------------------------------ */}
              <Route
                path={ROUTES.dashboard.home.path}
                element={<DashboardPage />}
              />

              {/* ------------------------------------------------
                  STORE
              ------------------------------------------------ */}
              <Route path={ROUTES.store.list.path} element={<StorePage />} />

              <Route
                path={ROUTES.store.create.path}
                element={<CreateStorePage />}
              />

              {/* ------------------------------------------------
                  PRODUCT
              ------------------------------------------------ */}
              <Route
                path={ROUTES.product.list.path}
                element={<ProductPage />}
              />

              {/* ------------------------------------------------
                  ADD-ONS
              ------------------------------------------------ */}
              <Route path={ROUTES.addons.list.path} element={<AddonsPage />} />

              {/* ------------------------------------------------
                  ORDERS
              ------------------------------------------------ */}
              <Route path={ROUTES.orders.list.path} element={<OrderPage />} />

              {/* ------------------------------------------------
                  ANALYTICS
              ------------------------------------------------ */}
              <Route
                path={ROUTES.analytics.list.path}
                element={<AnalyticsPage />}
              />

              {/* ------------------------------------------------
                  CANCEL REASONS
              ------------------------------------------------ */}
              <Route
                path={ROUTES.cancelReason.list.path}
                element={<CancelReasonsPage />}
              />

              {/* ------------------------------------------------
                  QR CODE
              ------------------------------------------------ */}
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
