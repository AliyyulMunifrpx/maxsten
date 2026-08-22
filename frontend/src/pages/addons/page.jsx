// src/pages/addon/addons-page.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import { useAddonGroups, useDeleteAddonGroup } from "../../hooks/addon.js";
import AddonGroupCard from "../../components/addon/addon-group-card.jsx";
import AddonGroupDetailModal from "../../components/addon/addon-group-detail-modal.jsx";
import AddonGroupFormModal from "../../components/addon/addon-group-form-modal.jsx";
import EmptyStoreState from "../empty-state/no-store.jsx";
import AddonPageLoading from "../loading-state/addon-page-loading.jsx";
import EmptyAddonGroupState from "../empty-state/no-addon.jsx";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export default function AddonsPage() {
  const { data, isLoading, isError, error } = useAddonGroups();
  const groups = data?.data || [];

  const [creating, setCreating] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const deleteGroup = useDeleteAddonGroup();
  useDocumentTitle("kelola Add-on");
  function handleDelete(group) {
    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        setSelectedGroupId(null);
        toast.success("Grup addon berhasil dihapus!");
      },

      onError: (err) => {
        toast.error(err?.message || "Gagal menghapus grup addon.");
      },
    });
  }

  if (isLoading) {
    return <AddonPageLoading />;
  }

  if (isError && error.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  // Kalau belum punya addon group
  if (!isLoading && !isError && groups.length === 0) {
    return (
      <>
        <EmptyAddonGroupState onCreate={() => setCreating(true)} />

        <AddonGroupFormModal
          open={creating}
          mode="create"
          onClose={() => setCreating(false)}
        />
      </>
    );
  }

  return (
    <div className="bg-[#1e1e1e] min-h-full w-full p-[16px] flex flex-col gap-[16px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <p className="text-[20px] font-bold text-white">Grup Addon</p>

          <p className="text-[13px] text-white/50">
            Kelola grup addon yang bisa dipasang ke produk kamu.
          </p>
        </div>

        <RevealButton
          type="button"
          onClick={() => setCreating(true)}
          label="Tambah Grup"
          icon={Plus}
          bgBefore="bg-[#C0FE04]"
          textBefore="text-[#1e1e1e]"
          bgAfter="bg-white"
          textAfter="text-[#1e1e1e]"
          // Tambahan w-full di mobile, sm:w-auto di layar besar
          className="w-full sm:w-auto rounded-none"
        />
      </div>

      <div className="h-[1px] w-full bg-white/10" />

      {/* Error */}
      {isError && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-[14px] text-red-500">
            {error?.message || "Gagal memuat grup addon."}
          </p>
        </div>
      )}

      {/* Groups */}
      {!isLoading && !isError && groups.length > 0 && (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]"
        >
          {groups.map((group) => (
            <AddonGroupCard
              key={group.id}
              group={group}
              onClick={() => setSelectedGroupId(group.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AddonGroupDetailModal
        addonGroupId={selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
        onEdit={(group) => {
          setSelectedGroupId(null);
          setEditingGroup(group);
        }}
        onDelete={handleDelete}
        isDeleting={deleteGroup.isPending}
      />

      {/* Create Modal */}
      <AddonGroupFormModal
        open={creating}
        mode="create"
        onClose={() => setCreating(false)}
      />

      {/* Edit Modal */}
      <AddonGroupFormModal
        key={editingGroup?.id}
        open={!!editingGroup}
        mode="edit"
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
      />
    </div>
  );
}
