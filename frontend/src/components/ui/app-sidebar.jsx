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
import {
  ChartColumn,
  Home,
  Settings,
  ShoppingBag,
  User,
  Store,
  CirclePlus,
  Package,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useAuthSession } from "./../../hooks/auth";
import { useState } from "react";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Products", url: "/products", icon: Package },
  { title: "Orders", url: "/orders", icon: ShoppingBag },
  { title: "Analytics", url: "/analytics", icon: ChartColumn },
  { title: "Store", url: "/store", icon: Store },
  { title: "Add-ons", url: "/add-ons", icon: CirclePlus },
];

export function AppSidebar() {
  const location = useLocation();
  const { data: session, isLoading } = useAuthSession();
  const user = session?.data;
  const { state } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-1  border-white/10 bg-[#1e1e1e]"
    >
      <SidebarContent className="bg-[#1e1e1e] py-[16px]">
        {/* Logo Section */}
        <div className="group/logo border-b-1  border-white/10 flex items-center gap-[16px] overflow-hidden px-[16px] pb-[16px] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:px-[8px]">
          <div className="relative h-[32px] w-[32px] flex-shrink-0 ">
            <img
              src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/MEWA.webp"
              alt="Maxsten Logo"
              className="h-[32px] w-[32px] object-contain transition-opacity group-data-[collapsible=icon]:group-hover/logo:opacity-0"
            />
            <SidebarTrigger className="absolute inset-0 hidden h-[32px] w-[32px] items-center justify-center text-white opacity-0 transition-opacity hover:bg-[#D99A25] group-data-[collapsible=icon]:group-hover/logo:flex group-data-[collapsible=icon]:group-hover/logo:opacity-100" />
          </div>

          <p className="text-white text-[16px] font-bold group-data-[collapsible=icon]:hidden">
            MAXSTEN
          </p>
        </div>

        {/* Grup Menu */}
        <SidebarGroup>
          {/* Sembunyikan Label "Menu Utama" saat collapsed */}
          <SidebarGroupLabel className="  text-white text-[16px] mt-[64px] mb-[8px] group-data-[collapsible=icon]:hidden">
            Menu Utama
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="text-white gap-[8px]">
              {menuItems.map((item) => {
                const isMenuNyala = location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      // Kasih tooltip di Shadcn biasanya otomatis kalau collapsible="icon"
                      className={`hover:bg-white/10 hover:text-white font-normal transition-all ${
                        isMenuNyala
                          ? "bg-[#D99A25] text-[#1e1e1e] hover:bg-[#D99A25] hover:text-[#1e1e1e]"
                          : ""
                      }`}
                    >
                      <Link
                        to={item.url}
                        className="flex items-center gap-[16px] h-full w-full"
                      >
                        <item.icon className="h-[24px] w-[24px] flex-shrink-0" />

                        {/* Sembunyikan Judul Menu saat collapsed */}
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PROFILE SECTION */}
        <div
          className="
    mt-auto flex h-[56px] items-center justify-between gap-[8px]
    rounded-0 px-[8px] transition-all  border-white/10 border-y-1
    group-data-[collapsible=icon]:mx-auto
    group-data-[collapsible=icon]:h-[40px]
    group-data-[collapsible=icon]:w-[40px]
    group-data-[collapsible=icon]:justify-center
    group-data-[collapsible=icon]:gap-0
    group-data-[collapsible=icon]:bg-transparent
    group-data-[collapsible=icon]:p-0
  "
        >
          <div className="flex h-full items-center gap-[8px] overflow-hidden">
            {/* Circle inisial — SELALU 40x40, gak pernah kena override apapun */}
            <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-full bg-[#D99A25] font-bold text-[#1e1e1e] ">
              {user?.name ? user.name.charAt(0).toUpperCase() : ""}
            </div>

            {/* Nama & Email — hilang saat minimize */}
            <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:hidden">
              {isLoading ? (
                <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-500"></div>
              ) : (
                <p className="truncate text-[14px] font-medium text-white">
                  {user?.name || "Nama Pengguna"}
                </p>
              )}
              {isLoading ? (
                <div className="h-3 w-24 animate-pulse rounded bg-gray-600"></div>
              ) : (
                <p className="truncate text-[11px] text-gray-400">
                  {user?.email || "Email@gmail.com"}
                </p>
              )}
            </div>
          </div>

          {/* Settings — hilang saat minimize */}
          <Settings className="h-[24px] w-[24px] flex-shrink-0 cursor-pointer text-white transition-colors hover:text-[#D99A25] group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
