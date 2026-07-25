import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// API
import { createStore, postalCode } from "../../lib/sellerApi.js";

// =========================================================
// FIX: Icon Marker Leaflet yang sering hilang di React
// =========================================================
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// =========================================================
// KONSTANTA: Hari Operasional
// =========================================================
// day numerik sesuai backend: 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
const DAYS = [
  { day: 1, label: "Senin" },
  { day: 2, label: "Selasa" },
  { day: 3, label: "Rabu" },
  { day: 4, label: "Kamis" },
  { day: 5, label: "Jumat" },
  { day: 6, label: "Sabtu" },
  { day: 0, label: "Minggu" },
];

const DEFAULT_OPERATIONAL_HOURS = DAYS.map((d) => ({
  day: d.day,
  is_active: true,
  open_time: "08:00",
  close_time: "20:00",
}));

// =========================================================
// HELPER: Cropper Image
// =========================================================
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], "logo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg");
  });
}

// =========================================================
// KOMPONEN PETA (Nangkap event klik)
// =========================================================
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : <Marker position={position}></Marker>;
}

// =========================================================
// KOMPONEN UTAMA
// =========================================================
export default function CreateStore() {
  // --- Data Utama ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");

  // --- Data Alamat Baru ---
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCodeInput, setPostalCodeInput] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [villageOptions, setVillageOptions] = useState([]);

  // Default Koordinat Peta (Mungkid, Magelang)
  const [position, setPosition] = useState({ lat: -7.5849, lng: 110.2754 });

  // --- Jam Operasional ---
  const [operationalHours, setOperationalHours] = useState(
    DEFAULT_OPERATIONAL_HOURS,
  );

  // --- Data File/Cropper ---
  const [logo, setLogo] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const navigate = useNavigate();

  // =========================================================
  // MUTATION: Buat Toko
  // =========================================================
  const mutation = useMutation({
    mutationFn: createStore,
    onSuccess: () => {
      toast.success("Toko dan Logo berhasil dibuat!");
      navigate("/seller");
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.errors || "Gagal membuat toko.";
      toast.error(errorMsg);
      console.error(error);
    },
  });

  // =========================================================
  // HANDLER: Auto-fill Kodepos
  // =========================================================
  const handlePostalCodeChange = async (e) => {
    // Hanya izinkan angka
    const val = e.target.value.replace(/\D/g, "");
    setPostalCodeInput(val);

    // Otomatis fetch saat 5 digit
    if (val.length === 5) {
      const toastId = toast.loading("Mencari data wilayah...");
      try {
        const data = await postalCode(val);
        if (data && data.length > 0) {
          toast.success("Wilayah ditemukan!", { id: toastId });
          setProvince(data[0].province.name);
          setCity(data[0].city.name);
          setDistrict(data[0].district.name);
          setVillageOptions(data);

          // Otomatis pilih desa pertama
          setVillage(data[0].village.name);
        } else {
          toast.error("Kodepos tidak ditemukan", { id: toastId });
          resetAutoFill();
        }
      } catch (err) {
        toast.error("Gagal mengambil data wilayah", { id: toastId });
        console.error(err);
        resetAutoFill();
      }
    } else {
      // Reset jika kurang dari 5 digit
      if (province) resetAutoFill();
    }
  };

  const resetAutoFill = () => {
    setProvince("");
    setCity("");
    setDistrict("");
    setVillage("");
    setVillageOptions([]);
  };

  // =========================================================
  // HANDLER: Jam Operasional
  // =========================================================
  const toggleDayOpen = (index) => {
    setOperationalHours((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_active: !item.is_active } : item,
      ),
    );
  };

  const updateDayTime = (index, field, value) => {
    setOperationalHours((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const applyToAllDays = () => {
    const { open_time, close_time } = operationalHours[0];
    setOperationalHours((prev) =>
      prev.map((item) => ({ ...item, open_time, close_time })),
    );
    toast.success("Jam Senin diterapkan ke semua hari yang buka.");
  };

  // =========================================================
  // HANDLER: File & Cropper
  // =========================================================
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran logo maksimal 2MB!");
        e.target.value = null;
        return;
      }
      const imageDataUrl = URL.createObjectURL(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
      e.target.value = null;
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      setLogo(croppedFile);
      setPreviewLogo(URL.createObjectURL(croppedFile));
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar.");
    }
  };

  // =========================================================
  // HANDLER: Submit Form
  // =========================================================
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validasi area wajib
    if (!province || !village) {
      toast.error("Mohon lengkapi kodepos dan pilih desa!");
      return;
    }

    // Validasi minimal 1 hari buka
    const hasOpenDay = operationalHours.some((item) => item.is_active);
    if (!hasOpenDay) {
      toast.error("Toko harus buka minimal 1 hari!");
      return;
    }

    // Validasi jam buka < jam tutup untuk hari yang buka
    const invalidDay = operationalHours.find(
      (item) => item.is_active && item.open_time >= item.close_time,
    );
    if (invalidDay) {
      toast.error("Jam buka harus lebih awal dari jam tutup.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("timezone", timezone);

    // Alamat terpisah
    formData.append("street_address", streetAddress);
    formData.append("postal_code", postalCodeInput);
    formData.append("province", province);
    formData.append("city", city);
    formData.append("district", district);
    formData.append("village", village);
    formData.append("latitude", position.lat);
    formData.append("longitude", position.lng);

    // Jam operasional (dikirim sebagai JSON string)
    formData.append("operational_hours", JSON.stringify(operationalHours));

    if (logo) {
      formData.append("logo", logo);
    }
    mutation.mutate(formData);
  };

  const email = JSON.parse(localStorage.getItem("user"))?.email || "User";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-10 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-lg relative">
        <h1 className="mb-2 text-3xl font-bold">Buat Toko</h1>
        <p className="mb-8 text-gray-500">
          Lengkapi informasi dan lokasi toko untuk mulai menerima antrean.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* INFORMASI DASAR */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold border-b pb-2">Informasi Dasar</h2>

            <div>
              <label className="mb-2 block font-medium">Email Penjual</label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full rounded-lg border bg-gray-100 px-4 py-3 cursor-not-allowed text-gray-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Nama Toko *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Barbershop Munif"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Deskripsi Toko *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ceritakan sedikit tentang tokomu..."
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 min-h-[100px] resize-y"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Zona Waktu *</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 bg-white"
              >
                <option value="Asia/Jakarta">
                  Waktu Indonesia Barat (WIB)
                </option>
                <option value="Asia/Makassar">
                  Waktu Indonesia Tengah (WITA)
                </option>
                <option value="Asia/Jayapura">
                  Waktu Indonesia Timur (WIT)
                </option>
              </select>
            </div>
          </div>

          {/* JAM OPERASIONAL */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold">Jam Operasional</h2>
              <button
                type="button"
                onClick={applyToAllDays}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Samakan semua hari
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Default: buka setiap hari 08:00–20:00. Sesuaikan atau matikan hari
              tertentu jika toko tutup.
            </p>

            <div className="space-y-2">
              {operationalHours.map((item, index) => {
                const dayLabel = DAYS[index].label;
                return (
                  <div
                    key={item.day}
                    className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex items-center gap-3 min-w-[110px] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={() => toggleDayOpen(index)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span className="font-medium">{dayLabel}</span>
                    </label>

                    {item.is_active ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={item.open_time}
                          onChange={(e) =>
                            updateDayTime(index, "open_time", e.target.value)
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-blue-600"
                          required={item.is_active}
                        />
                        <span className="text-gray-400">—</span>
                        <input
                          type="time"
                          value={item.close_time}
                          onChange={(e) =>
                            updateDayTime(index, "close_time", e.target.value)
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-blue-600"
                          required={item.is_active}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">
                        Tutup
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* LOKASI DAN ALAMAT */}
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold border-b pb-2">Lokasi & Alamat</h2>

            {/* Peta Interaktif */}
            <div>
              <label className="mb-2 block font-medium">
                Titik Peta Toko *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Klik pada peta untuk menyesuaikan posisi warung/toko Anda.
              </p>
              <div className="h-64 w-full rounded-lg overflow-hidden border-2 border-gray-300 z-0 relative">
                <MapContainer
                  center={[position.lat, position.lng]}
                  zoom={14}
                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker
                    position={position}
                    setPosition={setPosition}
                  />
                </MapContainer>
              </div>
              <p className="mt-1 text-xs font-mono text-gray-500">
                Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
              </p>
            </div>

            {/* Auto-fill Kodepos */}
            <div>
              <label className="mb-2 block font-medium">Kodepos *</label>
              <input
                type="text"
                maxLength={5}
                value={postalCodeInput}
                onChange={handlePostalCodeChange}
                placeholder="Masukkan 5 digit Kodepos..."
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 font-mono tracking-widest text-lg"
                required
              />
            </div>

            {/* Kolom Auto-fill Terkunci */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Provinsi
                </label>
                <input
                  type="text"
                  disabled
                  value={province}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Kota/Kabupaten
                </label>
                <input
                  type="text"
                  disabled
                  value={city}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Kecamatan
                </label>
                <input
                  type="text"
                  disabled
                  value={district}
                  placeholder="Otomatis"
                  className="w-full rounded-lg border bg-gray-100 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Dropdown Desa */}
            <div>
              <label className="mb-2 block font-medium">
                Desa / Kelurahan *
              </label>
              <select
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                disabled={villageOptions.length === 0}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 bg-white disabled:bg-gray-100"
                required
              >
                <option value="" disabled>
                  Pilih Desa...
                </option>
                {villageOptions.map((item) => (
                  <option key={item.village.id} value={item.village.name}>
                    {item.village.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Alamat Jalan Manual */}
            <div>
              <label className="mb-2 block font-medium">
                Alamat Jalan / Patokan *
              </label>
              <textarea
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Jalan, No Rumah, RT/RW, Patokan terdekat..."
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-600 min-h-[80px] resize-y"
                required
              />
            </div>
          </div>

          {/* LOGO */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="mb-2 block font-medium">
                Logo Toko (Opsional)
              </label>
              <div className="flex items-center gap-4">
                {previewLogo ? (
                  <div className="relative h-20 w-20 shrink-0">
                    <img
                      src={previewLogo}
                      alt="Logo"
                      className="h-full w-full rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogo(null);
                        setPreviewLogo(null);
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 h-6 w-6 text-white font-bold flex items-center justify-center hover:bg-red-600"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
                    <span className="text-xl">+</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border px-4 py-2 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-blue-600 py-3 mt-4 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {mutation.isPending ? "Membuat Toko..." : "Buat Toko Sekarang"}
          </button>
        </form>
      </div>

      {/* MODAL CROPPER */}
      {showCropper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">Sesuaikan Logo</h2>
            </div>
            <div className="relative h-64 w-full bg-gray-900 sm:h-80">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 flex flex-col gap-4">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(e.target.value)}
                className="w-full accent-blue-600"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 font-bold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
