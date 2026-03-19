import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ value, onChange, defaultCenter }) {
  const hasLocation = value?.lat && value?.lng;
  const fallback = defaultCenter
    ? [defaultCenter.lat, defaultCenter.lng]
    : [47.3769, 8.5417]; // fallback: Zurich
  const center = hasLocation ? [parseFloat(value.lat), parseFloat(value.lng)] : fallback;

  function handlePick({ lat, lng }) {
    onChange({
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    });
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: 220 }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} key={hasLocation ? 'located' : 'default'}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {hasLocation && (
            <Marker position={[parseFloat(value.lat), parseFloat(value.lng)]} />
          )}
        </MapContainer>
      </div>
      {hasLocation ? (
        <p className="text-xs text-gray-500">
          {parseFloat(value.lat).toFixed(6)}, {parseFloat(value.lng).toFixed(6)}
          <button onClick={() => onChange({ lat: '', lng: '' })} className="ml-2 text-gray-400 hover:text-red-400 transition-colors">✕ clear</button>
        </p>
      ) : (
        <p className="text-xs text-gray-400">Click on the map to set the location.</p>
      )}
    </div>
  );
}
