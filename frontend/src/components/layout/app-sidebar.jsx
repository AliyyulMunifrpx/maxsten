
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { FaHistory, FaHome,FaPlus ,FaStore  } from "react-icons/fa";
import { IoIosSettings } from "react-icons/io";
// Daftar Menu Lu
const menuItems = [
  { title: "Dashboard", url: "/seller", icon: FaHome },
  { title: "Tambah Produk", url: "/seller/create-product", icon: FaPlus },
  { title: "Pengaturan Toko", url: "/seller/edit-store", icon: FaStore  },
  { title: "Laporan Penjualan", url: "/seller/history", icon: FaHistory },
  { title: "Profil Akun", url: "/seller/edit-profile", icon: IoIosSettings }, 
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent className="bg-white">
        <SidebarGroup>
          {/* Judul/Logo Sidebar */}
          <div className="mb-6 px-4 py-4">
            <h2 className="text-xl font-bold text-[#1C2321]">UMKM Hub</h2>
            <p className="text-xs text-[#8A8375]">Panel Penjual</p>
          </div>

          <SidebarGroupLabel className="text-[#8A8375]" >Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu >
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} >
                      <Link 
                        to={item.url} 
                        className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                          isActive 
                            ? "bg-[#E7F3EC] text-[#147356] font-semibold" 
                            : "text-[#1C2321] hover:bg-[#FAF9F6]"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}