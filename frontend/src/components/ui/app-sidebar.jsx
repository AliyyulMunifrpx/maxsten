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
import { ChevronsRight } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuthSession, useLogout } from "./../../hooks/auth";
import { useState } from "react";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboard } from "../../hooks/dashboard.js";
import { ROUTES } from "../../routes/paths.js";
import { EditProfileModal } from "../profile/edit-profile-modal.jsx";
import { ProfileDropdown } from "../profile/dropdown.jsx";
import toast from "react-hot-toast";

const menuItems = [
  ROUTES.dashboard.home,
  ROUTES.product.list,
  ROUTES.orders.list,
  ROUTES.analytics.list,
  ROUTES.store.list,
  ROUTES.addons.list,
  ROUTES.cancelReason.list,
  ROUTES.qrCode.print,
];
const MENU_END_DELAY = menuItems.length * 0.1 + 0.15;

function formatBadgeCount(count) {
  if (!count) return null;
  return count > 9 ? "9+" : String(count);
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isLoading } = useAuthSession();
  const user = session?.data;
  const { state } = useSidebar();
  const { data: dashboardData } = getDashboard();

  const logoutMutation = useLogout();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const badgeCount = formatBadgeCount(
    dashboardData?.data?.lists?.active_queues_count,
  );

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.clear();
        navigate("/login");
        toast.success("Logout berhasil, dadah👋");
      },
      onError: (err) => {
        console.error(
          "Gagal logout di server, tapi tetap paksa keluar lokal:",
          err,
        );
        localStorage.clear();
        navigate("/login");
      },
    });
  };

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r-1  border-white/10 bg-[#1e1e1e]"
      >
        <SidebarContent className="bg-[#1e1e1e] py-[16px] relative flex flex-col h-full">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="group/logo border-b-1 border-white/10 flex items-center gap-[16px] overflow-hidden px-[16px] pb-[16px]  group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:px-[8px]"
          >
            <div className="relative h-[32px] w-[32px] flex-shrink-0">
              <img
                src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/munivy.svg"
                alt="Maxsten Logo"
                className="h-[32px] w-[32px] object-contain transition-opacity group-data-[collapsible=icon]:group-hover/logo:opacity-0"
              />
              <SidebarTrigger className="absolute inset-0 hidden h-[32px] w-[32px] items-center justify-center text-white opacity-0 transition-opacity hover:bg-[#C0FE04] group-data-[collapsible=icon]:group-hover/logo:flex group-data-[collapsible=icon]:group-hover/logo:opacity-100" />
            </div>
            <p className="text-white text-[16px] font-bold group-data-[collapsible=icon]:hidden">
              MAXSTEN
            </p>
          </motion.div>

          {/* Grup Menu */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-white text-[16px] mb-[8px] group-data-[collapsible=icon]:hidden">
              Menu Utama
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="text-white gap-[8px]">
                {menuItems.map((item, index) => {
                  const isMenuNyala = location.pathname.startsWith(item.path);
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.35,
                        ease: "easeOut",
                        delay: 0.1 + index * 0.1,
                      }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`group/item relative z-0 overflow-hidden font-normal transition-colors duration-300 ${
                            isMenuNyala
                              ? "text-[#1e1e1e] hover:text-[#1e1e1e] hover:bg-transparent"
                              : "text-white hover:text-white hover:bg-transparent"
                          }`}
                        >
                          <Link
                            to={item.path}
                            className="flex items-center gap-[16px] h-full w-full"
                          >
                            {/* 1. ANIMASI BACKGROUND ACTIVE (Orange) */}
                            <AnimatePresence>
                              {isMenuNyala && (
                                <motion.div
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  exit={{ scaleX: 0 }}
                                  transition={{
                                    duration: 0.4,
                                    ease: "easeInOut",
                                  }}
                                  className="absolute inset-0 origin-left bg-[#C0FE04] -z-10"
                                />
                              )}
                            </AnimatePresence>

                            {/* 2. ANIMASI BACKGROUND HOVER (Putih transparan) */}
                            {/* Hanya dirender jika menu sedang TIDAK nyala (agar tidak menimpa warna orange) */}
                            {!isMenuNyala && (
                              <div className="absolute inset-0 -z-10 origin-left scale-x-0 bg-white/10 transition-transform duration-300 ease-out group-hover/item:scale-x-100" />
                            )}
                            {/* KONTEN MENU */}
                            <motion.span
                              className="relative flex-shrink-0 z-10"
                              animate={
                                item.showBadge && badgeCount
                                  ? {
                                      y: [0, -5, -5, -5, -5, 0],
                                      rotate: [0, -15, 15, -15, 15, 0],
                                    }
                                  : { y: 0, rotate: 0 }
                              }
                              transition={
                                item.showBadge && badgeCount
                                  ? {
                                      duration: 0.8,
                                      repeat: Infinity,
                                      repeatDelay: 1.5,
                                      ease: "easeInOut",
                                    }
                                  : {}
                              }
                            >
                              <item.icon className="h-[24px] w-[24px]" />

                              {item.showBadge && badgeCount && (
                                <span className="absolute -top-1 -right-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold text-white leading-none">
                                  {badgeCount}
                                </span>
                              )}
                            </motion.span>
                            <span className="group-data-[collapsible=icon]:hidden z-10">
                              {item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="w-full h-[1px] bg-white/10 mt-auto"></div>

          {/* AREA BAWAH: PROFILE SECTION & DROPDOWN */}
          <div className="relative">
            <ProfileDropdown
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              onOpenEdit={() => setIsEditModalOpen(true)}
              onLogout={handleLogout}
            />

            <motion.div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: "easeOut",
                delay: MENU_END_DELAY,
              }}
              whileHover="hover"
              whileTap="tap"
              className="
                group cursor-pointer flex h-[56px] items-center justify-between gap-[8px]
                rounded-none px-[8px] transition-all duration-300 border-white/10 border-b-1 
                hover:bg-white/5
                group-data-[collapsible=icon]:mx-auto
                group-data-[collapsible=icon]:h-[40px]
                group-data-[collapsible=icon]:w-[40px]
                group-data-[collapsible=icon]:justify-center
                group-data-[collapsible=icon]:gap-0
                group-data-[collapsible=icon]:bg-transparent
                group-data-[collapsible=icon]:p-0
                group-data-[collapsible=icon]:border-none
              "
            >
              <div className="flex h-full items-center gap-[8px] overflow-hidden">
                <motion.div
                  variants={{ hover: { scale: 1.08 }, tap: { scale: 0.95 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-full bg-[#C0FE04] font-bold text-[#1e1e1e] shadow-sm"
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : ""}
                </motion.div>

                <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap group-data-[collapsible=icon]:hidden">
                  {isLoading ? (
                    <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-500"></div>
                  ) : (
                    <p className="truncate text-[14px] font-medium text-white transition-colors duration-300 group-hover:text-[#C0FE04]">
                      {user?.name || "Nama Pengguna"}
                    </p>
                  )}
                  {isLoading ? (
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-600"></div>
                  ) : (
                    <p className="truncate text-[11px] text-gray-400 transition-colors duration-300 group-hover:text-white/80">
                      {user?.email || "Email@gmail.com"}
                    </p>
                  )}
                </div>
              </div>

              <motion.div
                variants={{ hover: { x: 4 }, tap: { x: 0 } }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className={`group-data-[collapsible=icon]:hidden transition-transform duration-300 ${isDropdownOpen ? "-rotate-90" : "rotate-0"}`}
              >
                <ChevronsRight className="h-[24px] w-[24px] flex-shrink-0 text-white/50 transition-colors duration-300 group-hover:text-[#C0FE04]" />
              </motion.div>
            </motion.div>
          </div>
        </SidebarContent>
      </Sidebar>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
      />
    </>
  );
}
