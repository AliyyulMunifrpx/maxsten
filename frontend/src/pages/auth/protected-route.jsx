import { Navigate, Outlet } from "react-router-dom";
import { useAuthSession } from "../../hooks/auth.js";

export default function ProtectedRoute() {
  const { data: user, isLoading, isError } = useAuthSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-medium text-gray-500">Memeriksa akses...</p>
      </div>
    );
  }


  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
