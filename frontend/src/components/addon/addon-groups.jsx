// src/components/product/addon-group-picker.jsx

import { useAddonGroups } from "../../hooks/addon.js";

export default function AddonGroupPicker({ selectedIds, onChange }) {
  const { data, isLoading, isError } = useAddonGroups();
  const groups = data?.data || [];

  function toggleGroup(groupId) {
    if (selectedIds.includes(groupId)) {
      onChange(selectedIds.filter((id) => id !== groupId));
    } else {
      onChange([...selectedIds, groupId]);
    }
  }

  if (isLoading) {
    return <p className="text-[12px] text-white/30">Memuat grup addon...</p>;
  }

  if (isError) {
    return <p className="text-[12px] text-red-500">Gagal memuat grup addon.</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="text-[12px] text-white/30">
        Belum ada grup addon di toko kamu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {groups.map((group) => {
        const checked = selectedIds.includes(group.id);
        return (
          <label
            key={group.id}
            className={`flex flex-col gap-[6px] p-[10px] border cursor-pointer transition-colors ${
              checked
                ? "border-[#C0FE04]/50 bg-[#C0FE04]/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-center gap-[8px]">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleGroup(group.id)}
                className="h-[16px] w-[16px] accent-[#C0FE04]"
              />
              <p className="text-[13px] font-medium text-white">{group.name}</p>
            </div>
            {group.addons?.length > 0 && (
              <div className="flex flex-wrap gap-[6px] pl-[24px]">
                {group.addons.map((addon) => (
                  <span
                    key={addon.id}
                    className="text-[11px] text-white/50 px-[6px] py-[2px] bg-white/5"
                  >
                    {addon.name}
                    {addon.price > 0 &&
                      ` (+Rp${Number(addon.price).toLocaleString("id-ID")})`}
                  </span>
                ))}
              </div>
            )}
          </label>
        );
      })}
    </div>
  );
}
