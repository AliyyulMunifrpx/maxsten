// src/pages/auth/protected-route.jsx

import { Navigate, Outlet } from "react-router-dom";
import { useAuthSession } from "../../hooks/auth.js";
import { useDocumentTitle } from "../../hooks/use-document-title.js";
import MaxstenLoader from "../loading-state/maxsten-loader.jsx";

export default function ProtectedRoute() {
  const { data: user, isLoading, isError } = useAuthSession();
  useDocumentTitle("Memeriksa Akses");
  
  if (isLoading) {
    // Panggil loader dengan teks khusus auth
    return <MaxstenLoader text="Memeriksa akses..." />;
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
