import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Asumsi tidak terpakai tapi dibiarkan
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
import FieldLabel from "../../components/store/field-label.jsx";

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

// Disesuaikan: Background lebih gelap (inset), rounded-md, aksen kuning dari dashboard
const inputCls =
  "bg-[#1e1e1e] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#F2A724] focus-visible:border-[#F2A724] rounded-md transition-all";

const readOnlyCls =
  "bg-[#1e1e1e] border-white/5 text-white/50 rounded-md cursor-not-allowed";

export default function CreateStorePage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = createStore();

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

  // Pengecekan minimal 1 hari aktif
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

  function handleSubmit(e) {
    e.preventDefault();
    mutate(
      { ...form, operational_hours: hours },
      { onSuccess: () => navigate("/dashboard") },
    );
  }

  return (
    /* Disesuaikan: Background page disamakan dengan sidebar/bg utama dashboard */
    <div className="min-h-screen bg-[#1e1e1e] px-6 py-10 font-sans">
      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Buat Toko Baru
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Lengkapi data toko kamu buat mulai jualan di platform.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-medium text-red-400">
              {error?.response?.data?.errors ||
                "Gagal membuat toko, coba lagi."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
          {/* Kolom Kiri */}
          {/* Disesuaikan: Card background dengan border-radius 2xl seperti di dashboard */}
          <div className="flex h-full flex-col gap-8 rounded-md border-1 border-white/10 bg-white/5 p-6 lg:p-8 shadow-sm">
            <div className="space-y-5">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="name"
                  className="text-sm font-medium text-white/80"
                  required={true}
                >
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
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="description"
                  className="text-sm font-medium text-white/80"
                >
                  Deskripsi
                </FieldLabel>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="logo"
                  className="text-sm font-medium text-white/80"
                >
                  Logo Toko
                </FieldLabel>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm({ ...form, logo: e.target.files[0] })
                  }
                  className={`${inputCls} file:text-white file:bg-white/10 file:rounded-md file:border-0 file:px-3 file:mr-3 hover:file:bg-white/20`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel
                htmlFor="timezone"
                className="text-sm font-medium text-white/80"
                required={true}
              >
                Zona Waktu
              </FieldLabel>
              <Select
                value={form.timezone}
                onValueChange={(value) => setForm({ ...form, timezone: value })}
              >
                <SelectTrigger id="timezone" className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md border-white/10 bg-[#2D2E34] text-white shadow-xl">
                  {TIMEZONES.map((tz) => (
                    <SelectItem
                      key={tz.value}
                      value={tz.value}
                      className="focus:bg-[#F2A724] focus:text-[#1e1e1e] cursor-pointer rounded-md my-1"
                    >
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative space-y-4 pt-2">
              <FieldLabel
                htmlFor="operational_hours"
                className="text-sm font-medium text-white/80"
                required={true}
              >
                Jam Operasional
              </FieldLabel>

              {/* INPUT PROXY */}
              <input
                type="text"
                className="absolute left-0 top-0 h-0 w-0 opacity-0 pointer-events-none"
                value={isAnyDayOpen ? "valid" : ""}
                onChange={() => {}}
                tabIndex={-1}
                required
                onInvalid={(e) =>
                  e.target.setCustomValidity(
                    "Pilih minimal 1 hari operasional!",
                  )
                }
                onInput={(e) => e.target.setCustomValidity("")}
              />

              <div id="operational_hours" className="space-y-3">
                {DAYS.map((d) => {
                  const row = hours.find((h) => h.day === d.day);
                  return (
                    <div
                      key={d.day}
                      className="flex items-center gap-4 text-white"
                    >
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={() => toggleDay(d.day)}
                        className="h-4 w-4 rounded bg-[#1C1D22] border-white/20 accent-[#F2A724] focus:ring-[#F2A724] focus:ring-offset-0"
                      />
                      <span className="w-16 text-sm">{d.label}</span>
                      <Input
                        type="time"
                        value={row.open_time}
                        disabled={!row.is_active}
                        onChange={(e) =>
                          updateDayTime(d.day, "open_time", e.target.value)
                        }
                        className={`w-32 ${inputCls}`}
                        required={row.is_active}
                      />
                      <span className="text-sm text-white/40">s/d</span>
                      <Input
                        type="time"
                        value={row.close_time}
                        disabled={!row.is_active}
                        onChange={(e) =>
                          updateDayTime(d.day, "close_time", e.target.value)
                        }
                        className={`w-32 ${inputCls}`}
                        required={row.is_active}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Kolom Kanan */}
          {/* Disesuaikan: Card background dengan border-radius 2xl */}
          <div className="flex h-full flex-col gap-8 rounded-md bg-white/5 border-1 border-white/10 p-6 lg:p-8 shadow-sm">
            <div className="space-y-5">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="street_address"
                  className="text-sm font-medium text-white/80"
                  required={true}
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

              <div className="relative space-y-2">
                <FieldLabel
                  htmlFor="postal_search"
                  className="text-sm font-medium text-white/80"
                  required={true}
                >
                  Cari Kode Pos / Kelurahan
                </FieldLabel>

                {/* INPUT PROXY */}
                <input
                  type="text"
                  className="absolute bottom-0 left-1/2 h-0 w-0 opacity-0 pointer-events-none"
                  value={form.postal_code}
                  onChange={() => {}}
                  tabIndex={-1}
                  required
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      "Silakan cari dan pilih kelurahan dari dropdown kode pos!",
                    )
                  }
                  onInput={(e) => e.target.setCustomValidity("")}
                />

                <Input
                  id="postal_search"
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
                  <div className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md border border-white/10 bg-[#2D2E34] shadow-2xl">
                    {searchingPostal && (
                      <p className="p-4 text-sm text-white/40">Mencari...</p>
                    )}
                    {!searchingPostal && postalResults?.data?.length === 0 && (
                      <p className="p-4 text-sm text-white/40">
                        Tidak ditemukan.
                      </p>
                    )}
                    {postalResults?.data?.map((result) => (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => handleSelectPostal(result)}
                        className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                      >
                        <p className="font-medium text-[#F2A724]">
                          {result.title}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                          {result.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="village"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
                    Kelurahan
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
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="district"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
                    Kecamatan
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
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="city"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
                    Kota/Kabupaten
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
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="province"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
                    Provinsi
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
                <div className="col-span-2 space-y-2">
                  <FieldLabel
                    htmlFor="postal_code"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
                    Kode Pos
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

              <div className="space-y-3 pt-2">
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={(lat, lng) =>
                    setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="latitude"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
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
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="longitude"
                    className="text-sm font-medium text-white/80"
                    required={true}
                  >
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
                className="w-full rounded-md border-white/10 bg-white text-[#1e1e1e] hover:bg-white/60 transition-colors mt-2"
              >
                Ambil Lokasi Saat Ini
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-md px-8 text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#F2A724] px-10 font-bold text-[#25262B] hover:bg-[#F2A724]/60 transition-colors shadow-md"
          >
            {isPending ? "Menyimpan..." : "Buat Toko"}
          </Button>
        </div>
      </form>
    </div>
  );
}
