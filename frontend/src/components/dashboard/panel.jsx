// src/components/dashboard/panel.jsx
import { ArrowRight } from "lucide-react";

export default function DashboardPanel({
  icon: Icon,
  title,
  count,
  onSeeAll,
  children,
}) {
  return (
    <div className=" w-full flex flex-col bg-white/5 border-1 border-white/10 p-[16px] gap-[16px] overflow-hidden">
      {(Icon || title) && (
        <div className="flex gap-[16px] items-center text-white shrink-0">
          <div className="flex gap-[16px] items-center">
            {Icon && <Icon />}
            {title && <p className="whitespace-nowrap">{title}</p>}{" "}
          </div>
          <div className="w-full h-[1px] bg-white/10"></div>
          <div className="flex gap-[16px] items-center">
            {count !== undefined && (
              <div className="h-[24px] w-[24px] rounded-full bg-red-500 text-center font-bold text-[#1e1e1e]">
                {count}
              </div>
            )}
            {onSeeAll ? (
              <button onClick={onSeeAll} aria-label="Lihat semua">
                <ArrowRight />
              </button>
            ) : (
              <ArrowRight />
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[8px]">
        {children}
      </div>
    </div>
  );
}
