import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getStore,
  updateStoreLogo,
  updateStoreProfile,
  deleteStore,
  getOperationalHours,
  updateOperationalHours,
  postalCode,
} from "../../lib/sellerApi.js";

// FIX: Icon Marker Leaflet yang sering hilang di React
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const displayFont = { fontFamily: "'Fraunces', Georgia, serif" };

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
// HELPER: Crop Gambar
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

  return position ? <Marker position={position} /> : null;
}

// =========================================================
// KOMPONEN 1: FETCHING DATA (storeMe + operationalHours)
// =========================================================
export default function EditStore() {
  const { data: store, isLoading: isStoreLoading } = useQuery({
    queryKey: ["storeMe"],
    queryFn: getStore,
  });

  const { data: opHours, isLoading: isHoursLoading } = useQuery({
    queryKey: ["operationalHours"],
    queryFn: getOperationalHours,
  });

  if (isStoreLoading || isHoursLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E1D8] border-t-[#C98A1F]" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-10 text-center text-[#B23A2E]">
        Toko tidak ditemukan.
      </div>
    );
  }

  return <EditStoreForm store={store} initialSchedule={opHours || []} />;
}

// =========================================================
// KOMPONEN 2: FORM GABUNGAN (Profil + Alamat + Lokasi + Jadwal)
// =========================================================
function EditStoreForm({ store, initialSchedule }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backendUrl = import.meta.env.VITE_API_PATH.replace("/api", "");

  // ---- Info Dasar ----
  const [name, setName] = useState(store.name || "");
  const [description, setDescription] = useState(store.description || "");
  const [timezone, setTimezone] = useState(store.timezone || "Asia/Jakarta");
  const [paymentTimeout, setPaymentTimeout] = useState(
    store.payment_timeout != null ? String(store.payment_timeout) : "",
  );

  // ---- Alamat (pola sama kayak CreateStore: kodepos auto-fill) ----
  const [streetAddress, setStreetAddress] = useState(
    store.street_address || "",
  );
  const [postalCodeInput, setPostalCodeInput] = useState(
    store.postal_code || "",
  );
  const [province, setProvince] = useState(store.province || "");
  const [city, setCity] = useState(store.city || "");
  const [district, setDistrict] = useState(store.district || "");
  const [village, setVillage] = useState(store.village || "");
  // Seed opsi desa dari data toko yang udah ada, biar dropdown langsung
  // keisi tanpa perlu user ngetik ulang kodepos.
  const [villageOptions, setVillageOptions] = useState(
    store.village
      ? [
          {
            village: { id: store.village, name: store.village },
            province: { name: store.province },
            city: { name: store.city },
            district: { name: store.district },
          },
        ]
      : [],
  );

  // ---- Lokasi (Peta) ----
  const [position, setPosition] = useState(
    store.latitude != null && store.longitude != null
      ? { lat: Number(store.latitude), lng: Number(store.longitude) }
      : { lat: -6.2088, lng: 106.8456 }, // fallback: Jakarta
  );

  // ---- Jadwal Operasional ----
  const [schedule, setSchedule] = useState(initialSchedule || []);

  // ---- Cropper Logo ----
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // ---- Modal Hapus ----
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // =========================================================
  // MUTATIONS
  // =========================================================
  const profileMutation = useMutation({ mutationFn: updateStoreProfile });
  const hoursMutation = useMutation({ mutationFn: updateOperationalHours });

  const logoMutation = useMutation({
    mutationFn: updateStoreLogo,
    onSuccess: () => {
      toast.success("Logo toko berhasil diganti!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      setShowCropper(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal mengganti logo.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => {
      toast.success("Toko berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      setIsDeleteModalOpen(false);
      navigate("/seller");
    },
    onError: (error) => {
      toast.error(error.response?.data?.errors || "Gagal menghapus toko.");
    },
  });

  const isSaving = profileMutation.isPending || hoursMutation.isPending;

  // =========================================================
  // HANDLERS - ALAMAT (auto-fill kodepos)
  // =========================================================
  const resetAutoFill = () => {
    setProvince("");
    setCity("");
    setDistrict("");
    setVillage("");
    setVillageOptions([]);
  };

  const handlePostalCodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setPostalCodeInput(val);

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
    } else if (province) {
      resetAutoFill();
    }
  };

  // =========================================================
  // HANDLERS - LOGO
  // =========================================================
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran logo maksimal 5MB!");
        e.target.value = null;
        return;
      }
      setImageSrc(URL.createObjectURL(file));
      setShowCropper(true);
      e.target.value = null;
    }
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("logo", croppedFile);
      logoMutation.mutate(formData);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memotong gambar.");
    }
  };

  // =========================================================
  // HANDLERS - JADWAL
  // =========================================================
  const handleToggleDay = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.day !== dayIndex) return item;
        const newIsActive = !item.is_active;
        return {
          ...item,
          is_active: newIsActive,
          open_time: newIsActive && !item.open_time ? "08:00" : item.open_time,
          close_time:
            newIsActive && !item.close_time ? "21:00" : item.close_time,
        };
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

  // =========================================================
  // SUBMIT GABUNGAN (Profil + Alamat + Lokasi + Jadwal)
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!province || !village) {
      toast.error("Mohon lengkapi kodepos dan pilih desa!");
      return;
    }

    const profilePayload = {
      name,
      description,
      timezone,
      payment_timeout: paymentTimeout === "" ? null : Number(paymentTimeout),
      street_address: streetAddress,
      postal_code: postalCodeInput,
      province,
      city,
      district,
      village,
      latitude: position.lat,
      longitude: position.lng,
    };

    const cleanSchedule = schedule.map((item) => ({
      day: item.day,
      open_time: item.open_time,
      close_time: item.close_time,
      is_active: item.is_active,
    }));

    try {
      await Promise.all([
        profileMutation.mutateAsync(profilePayload),
        hoursMutation.mutateAsync({ operational_hours: cleanSchedule }),
      ]);
      toast.success("Semua perubahan berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["storeMe"] });
      queryClient.invalidateQueries({ queryKey: ["operationalHours"] });
      navigate("/seller");
    } catch (error) {
      toast.error(
        error.response?.data?.errors || "Gagal menyimpan sebagian perubahan.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#E4E1D8] bg-white p-8 shadow-sm">
        <PageHeader
          storeName={store?.name}
          onDeleteClick={() => setIsDeleteModalOpen(true)}
        />

        {store.manual_status && (
          <ManualStatusBadge
            status={store.is_open}
            updatedAt={store.manual_updated_at}
          />
        )}

        <LogoUploader
          logoUrl={store.logo_url}
          backendUrl={backendUrl}
          isUploading={logoMutation.isPending}
          onFileChange={handleFileChange}
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          <BasicInfoSection
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
          />

          <AddressSection
            streetAddress={streetAddress}
            setStreetAddress={setStreetAddress}
            postalCodeInput={postalCodeInput}
            onPostalCodeChange={handlePostalCodeChange}
            province={province}
            city={city}
            district={district}
            village={village}
            setVillage={setVillage}
            villageOptions={villageOptions}
          />

          <LocationMapSection position={position} setPosition={setPosition} />

          <SettingsSection
            timezone={timezone}
            setTimezone={setTimezone}
            paymentTimeout={paymentTimeout}
            setPaymentTimeout={setPaymentTimeout}
          />

          <ScheduleSection
            schedule={schedule}
            onToggleDay={handleToggleDay}
            onTimeChange={handleTimeChange}
          />

          <div className="mt-8 flex gap-3 border-t border-[#E4E1D8] pt-6">
            <button
              type="button"
              onClick={() => navigate("/seller")}
              className="w-1/3 rounded-lg border border-[#E4E1D8] py-3 font-semibold text-[#1C2321] transition hover:bg-[#FAF9F6]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-2/3 rounded-lg bg-[#147356] py-3 font-semibold text-white transition hover:bg-[#0F5C44] disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua Perubahan"}
            </button>
          </div>
        </form>
      </div>

      <LogoCropperModal
        show={showCropper}
        imageSrc={imageSrc}
        crop={crop}
        zoom={zoom}
        setCrop={setCrop}
        setZoom={setZoom}
        onCropComplete={onCropComplete}
        isSaving={logoMutation.isPending}
        onCancel={() => setShowCropper(false)}
        onSave={handleSaveCrop}
      />

      <DeleteStoreModal
        show={isDeleteModalOpen}
        storeName={store?.name}
        isDeleting={deleteMutation.isPending}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Header + Tombol Hapus
// =========================================================
function PageHeader({ onDeleteClick }) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between">
        <h1 style={displayFont} className="text-2xl font-bold text-[#1C2321]">
          Edit Profil Toko
        </h1>
        <button
          type="button"
          onClick={onDeleteClick}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#FBEAE7] text-[#B23A2E] transition hover:bg-[#F1CFC7]"
          title="Hapus Toko"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>
      <p className="mb-6 text-sm text-[#8A8375]">
        Perbarui informasi tokomu agar pelanggan makin percaya.
      </p>
    </>
  );
}

