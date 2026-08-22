import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// fix bug default marker icon Leaflet gak muncul kalau di-bundle Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([Number(lat), Number(lng)], map.getZoom());
  }, [lat, lng]);
  return null;
}

export default function LocationPicker({ latitude, longitude, onChange }) {
  const hasPosition = latitude && longitude;
  const position = hasPosition
    ? [Number(latitude), Number(longitude)]
    : [-7.4698, 110.2178];

  return (
    <div className="relative overflow-hidden rounded-md z-0 border border-white/10">
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: "240px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        <ClickHandler
          onSelect={(lat, lng) => onChange(lat.toFixed(6), lng.toFixed(6))}
        />
        <Recenter lat={latitude} lng={longitude} />
        {hasPosition && <Marker position={position} />}
      </MapContainer>
      <p className="bg-[#2a2a2a] px-3 py-2 text-xs text-white/40">
        Klik di peta buat pilih titik lokasi toko
      </p>
    </div>
  );
}
