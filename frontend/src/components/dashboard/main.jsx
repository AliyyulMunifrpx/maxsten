import GradientWaves from "./../GradientWaves";
import SlicedWaves from "./../SlicedWaves";

export default function Main({ logo, name, status }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r  from-white/0 to-white/10 p-[32px] w-full h-[128px]">
      <div className="absolute top-0 opacity-5 left-0 w-full h-full flex items-center z-0">
        <SlicedWaves
          color1="#ffffff"
          color2="#ffffff"
          color3="#ffffff"
          columns={40}
          rows={4}
          barThickness={0.2}
          speed={1.25}
          travel={0.7}
          waveSpread={3}
          rowOffset={3}
          softness={0.05}
          glow={0}
          brightness={1}
          contrast={2}
          opacity={0.5}
          orientation="vertical"
          alternate={false}
          mouseInteraction
          mouseStrength={2}
          mouseRadius={0.3}
          grain
          grainIntensity={0}
        />
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 gap-[16px] flex items-center z-10">
        <img src={logo} alt="" className="h-[88px] w-[88px] rounded-md " />
        <p className="text-[24px] font-bold text-white">{name}</p>
        <div
          className={`flex items-center justify-center rounded-md px-[8px] ${
            status === "buka"
              ? "bg-green-400/20 text-green-400"
              : "bg-red-400/20 text-red-400"
          }`}
        >
          <p className="text-[16px] font-bold capitalize">{status}</p>
        </div>
      </div>
    </div>
  );
}
