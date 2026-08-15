// components/reveal-button.jsx
import {
  motion,
  animate,
  useMotionValue,
  useMotionTemplate,
} from "framer-motion";
import { useNavigate } from "react-router-dom";

export function RevealButton({
  label = "Tombol",
  path,
  onClick,
  bgBefore = "bg-white/5",
  textBefore = "text-white",
  bgAfter = "bg-[#C0FE04]",
  textAfter = "text-[#1e1e1e]",
  className = "",
  disable,
  type,
  icon, // ✅ baru — elemen icon opsional, mis. <ShoppingCart size={22} />
  badge, // ✅ baru — elemen badge kecil opsional, mis. bulatan angka
  animateIcon, // ✅ baru — { animate, transition } buat animasiin icon (goyang, dll)
}) {
  const navigate = useNavigate();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const radius = useMotionValue(0);

  const clipPath = useMotionTemplate`circle(${radius}px at ${mouseX}px ${mouseY}px)`;

  function handleMouseEnter(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    animate(radius, 300, { duration: 0.5, ease: "easeOut" });
  }

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  function handleMouseLeave() {
    animate(radius, 0, { duration: 0.5, ease: "easeIn" });
  }

  function handleClick(e) {
    if (onClick) onClick(e);
    if (path) navigate(path);
  }

  function renderContent(textColor) {
    const Icon = icon;

    return (
      <span
        className={`relative z-10 flex items-center whitespace-nowrap justify-center gap-[8px] w-full h-full ${textColor}`}
      >
        {Icon && (
          <motion.span
            className="relative shrink-0 flex justify-between"
            animate={animateIcon?.animate}
            transition={animateIcon?.transition}
          >
            <Icon size={20} />
            {badge}
          </motion.span>
        )}

        {label}
      </span>
    );
  }
  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden h-[48px] px-[16px] rounded-[8px] font-medium transition-colors 0 ${disable ? "opacity-50" : ""} ${bgBefore} ${className}`}
      type={type}
      disabled={disable}
    >
      {renderContent(textBefore)}

      <motion.div
        style={{ clipPath }}
        className={`absolute inset-0 z-20 flex items-center justify-center ${bgAfter}`}
      >
        {renderContent(textAfter)}
      </motion.div>
    </button>
  );
}
