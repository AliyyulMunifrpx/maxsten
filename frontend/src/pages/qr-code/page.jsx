// src/pages/store/qr-page.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { Copy, Check, Printer, ScanBarcode } from "lucide-react";
import toast from "react-hot-toast";
import { RevealButton } from "../../components/reveal-button.jsx";
import { useStoreProfile } from "../../hooks/store.js";
import EmptyStoreState from "../empty-state/no-store.jsx";
import QrCodePageLoading from "../loading-state/qr-code-page-loading.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";

export default function StoreQrPage() {
  const { data, isLoading, isError, error } = useStoreProfile();
  const [copied, setCopied] = useState(false);

  const store = data?.data;
  useDocumentTitle(`Qr-code ${store?.name}`);

  if (isError && error.message === "Toko tidak ditemukan") {
    return <EmptyStoreState />;
  }

  if (isLoading) {
    return <QrCodePageLoading></QrCodePageLoading>;
  }

  const publicId = store.public_id;
  const catalogUrl = `${window.location.origin}/catalog/${publicId}`;
  function handleCopy() {
    navigator.clipboard
      .writeText(catalogUrl)
      .then(() => {
        setCopied(true);
        toast.success("Link toko berhasil disalin!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Gagal menyalin link.");
      });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="bg-[#1e1e1e] min-h-full w-full p-[16px] flex flex-col gap-[16px] print:bg-white print:p-0">
      {/* Header — pola sama persis kayak ProductPage */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-[20px] font-bold text-white">QR Code Toko</p>
          <p className="text-[13px] text-white/50">
            Cetak atau bagikan QR ini biar pelanggan bisa langsung pesan dari
            menu kamu.
          </p>
        </div>
      </div>
      <div className="h-[1px] w-full bg-white/10 print:hidden"></div>

      {/* Konten QR — cuma bagian ini yang di-center, bukan seluruh halaman */}
      <div className="flex flex-col items-center gap-[16px] print:max-w-[100%] print:w-[400px] print:block print:gap-0 print:mx-auto">
        {" "}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="relative w-full max-w-[400px] bg-white p-[16px] flex flex-col items-center gap-[8px] shadow-2xl print:shadow-none overflow-hidden print-color-exact"
        >
          {/* ORNAMEN 1: Pola Titik Latar Belakang */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="absolute top-0 left-0 -translate-x-40 w-50 h-50 bg-[#C0FE04] rotate-45"></div>
          <div className="absolute rounded-full bottom-0 left-0 translate-x-50 translate-y-75 w-90 h-90 bg-[#C0FE04] rotate-45"></div>

          <div className="relative z-10 w-full flex items-center justify-center gap-[8px]">
            <img
              src="https://rqoypwfpsiyvrkhqzfwm.supabase.co/storage/v1/object/public/maxsten%20logo/munivy.svg"
              alt="Maxsten Logo"
              className="h-[16px] w-[16px] object-contain brightness-0"
            />
            <p className="text-[12px] font-bold text-[#1e1e1e] tracking-wider">
              MAXSTEN
            </p>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center text-center p-[8px]">
            <p className="text-[24px] font-black text-[#1e1e1e] tracking-tight uppercase leading-none">
              {store.name}
            </p>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center gap-[16px]">
            <div className="flex flex-col items-center gap-[8px]">
              <h2 className="text-[16px] font-bold text-[#1e1e1e] flex items-center gap-[8px]">
                <ScanBarcode size={24} className="text-[#1e1e1e]" />
                Pindai untuk Memesan
              </h2>
            </div>

            <div className="w-full max-w-[260px] bg-white border-2 border-none border-[#C0FE04] rounded-xl relative">
              <QRCode
                value={catalogUrl}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                fgColor="#1e1e1e"
                bgColor="#ffffff"
                level="Q"
              />
            </div>

            <p className="text-[12px] font-mono font-black text-[#1e1e1e] text-center break-all px-[40px]">
              {catalogUrl}
            </p>
          </div>

          <p className="relative z-10 text-[12px] text-[#1e1e1e]/70 text-center px-[16px]">
            Sistem antrean ini dibuat oleh{" "}
            <span className="font-semibold text-[#1e1e1e]">Aliyyul Munif</span>
            <br />
            Jasa pembuatan website & sistem, hubungi{" "}
            <span className="font-semibold text-[#1e1e1e]">@itsaliyyul</span>
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-[16px] w-full max-w-[400px] print:hidden"
        >
          <RevealButton
            type="button"
            label={copied ? "Tersalin" : "Salin Link"}
            icon={copied ? Check : Copy}
            onClick={handleCopy}
            bgAfter="bg-[#C0FE04]"
            textAfter="text-[#1e1e1e]"
            className="rounded-none w-full"
          />
          <RevealButton
            type="button"
            label="Simpan / Cetak"
            icon={Printer}
            onClick={handlePrint}
            bgBefore="bg-[#C0FE04]"
            bgAfter="bg-white"
            textBefore="text-[#1e1e1e]"
            className="rounded-none w-full "
          />
        </motion.div>
      </div>
    </div>
  );
}
