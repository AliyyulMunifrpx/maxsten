import { Outlet } from "react-router-dom";
import { AppSidebar } from "../components/ui/app-sidebar.jsx";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "../components/ui/sidebar.jsx";

function TopBar() {
  const { state } = useSidebar();

  return (
    // 1. Hapus relative, sticky, dan top-0.
    // 2. Tambahkan shrink-0 agar tinggi h-10 tidak terkompresi
    <div className="flex shrink-0 h-10 w-full border-b-1  border-white/10 items-center bg-[#1e1e1e]  px-[8px] py-[32px]">
      {state === "expanded" && (
        <SidebarTrigger className="text-white hover:bg-white/10  h-[32px] w-[32px] hover:text-white" />
      )}
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* Ubah min-h-screen menjadi h-screen agar parent terkunci pada tinggi layar (viewport) */}
      <div className="flex h-[100dvh] flex-1 flex-col overflow-hidden">
        <TopBar />

        {/* Area ini yang akan scroll berkat flex-1 dan overflow-y-auto */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
