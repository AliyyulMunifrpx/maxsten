import { motion, AnimatePresence } from "framer-motion";
import { UserCog, LogOut } from "lucide-react";

export function ProfileDropdown({ isOpen, onClose, onOpenEdit, onLogout }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop untuk mendeteksi klik di luar menu */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-[65px] left-[8px] w-[calc(100%-16px)] z-50 flex flex-col gap-1 rounded-md border border-white/10 bg-[#2a2a2a] p-1.5 shadow-xl"
          >
            <button
              onClick={() => {
                onClose();
                onOpenEdit();
              }}
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 hover:text-[#C0FE04]"
            >
              <UserCog className="h-4 w-4" />
              <span>Edit Profil</span>
            </button>

            <div className="my-0.5 h-[1px] w-full bg-white/10" />

            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
