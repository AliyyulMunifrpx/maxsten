import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./utils/i18n.js";
import "./index.css";
import Layout from "./components/layout/layout.jsx";
import Register from "./components/users/register.jsx";
import { Toaster } from "react-hot-toast";
import Login from "./components/users/login.jsx";
import ProtectedRoute from "./components/layout/protected-route.jsx";
import CreateStore from "./components/seller/create-store.jsx";
import CreateProduct from "./components/seller/create-product.jsx";
import CreateAddon from "./components/seller/create-addon.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DisplayProduct from "./components/buyer/display-product.jsx";
import SocketManager from "./components/layout/socket-manajer.jsx";
import DashboardSeller from "./components/seller/dashboard-seller.jsx";
import EditStore from "./components/seller/edit-store.jsx";
import EditProduct from "./components/seller/edit-products.jsx";

// 1. IMPORT TOOLTIP DARI SHADCN (Bisa pakai alias @/ atau relative path ./)
import { TooltipProvider } from "@/components/ui/tooltip";
import EditProfile from "./components/users/settings";
import StoreHistory from "./components/seller/history.jsx";
import EditJadwal from "./components/seller/edit-operational-hours.jsx";
import EditAddon from "./components/seller/addon/edit-addon.jsx";
import AllProduct from "./components/seller/product/allProduct.jsx";
import CreateCancelReason from "./components/seller/store/cancelReasonTemplate.jsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* 2. BUNGKUS SELURUH APLIKASI DENGAN TOOLTIP PROVIDER */}
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SocketManager />
          <Toaster position="top-center" />
          <Routes>
            {/* Halaman publik */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/:storeId/products" element={<DisplayProduct />} />

            {/* Halaman seller */}
            <Route path="/seller" element={<ProtectedRoute />}>
              {/* Komponen Layout ini yang bakal jadi tempat mangkalnya Sidebar Shadcn nanti */}
              <Route element={<Layout />}>
                <Route index element={<DashboardSeller />} />
                <Route path="history" element={<StoreHistory />} />
                <Route path="create-store" element={<CreateStore />} />
                <Route path="create-product" element={<CreateProduct />} />
                <Route path="create-addon" element={<CreateAddon />} />
                <Route path="edit-store" element={<EditStore />} />
                <Route path="edit-profile" element={<EditProfile />} />
                <Route path="edit-jadwal" element={<EditJadwal />} />
                <Route
                  path="create-reason-cancel-templates"
                  element={<CreateCancelReason />}
                />
                <Route
                  path="all-products/:publicId"
                  element={<AllProduct></AllProduct>}
                ></Route>
                <Route
                  path="edit-addon-group/:id"
                  element={<EditAddon></EditAddon>}
                ></Route>
                <Route
                  path="products/:productId/edit"
                  element={<EditProduct />}
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </TooltipProvider>
  </StrictMode>,
);
