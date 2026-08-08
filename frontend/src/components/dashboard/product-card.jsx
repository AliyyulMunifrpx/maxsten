// src/components/dashboard/product-card.jsx
import { ImageOff, Flame } from "lucide-react";

export default function ProductCard({
  id,
  name,
  description,
  price,
  total_sold,
  image_url,
  is_available,
}) {
  const formattedPrice = `Rp${Number(price ?? 0).toLocaleString("id-ID")}`;

  return (
    <div className="w-full h-[25%] grid grid-cols-3 hover:bg-white/10 rounded-none border-b-1 border-white/10 transition-colors">
      <div className="h-full w-full flex items-center justify-center p-[8px]">
        <div className="aspect-square h-full max-w-full rounded-none overflow-hidden bg-white/10 flex items-center justify-center">
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageOff className="text-white/30" />
          )}
        </div>
      </div>

      <div className="h-full w-full col-span-2 pr-[16px] py-[10px] flex flex-col justify-between">
        <div className="flex justify-between items-start gap-[8px]">
          <div className="min-w-0">
            <p className="font-bold text-[14px] text-white truncate">{name}</p>
            {description && (
              <p className="text-[12px] text-white/50 line-clamp-1">
                {description}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] font-bold px-[8px] py-[2px] rounded-full ${
              is_available
                ? "bg-green-500/20 text-green-500"
                : "bg-white/10 text-white/50"
            }`}
          >
            {is_available ? "Tersedia" : "Habis"}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-[16px] font-bold text-[#D99A25]">
            {formattedPrice}
          </p>
          {total_sold > 0 && (
            <div className="flex items-center gap-[4px] text-white/50">
              <Flame size={12} />
              <p className="text-[12px]">{total_sold} terjual</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
