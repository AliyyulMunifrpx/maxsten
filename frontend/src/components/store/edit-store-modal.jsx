// src/components/store/edit-store-modal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Save, X } from "lucide-react";
import {
  useUpdateStore,
  useUpdateOperationalHours,
  usePostalCode,
} from "../../hooks/store.js";
import LocationPicker from "./location-picker.jsx";
import FieldLabel from "../field-label.jsx";
import { RevealButton } from "../reveal-button.jsx";

const DAYS = [
  { day: 0, label: "Senin" },
  { day: 1, label: "Selasa" },
  { day: 2, label: "Rabu" },
  { day: 3, label: "Kamis" },
  { day: 4, label: "Jumat" },
  { day: 5, label: "Sabtu" },
  { day: 6, label: "Minggu" },
];

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB — Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Jayapura" },
];

const inputCls =
  "rounded-none bg-white/5 border-white/10 text-white text-[12px] p-[8px] placeholder:text-white/30 focus:outline-none focus:border-[#C0FE04] focus:ring-1 focus:ring-[#C0FE04] transition-all w-full";

const readOnlyCls =
  "rounded-none bg-white/5 border-white/5 text-white/50 text-[12px] p-[8px] cursor-not-allowed w-full";

const labelCls = "text-[16px] font-bold text-white/50";

