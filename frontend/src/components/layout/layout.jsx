import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./app-sidebar.jsx"; // Sesuaikan path file-nya

export default function Layout() {
  return (
    <SidebarProvider>
      {/* 1. Render Sidebarnya di kiri */}
      <AppSidebar />

      {/* 2. Render Konten Utamanya di kanan */}
      <main className="flex-1 w-full bg-[#FAF9F6]">
        
        {/* Tombol Hamburger buat Mobile (Disembunyiin kalau di PC) */}
        <div className="flex sticky top-0 h-14 items-center border-b border-[#E4E1D8] bg-white px-4">
          <SidebarTrigger className="text-[#1C2321]" />
          <span className="ml-3 text-sm font-bold text-[#1C2321]">Menu</span>
        </div>

        {/* Area konten tempat halaman-halaman lu dirender */}
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto md:h-screen">
          <Outlet />
        </div>
        
      </main>
    </SidebarProvider>
  );
}