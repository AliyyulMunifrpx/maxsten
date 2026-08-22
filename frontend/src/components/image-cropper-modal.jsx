// src/components/product/image-cropper-modal.jsx
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { X, Check, ZoomIn } from "lucide-react";
import { getCroppedImageBlob } from "../lib/crop-images.js";

export default function ImageCropperModal({
  imageSrc,
  onCancel,
  onConfirm,
  isUploading,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
    onConfirm(blob);
  }

  return (
    <AnimatePresence>
      {imageSrc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-[16px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-[420px] bg-[#1e1e1e] border border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-[16px] border-b border-white/10">
              <p className="text-white text-[14px] font-bold">
                Atur Foto Produk
              </p>
              <button
                onClick={onCancel}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Batal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative w-full aspect-square bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex items-center gap-[12px] px-[16px] pt-[16px]">
              <ZoomIn size={16} className="text-white/50 shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#C0FE04]"
              />
            </div>

            <div className="flex gap-[8px] p-[16px]">
              <button
                onClick={onCancel}
                disabled={isUploading}
                className="flex-1 py-[10px] bg-white/10 text-white text-[14px] font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-[6px] py-[10px] bg-[#C0FE04] text-[#1e1e1e] text-[14px] font-bold hover:bg-[#C0FE04]/90 transition-colors disabled:opacity-50"
              >
                <Check size={16} />
                {isUploading ? "Mengunggah..." : "Simpan"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
