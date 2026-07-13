import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    // React nanya ke backend pas komponen ini dirender
    const checkUser = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_PATH}/users/me`,
          {
            method: "GET",
            credentials: "include", // WAJIB TRUE biar cookie gaibnya ikut keikirim
          },
        );
        const result = await response.json();
        localStorage.setItem("user", JSON.stringify(result.data));
        if (response.ok) {
          setIsAuth(true); // Lolos satpam
        } else {
          setIsAuth(false); // Ditolak
        }
      } catch {
        setIsAuth(false);
      }
    };

    checkUser();
  }, []);

  // Selagi nunggu balasan API, tampilkan loading
  if (isAuth === null) {
    return <div className="p-10 text-center">Memeriksa akses...</div>;
  }

  // Kalau ditolak, tendang ke login pakai Navigate bawaan React Router
  if (isAuth === false) {
    return <Navigate to="/login" replace />;
  }

  // Kalau lolos, render halaman yang dituju (Outlet)
  return <Outlet />;
}