// =========================================================
// SUB-KOMPONEN: Badge Status Manual
// =========================================================
function ManualStatusBadge({ status, updatedAt }) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-[#E4E1D8] bg-[#FCFBF9] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[#1C2321]">
          Status Manual:{" "}
          <span
            className={status === true ? "text-[#147356]" : "text-[#B23A2E]"}
          >
            {status === true ? "Buka" : "Tutup"}
          </span>
        </p>
        {updatedAt && (
          <p className="text-xs text-[#8A8375]">
            Diubah terakhir: {new Date(updatedAt).toLocaleString("id-ID")}
          </p>
        )}
      </div>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Upload + Preview Logo
// =========================================================
function LogoUploader({ logoUrl, backendUrl, isUploading, onFileChange }) {
  return (
    <div className="mb-8 flex flex-col items-center border-b border-[#E4E1D8] pb-8">
      <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full border border-[#E4E1D8] bg-[#F1EFE9]">
        {logoUrl ? (
          <img
            src={`${backendUrl}${logoUrl}`}
            alt="Logo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            🏪
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>
      <label
        className={`cursor-pointer text-sm font-semibold transition ${
          isUploading ? "text-gray-400" : "text-[#147356] hover:text-[#0F5C44]"
        }`}
      >
        {isUploading ? "Mengunggah..." : "Ganti Logo Toko"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Info Dasar
// =========================================================
function BasicInfoSection({ name, setName, description, setDescription }) {
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#8A8375]">
        Info Dasar
      </h2>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
          Nama Toko
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
          Deskripsi
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px] w-full resize-y rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
        />
      </div>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Alamat (kodepos auto-fill, sama kayak CreateStore)
// =========================================================
function AddressSection({
  streetAddress,
  setStreetAddress,
  postalCodeInput,
  onPostalCodeChange,
  province,
  city,
  district,
  village,
  setVillage,
  villageOptions,
}) {
  return (
    <div className="space-y-5 border-t border-[#E4E1D8] pt-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#8A8375]">
        Alamat
      </h2>

      <div>
        <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
          Kodepos *
        </label>
        <input
          type="text"
          maxLength={5}
          value={postalCodeInput}
          onChange={onPostalCodeChange}
          placeholder="Masukkan 5 digit kodepos..."
          className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 font-mono text-lg tracking-widest outline-none focus:border-[#C98A1F]"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#8A8375]">
            Provinsi
          </label>
          <input
            type="text"
            disabled
            value={province}
            placeholder="Otomatis"
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F1EFE9] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#8A8375]">
            Kota/Kabupaten
          </label>
          <input
            type="text"
            disabled
            value={city}
            placeholder="Otomatis"
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F1EFE9] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#8A8375]">
            Kecamatan
          </label>
          <input
            type="text"
            disabled
            value={district}
            placeholder="Otomatis"
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F1EFE9] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
          Desa/Kelurahan *
        </label>
        <select
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          disabled={villageOptions.length === 0}
          className="w-full rounded-lg border border-[#E4E1D8] bg-white px-4 py-2.5 outline-none focus:border-[#C98A1F] disabled:bg-[#F1EFE9]"
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

      <div>
        <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
          Alamat Jalan / Patokan *
        </label>
        <textarea
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          placeholder="Jalan, No Rumah, RT/RW, patokan terdekat..."
          className="min-h-[80px] w-full resize-y rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
          required
        />
      </div>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Titik Lokasi (Peta)
// =========================================================
function LocationMapSection({ position, setPosition }) {
  return (
    <div className="space-y-3 border-t border-[#E4E1D8] pt-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#8A8375]">
        Titik Lokasi
      </h2>
      <p className="text-xs text-[#8A8375]">
        Klik pada peta untuk menyesuaikan posisi toko.
      </p>
      <div className="relative z-0 h-64 w-full overflow-hidden rounded-xl border-2 border-[#E4E1D8]">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={14}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      <p className="font-mono text-xs text-[#8A8375]">
        Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
      </p>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Pengaturan (Timezone + Payment Timeout)
// =========================================================
function SettingsSection({
  timezone,
  setTimezone,
  paymentTimeout,
  setPaymentTimeout,
}) {
  return (
    <div className="space-y-5 border-t border-[#E4E1D8] pt-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#8A8375]">
        Pengaturan
      </h2>
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#1C2321]">
          Zona Waktu
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-lg border border-[#E4E1D8] bg-white px-4 py-2.5 outline-none focus:border-[#C98A1F]"
        >
          <option value="Asia/Jakarta">Waktu Indonesia Barat (WIB)</option>
          <option value="Asia/Makassar">Waktu Indonesia Tengah (WITA)</option>
          <option value="Asia/Jayapura">Waktu Indonesia Timur (WIT)</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="payment_timeout"
          className="mb-1 block text-sm font-semibold text-[#1C2321]"
        >
          Batas Waktu Pembayaran (menit)
        </label>
        <input
          id="payment_timeout"
          type="number"
          min={1}
          placeholder="30"
          value={paymentTimeout}
          onChange={(e) => setPaymentTimeout(e.target.value)}
          className="w-full rounded-lg border border-[#E4E1D8] px-4 py-2.5 outline-none focus:border-[#C98A1F]"
        />
        <p className="mt-1.5 text-xs text-[#8A8375]">
          Berapa lama pembeli punya waktu buat bayar sebelum antreannya
          otomatis kadaluarsa. Kosongkan buat pakai default 30 menit.
        </p>
      </div>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Jadwal Operasional
// =========================================================
function ScheduleSection({ schedule, onToggleDay, onTimeChange }) {
  return (
    <div className="space-y-1 border-t border-[#E4E1D8] pt-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8A8375]">
        Jadwal Operasional
      </h2>
      <div className="divide-y divide-[#E4E1D8] rounded-xl border border-[#E4E1D8]">
        {DAYS_ORDER.map((dayConfig) => {
          const dayData =
            schedule.find((h) => h.day === dayConfig.index) || {};
          const isActive = dayData.is_active || false;
          const isToday = new Date().getDay() === dayConfig.index;

          return (
            <div
              key={dayConfig.index}
              className="flex flex-col p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="mb-3 flex items-center sm:mb-0 sm:w-1/3">
                <button
                  type="button"
                  onClick={() => onToggleDay(dayConfig.index)}
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

              <div className="flex items-center gap-3 sm:w-2/3 sm:justify-end">
                {isActive ? (
                  <>
                    <input
                      type="time"
                      required
                      value={dayData.open_time || ""}
                      onChange={(e) =>
                        onTimeChange(dayConfig.index, "open_time", e.target.value)
                      }
                      className="rounded-lg border border-[#E4E1D8] bg-[#FCFBF9] px-3 py-2 font-mono text-sm font-semibold text-[#1C2321] outline-none focus:border-[#C98A1F] focus:ring-1 focus:ring-[#C98A1F]"
                    />
                    <span className="text-sm font-medium text-[#8A8375]">s/d</span>
                    <input
                      type="time"
                      required
                      value={dayData.close_time || ""}
                      onChange={(e) =>
                        onTimeChange(dayConfig.index, "close_time", e.target.value)
                      }
                      className="rounded-lg border border-[#E4E1D8] bg-[#FCFBF9] px-3 py-2 font-mono text-sm font-semibold text-[#1C2321] outline-none focus:border-[#C98A1F] focus:ring-1 focus:ring-[#C98A1F]"
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
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Modal Cropper Logo
// =========================================================
function LogoCropperModal({
  show,
  imageSrc,
  crop,
  zoom,
  setCrop,
  setZoom,
  onCropComplete,
  isSaving,
  onCancel,
  onSave,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-[#E4E1D8] p-5">
          <h2 className="text-lg font-bold text-[#1C2321]">Sesuaikan Logo</h2>
          <p className="mt-1 text-xs text-[#8A8375]">
            Geser untuk memosisikan, gunakan slider untuk memperbesar.
          </p>
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
        <div className="flex flex-col gap-5 p-5">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="w-full accent-[#147356]"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 rounded-xl border border-[#E4E1D8] py-3 text-sm font-bold text-[#1C2321] hover:bg-[#FAF9F6] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 rounded-xl bg-[#147356] py-3 text-sm font-bold text-white hover:bg-[#0F5C44] disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Logo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// SUB-KOMPONEN: Modal Konfirmasi Hapus Toko
// =========================================================
function DeleteStoreModal({
  show,
  storeName,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3 text-[#B23A2E]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBEAE7]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1C2321]">Hapus Toko?</h2>
        </div>
        <p className="mb-6 text-sm text-[#8A8375]">
          Apakah Anda yakin ingin menghapus{" "}
          <strong className="text-[#1C2321]">"{storeName}"</strong>? Semua
          produk, antrean, dan data toko ini akan ikut terhapus. Tindakan ini
          tidak dapat dibatalkan.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-[#E4E1D8] bg-white py-2.5 text-sm font-bold text-[#1C2321] transition hover:bg-[#F7F7F7] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-[#B23A2E] py-2.5 text-sm font-bold text-white transition hover:bg-[#9B3126] disabled:opacity-50"
          >
            {isDeleting ? "Menghapus..." : "Ya, Hapus Toko"}
          </button>
        </div>
      </div>
    </div>
  );
}