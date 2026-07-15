import { useState } from "react"; // Nggak perlu useEffect lagi!
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getOperationalHours,
  updateOperationalHours,
} from "../../lib/sellerApi.js";

const displayFont = { fontFamily: "'Fraunces', Georgia, serif" };

// Urutan hari: Senin (1) s/d Minggu (0)
const DAYS_ORDER = [
  { index: 1, name: "Senin" },
  { index: 2, name: "Selasa" },
  { index: 3, name: "Rabu" },
  { index: 4, name: "Kamis" },
  { index: 5, name: "Jumat" },
  { index: 6, name: "Sabtu" },
  { index: 0, name: "Minggu" },
];

// =========================================================
// KOMPONEN 1: KHUSUS UNTUK FETCHING DATA (TIDAK ADA STATE LOKAL)
// =========================================================
export default function EditJadwal() {
  // Ambil data jadwal dari server
  const {
    data: opHours,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["operationalHours"],
    queryFn: getOperationalHours,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F6]">
        <p className="mb-4 text-[#B23A2E]">Gagal memuat jadwal operasional.</p>
        <Link to="/seller" className="text-[#147356] underline">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  // Kalau data udah lengkap (nggak loading & nggak error), baru panggil komponen Form
  // Lempar datanya sebagai "initialData"
  return <JadwalForm initialData={opHours} />;
}

// =========================================================
// KOMPONEN 2: KHUSUS UNTUK FORM (STATE LOKAL AMAN DI SINI)
// =========================================================
function JadwalForm({ initialData }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Langsung set nilai awal state dari initialData
  // Karena komponen ini baru di-render SETELAH fetch selesai, initialData pasti ada isinya.
  const [schedule, setSchedule] = useState(initialData || []);

  // Mutation untuk simpan data
  const { mutate, isPending } = useMutation({
    mutationFn: updateOperationalHours,
    onSuccess: () => {
      toast.success("Jadwal operasional berhasil diperbarui!");
      // Kasih tau React Query buat narik ulang data jadwal & toko biar sinkron
      queryClient.invalidateQueries({ queryKey: ["operationalHours"] });
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      navigate("/seller"); // Balik ke dashboard
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal menyimpan jadwal.");
    },
  });

  const handleToggleDay = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.day === dayIndex) {
          const newIsActive = !item.is_active;
          return {
            ...item,
            is_active: newIsActive,
            // Kalau diaktifkan tapi jamnya masih kosong, kasih default
            open_time:
              newIsActive && !item.open_time ? "08:00" : item.open_time,
            close_time:
              newIsActive && !item.close_time ? "21:00" : item.close_time,
          };
        }
        return item;
      }),
    );
  };

  const handleTimeChange = (dayIndex, field, value) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.day === dayIndex ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSave = (e) => {
    e.preventDefault();

    // Bersihkan field bawaan database (id, store_id) biar Joi nggak ngamuk
    const cleanSchedule = schedule.map((item) => ({
      day: item.day,
      open_time: item.open_time,
      close_time: item.close_time,
      is_active: item.is_active,
    }));

    // Kirim data yang udah bersih
    mutate({ operational_hours: cleanSchedule });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-10">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <Link
          to="/seller"
          className="mb-6 inline-flex items-center text-sm font-semibold text-[#8A8375] transition hover:text-[#1C2321]"
        >
          &larr; Kembali ke Dashboard
        </Link>

        <div className="overflow-hidden rounded-2xl border border-[#E4E1D8] bg-white shadow-sm">
          <div className="border-b border-[#E4E1D8] p-5 sm:p-6">
            <h1
              style={displayFont}
              className="text-2xl font-semibold text-[#1C2321]"
            >
              Atur Jadwal Operasional
            </h1>
            <p className="mt-1 text-sm text-[#8A8375]">
              Toko akan otomatis buka dan tutup sesuai jadwal yang lu tentukan
              di bawah ini.
            </p>
          </div>

          <form onSubmit={handleSave}>
            <div className="divide-y divide-[#E4E1D8] p-5 sm:p-6">
              {DAYS_ORDER.map((dayConfig) => {
                const dayData =
                  schedule.find((h) => h.day === dayConfig.index) || {};
                const isActive = dayData.is_active || false;
                const isToday = new Date().getDay() === dayConfig.index;

                return (
                  <div
                    key={dayConfig.index}
                    className="flex flex-col py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Bagian Kiri: Nama Hari & Toggle */}
                    <div className="mb-3 flex items-center sm:mb-0 sm:w-1/3">
                      <button
                        type="button"
                        onClick={() => handleToggleDay(dayConfig.index)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C98A1F] focus:ring-offset-2 ${
                          isActive ? "bg-[#147356]" : "bg-[#D8D3C4]"
                        }`}
                        role="switch"
                        aria-checked={isActive}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span
                        className={`ml-3 text-sm font-semibold uppercase tracking-wider ${
                          isActive ? "text-[#1C2321]" : "text-[#8A8375]"
                        }`}
                      >
                        {dayConfig.name}{" "}
                        {isToday && <span className="text-[#C98A1F]">*</span>}
                      </span>
                    </div>

                    {/* Bagian Kanan: Input Jam */}
                    <div className="flex items-center gap-3 sm:w-2/3 sm:justify-end">
                      {isActive ? (
                        <>
                          <input
                            type="time"
                            required
                            value={dayData.open_time || ""}
                            onChange={(e) =>
                              handleTimeChange(
                                dayConfig.index,
                                "open_time",
                                e.target.value,
                              )
                            }
                            className="rounded-lg border border-[#E4E1D8] bg-[#FCFBF9] px-3 py-2 font-mono text-sm font-semibold text-[#1C2321] focus:border-[#C98A1F] focus:outline-none focus:ring-1 focus:ring-[#C98A1F]"
                          />
                          <span className="text-sm font-medium text-[#8A8375]">
                            s/d
                          </span>
                          <input
                            type="time"
                            required
                            value={dayData.close_time || ""}
                            onChange={(e) =>
                              handleTimeChange(
                                dayConfig.index,
                                "close_time",
                                e.target.value,
                              )
                            }
                            className="rounded-lg border border-[#E4E1D8] bg-[#FCFBF9] px-3 py-2 font-mono text-sm font-semibold text-[#1C2321] focus:border-[#C98A1F] focus:outline-none focus:ring-1 focus:ring-[#C98A1F]"
                          />
                        </>
                      ) : (
                        <div className="flex w-full items-center justify-end">
                          <span className="rounded-lg bg-[#FBEAE7] px-4 py-2 font-mono text-sm font-bold text-[#B23A2E]">
                            TUTUP
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#E4E1D8] bg-[#FCFBF9] p-5 sm:p-6">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-[#1C2321] py-3.5 text-sm font-bold text-white transition hover:bg-[#333B38] disabled:opacity-70 sm:w-auto sm:px-8"
              >
                {isPending ? "Menyimpan..." : "Simpan Jadwal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
