import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardPanel({
  icon: Icon,
  title,
  count,
  onSeeAll,
  path,
  children,
  index = 0,
}) {
  // Ekstrak isi header agar bisa dibungkus dengan tag yang berbeda tanpa mengulang kode
  const headerContent = (
    <>
      <div className="flex gap-[16px] items-center">
        {Icon && <Icon />}
        {title && <p className="whitespace-nowrap">{title}</p>}
      </div>

      <div className="w-full h-[1px] bg-white/10"></div>

      <div className="flex gap-[16px] items-center">
        {count !== undefined && (
          <div className="h-[24px] w-[24px] rounded-full bg-red-500 text-center font-bold text-[#1e1e1e]">
            {count}
          </div>
        )}
        <ArrowRight className="transition-transform duration-300 group-hover:translate-x-2" />
      </div>
    </>
  );

  const interactiveClasses =
    "group flex gap-[16px] items-center text-white shrink-0 w-full cursor-pointer hover:opacity-80 transition-opacity";
  const staticClasses =
    "flex gap-[16px] items-center text-white shrink-0 w-full";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
        delay: 0.2 + index * 0.08,
      }}
      className="w-full flex flex-col bg-white/5 border-1 border-white/10 p-[16px] gap-[16px] overflow-hidden"
    >
      {(Icon || title) && (
        <>
          {/* Prioritas 1: Jika ada path, gunakan <Link> */}
          {path ? (
            <Link to={path} className={interactiveClasses}>
              {headerContent}
            </Link>
          ) : /* Prioritas 2: Jika tidak ada path tapi ada onSeeAll, gunakan div interaktif */
          onSeeAll ? (
            <div
              onClick={onSeeAll}
              className={interactiveClasses}
              role="button"
            >
              {headerContent}
            </div>
          ) : (
            /* Prioritas 3: Jika tidak ada keduanya, render sebagai div statis biasa */
            <div className={staticClasses}>{headerContent}</div>
          )}
        </>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[8px]">
        {children}
      </div>
    </motion.div>
  );
}
