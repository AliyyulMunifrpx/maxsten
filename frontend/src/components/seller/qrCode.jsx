import { QRCodeSVG } from "qrcode.react";

// Same token set used across the app:
// ink #1C2321  paper #FAF9F6  line #E4E1D8  amber #C98A1F  green #147356

export default function CetakQR({ storeId, storeName }) {
  // Ini adalah URL web pembeli lu nanti.
  // Kalau udah di-hosting, ganti localhost jadi domain lu (misal: https://antrean-umkm.com/toko/...)
  const urlToko = `http://192.168.1.5:5173/${storeId}/products`;

  // Fungsi bawaan browser buat nge-print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-2xl border border-[#E4E1D8] bg-white p-5 text-center">
      <h2 className="mb-4 text-lg font-bold text-[#1C2321]">
        Cetak QR Code Meja
      </h2>

      {/* Bungkus area yang mau dicetak pakai ID khusus */}
      <div
        id="area-cetak-qr"
        className="mx-auto flex max-w-xs flex-col items-center overflow-hidden rounded-2xl border-2 border-[#1C2321]"
      >
        {/* Header ala kartu scan */}
        <div className="w-full bg-[#1C2321] px-6 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C98A1F]">
            Scan Untuk Pesan
          </p>
          <h1 className="mt-0.5 truncate text-lg font-black text-white">
            {storeName}
          </h1>
        </div>

        {/* Badan kartu */}
        <div className="flex w-full flex-col items-center gap-4 bg-white px-6 py-7">
          {/* Bingkai QR ala jendela scanner */}
          <div className="relative p-4">
            <span className="absolute left-0 top-0 h-6 w-6 border-l-4 border-t-4 border-[#C98A1F]" />
            <span className="absolute right-0 top-0 h-6 w-6 border-r-4 border-t-4 border-[#C98A1F]" />
            <span className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-[#C98A1F]" />
            <span className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-[#C98A1F]" />

            <QRCodeSVG value={urlToko} size={220} />
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#147356]" />
            <p className="text-sm font-semibold text-[#1C2321]">
              Scan untuk Memesan &amp; Antre
            </p>
          </div>

          {/* Panduan buat yang gak punya app scan QR */}
          <div className="w-full rounded-lg bg-[#FCEFDA] px-3 py-2.5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9C6A16]">
              Gak Ada App Scan QR?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#7A5A1E]">
              Buka kamera atau{" "}
              <span className="font-semibold">Google Lens</span>, arahkan ke QR
              di atas, lalu tap link yang muncul.
            </p>
          </div>

          {/* Garis putus - kesan "sobek" khas struk / kartu antrean */}
          <div
            className="h-px w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #D8D3C4 0 8px, transparent 8px 14px)",
            }}
            aria-hidden="true"
          />

          <p className="font-mono text-[11px] uppercase tracking-wide text-[#B0AA9B]">
            ID Toko: {storeId}
          </p>
        </div>

        {/* Footer brand Maxsten + kredit developer */}
        <div className="w-full bg-[#FAF9F6] px-6 py-3">
          <p className="text-center text-xs text-[#8A8375]">
            Powered by{" "}
            <span className="font-semibold text-[#1C2321]">Maxsten</span>{" "}
            <span className="font-mono text-[#B0AA9B]">maxsten.com</span>
          </p>
          <p className="mt-1 text-center text-[11px] text-[#B0AA9B]">
            Dibuat oleh{" "}
            <span className="font-semibold text-[#C98A1F]">@itsaliyyul</span> di
            Instagram
          </p>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="mt-5 cursor-pointer rounded-lg bg-[#1C2321] px-4 py-2 font-semibold text-white transition hover:bg-[#333B38]"
      >
        🖨️ Cetak Sekarang
      </button>
    </div>
  );
}