export default function EditStoreModal({ isOpen, onClose, storeData }) {
  const updateStore = useUpdateStore();
  const updateHours = useUpdateOperationalHours();

  const [form, setForm] = useState(null);
  const [hours, setHours] = useState([]);
  const [postalQuery, setPostalQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: postalResults, isFetching: searchingPostal } =
    usePostalCode(debouncedQuery);

  useEffect(() => {
    if (isOpen && storeData) {
      setForm({
        name: storeData.name || "",
        description: storeData.description || "",
        street_address: storeData.street_address || "",
        village: storeData.village || "",
        district: storeData.district || "",
        city: storeData.city || "",
        province: storeData.province || "",
        postal_code: storeData.postal_code || "",
        latitude: storeData.latitude || "",
        longitude: storeData.longitude || "",
        timezone: storeData.timezone || "Asia/Jakarta",
        payment_timeout: storeData.payment_timeout ?? 15,
      });

      setHours(
        DAYS.map((d) => {
          const row = storeData.operational_hours?.find((h) => h.day === d.day);
          return {
            day: d.day,
            is_active: row?.is_active ?? false,
            open_time: row?.open_time || "08:00",
            close_time: row?.close_time || "20:00",
          };
        }),
      );

      setPostalQuery(storeData.postal_code || "");
    }
  }, [isOpen, storeData]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(postalQuery), 400);
    return () => clearTimeout(timer);
  }, [postalQuery]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleDay(day) {
    setHours((h) =>
      h.map((row) =>
        row.day === day ? { ...row, is_active: !row.is_active } : row,
      ),
    );
  }

  function updateDayTime(day, field, value) {
    setHours((h) =>
      h.map((row) => (row.day === day ? { ...row, [field]: value } : row)),
    );
  }

  function handleSelectPostal(result) {
    setForm((f) => ({
      ...f,
      village: result.village.name,
      district: result.district.name,
      city: result.city.name,
      province: result.province.name,
      postal_code: result.postalCode,
    }));
    setPostalQuery(result.title);
    setShowResults(false);
  }

  function handleGetLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      }));
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!form.postal_code) {
      toast.error("Silakan cari dan pilih kelurahan dari dropdown kode pos!");
      return;
    }

    const isAnyDayOpen = hours.some((h) => h.is_active);

    if (!isAnyDayOpen) {
      toast.error("Pilih minimal 1 hari operasional!");
      return;
    }

    const storePayload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      payment_timeout: Number(form.payment_timeout),
    };

    const hoursPayload = hours.map((row) => ({
      day: row.day,
      is_active: row.is_active,
      open_time: row.is_active ? row.open_time : null,
      close_time: row.is_active ? row.close_time : null,
    }));

    updateStore.mutate(storePayload, {
      onSuccess: () => {
        updateHours.mutate(hoursPayload, {
          onSuccess: () => {
            toast.success("Perubahan toko berhasil disimpan!");
            onClose();
          },
          onError: (err) => {
            toast.error(err.message);
          },
        });
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  if (!form) return null;

  const isSubmitting = updateStore.isPending || updateHours.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 sm:p-[16px] backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex w-full max-h-[90vh] sm:max-w-4xl flex-col bg-[#1e1e1e] rounded-t-[16px] sm:rounded-none border-t sm:border border-white/10 shadow-2xl"
          >
            <div className="flex w-full justify-center pt-[12px] pb-[4px] sm:hidden">
              <div className="h-[4px] w-[40px] rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between border-b border-white/10 px-[20px] pb-[16px] sm:py-[20px] shrink-0">
              <h2 className="text-[18px] font-bold text-white">
                Edit Data & Jadwal Toko
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors p-[4px] -mr-[4px]"
              >
                <X size={20} />
              </button>
            </div>

            <form
              id="edit-store-form"
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-[16px] sm:p-[20px]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
                  {/* KOLOM KIRI */}
                  <div className="flex flex-col gap-[20px]">
                    <div className="flex flex-col gap-[16px]">
                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="name"
                          className={labelCls}
                          required
                        >
                          Nama Toko
                        </FieldLabel>
                        <input
                          id="name"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          className={inputCls}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel htmlFor="description" className={labelCls}>
                          Deskripsi
                        </FieldLabel>
                        <textarea
                          id="description"
                          name="description"
                          value={form.description}
                          onChange={handleChange}
                          rows={3}
                          className={`${inputCls} resize-none`}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="timezone"
                          className={labelCls}
                          required
                        >
                          Zona Waktu
                        </FieldLabel>
                        <select
                          id="timezone"
                          name="timezone"
                          value={form.timezone}
                          onChange={handleChange}
                          required
                          className={inputCls}
                        >
                          {TIMEZONES.map((tz) => (
                            <option
                              key={tz.value}
                              value={tz.value}
                              className="bg-[#1e1e1e]"
                            >
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="payment_timeout"
                          className={labelCls}
                          required
                        >
                          Batas Waktu Pembayaran (menit)
                        </FieldLabel>
                        <input
                          id="payment_timeout"
                          name="payment_timeout"
                          type="number"
                          min={1}
                          value={form.payment_timeout}
                          onChange={handleChange}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-[12px] pt-[8px] border-t border-white/10">
                      <FieldLabel className={labelCls}>
                        Jam Operasional
                      </FieldLabel>

                      <div className="flex flex-col gap-[8px]">
                        {DAYS.map((d) => {
                          const row = hours.find((h) => h.day === d.day);
                          const isActive = row?.is_active ?? false;

                          return (
                            <div
                              key={d.day}
                              className={`flex flex-col gap-[8px] p-[10px] border transition-colors ${
                                isActive
                                  ? "border-white/10 bg-white/5"
                                  : "border-white/5"
                              }`}
                            >
                              <label className="flex items-center gap-[8px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => toggleDay(d.day)}
                                  className="h-[16px] w-[16px] bg-[#1e1e1e] border-white/20 accent-[#C0FE04]"
                                />
                                <span className="text-[12px] text-white font-medium flex-1">
                                  {d.label}
                                </span>
                                <span
                                  className={`text-[12px] font-bold px-[8px] rounded-full ${
                                    isActive
                                      ? "bg-green-400/20 text-green-400"
                                      : "bg-white/10 text-white/40"
                                  }`}
                                >
                                  {isActive ? "Buka" : "Tutup"}
                                </span>
                              </label>

                              {isActive && (
                                <div className="flex items-center gap-[8px] pl-[26px]">
                                  <input
                                    type="time"
                                    value={row?.open_time || "08:00"}
                                    onChange={(e) =>
                                      updateDayTime(
                                        d.day,
                                        "open_time",
                                        e.target.value,
                                      )
                                    }
                                    className={`${inputCls} text-[12px]`}
                                    required
                                  />
                                  <span className="text-[12px] text-white/40 shrink-0">
                                    s/d
                                  </span>
                                  <input
                                    type="time"
                                    value={row?.close_time || "20:00"}
                                    onChange={(e) =>
                                      updateDayTime(
                                        d.day,
                                        "close_time",
                                        e.target.value,
                                      )
                                    }
                                    className={`${inputCls} text-[12px]`}
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* KOLOM KANAN */}
                  <div className="flex flex-col gap-[16px]">
                    <div className="flex flex-col gap-[8px]">
                      <FieldLabel
                        htmlFor="street_address"
                        className={labelCls}
                        required
                      >
                        Alamat Jalan
                      </FieldLabel>
                      <input
                        id="street_address"
                        name="street_address"
                        value={form.street_address}
                        onChange={handleChange}
                        required
                        className={inputCls}
                      />
                    </div>

                    <div className="relative flex flex-col gap-[8px]">
                      <FieldLabel
                        htmlFor="postal_search"
                        className={labelCls}
                        required
                      >
                        Cari Kode Pos / Kelurahan Baru
                      </FieldLabel>
                      <input
                        id="postal_search"
                        value={postalQuery}
                        required
                        onChange={(e) => {
                          setPostalQuery(e.target.value);
                          setShowResults(true);
                        }}
                        placeholder="Ketik buat ganti lokasi..."
                        autoComplete="off"
                        className={inputCls}
                      />

                      {showResults && postalQuery.length >= 3 && (
                        <div className="absolute z-10 top-full mt-[4px] max-h-[200px] w-full overflow-auto border border-white/10 bg-[#242429]">
                          {searchingPostal && (
                            <p className="p-[12px] text-[12px] text-white/40">
                              Mencari...
                            </p>
                          )}

                          {!searchingPostal &&
                            postalResults?.data?.length === 0 && (
                              <p className="p-[12px] text-[12px] text-white/40">
                                Tidak ditemukan.
                              </p>
                            )}

                          {postalResults?.data?.map((result) => (
                            <button
                              type="button"
                              key={result.id}
                              onClick={() => handleSelectPostal(result)}
                              className="block w-full px-[16px] py-[12px] text-left text-[12px] text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                            >
                              <p className="font-medium text-[#C0FE04]">
                                {result.title}
                              </p>
                              <p className="text-[12px] text-white/60 mt-[4px]">
                                {result.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-[12px]">
                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="village"
                          className={labelCls}
                          required
                        >
                          Kelurahan
                        </FieldLabel>
                        <input
                          id="village"
                          value={form.village}
                          readOnly
                          required
                          className={readOnlyCls}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="district"
                          className={labelCls}
                          required
                        >
                          Kecamatan
                        </FieldLabel>
                        <input
                          id="district"
                          value={form.district}
                          readOnly
                          required
                          className={readOnlyCls}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="city"
                          className={labelCls}
                          required
                        >
                          Kota/Kab
                        </FieldLabel>
                        <input
                          id="city"
                          value={form.city}
                          readOnly
                          required
                          className={readOnlyCls}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="province"
                          className={labelCls}
                          required
                        >
                          Provinsi
                        </FieldLabel>
                        <input
                          id="province"
                          value={form.province}
                          readOnly
                          required
                          className={readOnlyCls}
                        />
                      </div>
                    </div>

                    <LocationPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={(lat, lng) =>
                        setForm((f) => ({
                          ...f,
                          latitude: lat,
                          longitude: lng,
                        }))
                      }
                    />

                    <div className="grid grid-cols-2 gap-[12px]">
                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="latitude"
                          className={labelCls}
                          required
                        >
                          Latitude
                        </FieldLabel>
                        <input
                          id="latitude"
                          name="latitude"
                          type="number"
                          step="any"
                          value={form.latitude}
                          onChange={handleChange}
                          required
                          className={inputCls}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <FieldLabel
                          htmlFor="longitude"
                          className={labelCls}
                          required
                        >
                          Longitude
                        </FieldLabel>
                        <input
                          id="longitude"
                          name="longitude"
                          type="number"
                          step="any"
                          value={form.longitude}
                          onChange={handleChange}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="w-full py-[8px] bg-white text-[12px] font-medium text-[#1e1e1e] hover:bg-white/80 transition-colors"
                    >
                      Ambil Lokasi Saat Ini
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-[8px] border-t border-white/10 p-[16px] shrink-0 pb-safe">
                <RevealButton
                  type="button"
                  onClick={onClose}
                  label="batal"
                  bgAfter="bg-red-500"
                  textAfter="text-white"
                  className="rounded-none"
                />

                <RevealButton
                  type="submit"
                  disable={isSubmitting}
                  icon={Save}
                  label={isSubmitting ? "Menyimpan..." : "Simpan"}
                  className="rounded-none"
                  bgBefore="bg-[#C0FE04]"
                  textBefore="text-[#1e1e1e]"
                  bgAfter="bg-white"
                />
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
