import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStore, usePostalCode } from "../../hooks/store.js";
import LocationPicker from "../../components/store/location-picker.jsx";
import FieldLabel from "../../components/field-label.jsx";
import { RevealButton } from "../../components/reveal-button.jsx";
import ImageCropperModal from "../../components/image-cropper-modal.jsx";
import { useDocumentTitle } from "../../hooks/use-document-title.js";
// Pastikan path import ini sesuai dengan struktur folder kamu

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
  "rounded-none bg-white/5 border-white/10 text-white text-[12px] placeholder:text-white/30 focus-visible:ring-[#C0FE04] focus-visible:border-[#C0FE04] transition-all";

const readOnlyCls =
  "rounded-none bg-white/5 border-white/5 text-white/50 text-[12px] cursor-not-allowed";

const labelCls = "text-[16px] font-bold text-white/50";

export default function CreateStorePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = createStore();
  useDocumentTitle("Buat Toko");
  const [form, setForm] = useState({
    name: "",
    description: "",
    street_address: "",
    village: "",
    district: "",
    city: "",
    province: "",
    postal_code: "",
    latitude: "",
    longitude: "",
    timezone: "Asia/Jakarta",
    logo: null,
  });

  const [hours, setHours] = useState(
    DAYS.map((d) => ({
      day: d.day,
      open_time: "08:00",
      close_time: "20:00",
      is_active: true,
    })),
  );

  const [postalQuery, setPostalQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  // State baru untuk cropper dan preview
  const [pendingLogoSrc, setPendingLogoSrc] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);

  const isAnyDayOpen = hours.some((h) => h.is_active);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(postalQuery), 400);
    return () => clearTimeout(timer);
  }, [postalQuery]);

  const { data: postalResults, isFetching: searchingPostal } =
    usePostalCode(debouncedQuery);

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

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
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

  // --- FUNGSI UNTUK IMAGE CROPPER ---
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingLogoSrc(URL.createObjectURL(file));
    e.target.value = ""; // Reset value agar file yang sama bisa di-klik lagi jika batal
  }

  function handleCropConfirm(blob) {
    // Ubah Blob menjadi File object agar sesuai format yang dikirim ke backend
    const file = new File([blob], "store_logo.png", { type: "image/png" });

    setForm((prev) => ({ ...prev, logo: file }));
    setLogoPreviewUrl(URL.createObjectURL(blob));
    setPendingLogoSrc(null);
  }
  // ---------------------------------

  function handleSubmit(e) {
    e.preventDefault();

    // 1. Validasi Manual Kode Pos
    if (!form.postal_code) {
      toast.error("Silakan cari dan pilih kelurahan dari dropdown kode pos!");
      return;
    }

    // 2. Validasi Manual Jam Operasional
    if (!isAnyDayOpen) {
      toast.error("Pilih minimal 1 hari operasional!");
      return;
    }

    mutate(
      { ...form, operational_hours: hours },
      {
        onSuccess: () => {
          toast.success("Toko kamu berhasil dibuat!");
          navigate("/dashboard");
        },
        onError: () => {
          toast.error(error.message);
        },
      },
    );
  }

  return (
    <div className="min-h-full bg-[#1e1e1e] p-[16px] sm:p-[24px] relative">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full flex flex-col gap-[24px]"
      >
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <h1 className="text-[24px] font-bold text-white">Buat Toko Baru</h1>
          <p className="mt-[4px] text-[12px] text-white/50">
            Lengkapi data toko kamu buat mulai jualan di platform.
          </p>
        </motion.div>
        <div className="w-full h-[1px] bg-white/10"></div>

        <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2 lg:items-stretch">
          {/* Kolom Kiri */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="flex h-full flex-col gap-[24px] border border-white/10  p-[16px] sm:p-[24px]"
          >
            <div className="flex flex-col gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="name" className={labelCls} required>
                  Nama Toko
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="description" className={labelCls}>
                  Deskripsi
                </FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* PERUBAHAN: Input Logo dengan Pratinjau */}
              <div className="flex flex-col gap-[6px]">
                <FieldLabel htmlFor="logo" className={labelCls}>
                  Logo Toko
                </FieldLabel>
                <div className="flex items-center gap-[16px]">
                  {logoPreviewUrl && (
                    <div className="h-[48px] w-[48px] shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <img
                        src={logoPreviewUrl}
                        alt="Preview Logo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className={`${inputCls} flex-1 file:text-white file:bg-white/10 file:border-0 file:px-[16px] file:mr-[12px] hover:file:bg-white/20`}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[6px]">
              <FieldLabel htmlFor="timezone" className={labelCls} required>
                Zona Waktu
              </FieldLabel>
              <Select
                value={form.timezone}
                required
                onValueChange={(value) => setForm({ ...form, timezone: value })}
              >
                <SelectTrigger id="timezone" className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-white/10 bg-[#242429] text-white">
                  {TIMEZONES.map((tz) => (
                    <SelectItem
                      key={tz.value}
                      value={tz.value}
                      className="rounded-none focus:bg-[#C0FE04] focus:text-[#1e1e1e] cursor-pointer text-[16px] my-[2px]"
                    >
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jam Operasional */}
            <div className="flex flex-col gap-[12px] pt-[8px] border-t border-white/10">
              <FieldLabel className={labelCls} required>
                Jam Operasional
              </FieldLabel>
              <div className="flex flex-col gap-[10px]">
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
                      <label className="flex items-center gap-[10px] cursor-pointer">
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
                          className={`text-[11px] font-bold px-[8px] py-[2px] rounded-full ${
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
                              updateDayTime(d.day, "open_time", e.target.value)
                            }
                            className={`${inputCls} text-[13px]`}
                            required
                          />
                          <span className="text-[12px] text-white/40 shrink-0">
                            s/d
                          </span>
                          <input
                            type="time"
                            value={row?.close_time || "20:00"}
                            onChange={(e) =>
                              updateDayTime(d.day, "close_time", e.target.value)
                            }
                            className={`${inputCls} text-[13px]`}
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Kolom Kanan */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            className="flex h-full flex-col gap-[24px]  border border-white/10 p-[16px] sm:p-[24px]"
          >
            <div className="flex flex-col gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <FieldLabel
                  htmlFor="street_address"
                  className={labelCls}
                  required
                >
                  Alamat Jalan
                </FieldLabel>
                <Input
                  id="street_address"
                  name="street_address"
                  value={form.street_address}
                  onChange={handleChange}
                  required
                  className={inputCls}
                />
              </div>

              <div className="relative flex flex-col gap-[6px]">
                <FieldLabel
                  htmlFor="postal_search"
                  className={labelCls}
                  required
                >
                  Cari Kode Pos / Kelurahan
                </FieldLabel>
                <p className="italic text-white/60 text-[12px]">
                  digunakan untuk mengisi kolom otomatis di bawah
                </p>

                <Input
                  id="postal_search"
                  required
                  value={postalQuery}
                  onChange={(e) => {
                    setPostalQuery(e.target.value);
                    setShowResults(true);
                  }}
                  placeholder="Ketik kode pos atau nama kelurahan..."
                  autoComplete="off"
                  className={inputCls}
                />
                {showResults && postalQuery.length >= 3 && (
                  <div className="absolute z-10 mt-[8px] max-h-[240px] w-full overflow-auto border border-white/10 bg-[#242429]">
                    {searchingPostal && (
                      <p className="p-[16px] text-[12px] text-white/40">
                        Mencari...
                      </p>
                    )}
                    {!searchingPostal && postalResults?.data?.length === 0 && (
                      <p className="p-[16px] text-[12px] text-white/40">
                        Tidak ditemukan.
                      </p>
                    )}
                    {postalResults?.data?.map((result) => (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => handleSelectPostal(result)}
                        className="block w-full px-[16px] py-[16px] text-left text-[12px] text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
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

              <div className="grid grid-cols-2 gap-[16px]">
                <div className="flex flex-col gap-[6px]">
                  <FieldLabel htmlFor="village" className={labelCls} required>
                    Kelurahan (otomatis)
                  </FieldLabel>
                  <Input
                    id="village"
                    name="village"
                    value={form.village}
                    readOnly
                    placeholder="Otomatis"
                    className={readOnlyCls}
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <FieldLabel htmlFor="district" className={labelCls} required>
                    Kecamatan (otomaits)
                  </FieldLabel>
                  <Input
                    id="district"
                    name="district"
                    value={form.district}
                    readOnly
                    placeholder="Otomatis"
                    className={readOnlyCls}
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <FieldLabel htmlFor="city" className={labelCls} required>
                    Kota/Kabupaten (otomatis)
                  </FieldLabel>
                  <Input
                    id="city"
                    name="city"
                    value={form.city}
                    readOnly
                    placeholder="Otomatis"
                    className={readOnlyCls}
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <FieldLabel htmlFor="province" className={labelCls} required>
                    Provinsi (otomatis)
                  </FieldLabel>
                  <Input
                    id="province"
                    name="province"
                    value={form.province}
                    readOnly
                    placeholder="Otomatis"
                    className={readOnlyCls}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-[6px]">
                  <FieldLabel
                    htmlFor="postal_code"
                    className={labelCls}
                    required
                  >
                    Kode Pos (otomatis)
                  </FieldLabel>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={form.postal_code}
                    readOnly
                    placeholder="Otomatis terisi"
                    className={readOnlyCls}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[16px]">
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={(lat, lng) =>
                    setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-[16px]">
                <div className="flex flex-col gap-[6px]">
                  <FieldLabel htmlFor="latitude" className={labelCls} required>
                    Latitude
                  </FieldLabel>
                  <Input
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
                <div className="flex flex-col gap-[6px]">
                  <FieldLabel htmlFor="longitude" className={labelCls} required>
                    Longitude
                  </FieldLabel>
                  <Input
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
              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                className="rounded-none w-full border-white/10 bg-white text-[16px] font-medium text-[#1e1e1e] hover:bg-white/60 transition-colors"
              >
                Ambil Lokasi Saat Ini
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.25 }}
          className="flex flex-col items-center justify-end gap-[8px]"
        >
          <p className="text-white/60 text-right w-full italic text-[12px]">
            Pastikan data yang diisi sudah benar!{" "}
          </p>
          <div className="flex items-center justify-end gap-[8px] w-full">
            {" "}
            <RevealButton
              label="batal"
              type="button"
              variant="ghost"
              bgAfter="bg-red-500"
              textAfter="text-white"
              onClick={() => navigate("/store")}
              className="rounded-none"
            ></RevealButton>
            <RevealButton
              label={isPending ? "Menyimpan..." : "Buat Toko"}
              type="submit"
              disable={isPending}
              bgBefore="bg-[#C0FE04]"
              bgAfter="bg-white"
              textBefore="text-[#1e1e1e]"
              className="rounded-none"
            >
              {isPending ? "Menyimpan..." : "Buat Toko"}
            </RevealButton>
          </div>
        </motion.div>
      </form>

      {/* Komponen Cropper akan menutupi layer ketika state imageSrc tidak null */}
      <ImageCropperModal
        imageSrc={pendingLogoSrc}
        onCancel={() => setPendingLogoSrc(null)}
        onConfirm={handleCropConfirm}
        isUploading={false}
        cropShape="round"
      />
    </div>
  );
}
