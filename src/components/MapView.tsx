import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { LatLng } from '../context/PlannerContext';

export type Poi = {
  id: string;
  name: string;
  latlng: LatLng;
  rating: number;
  price: number; // 人均
  logoUrl?: string; // 商家logo（若可获取）
};

type LatLngTuple = [number, number];
type LeafletMouseEventLike = { latlng: { lat: number; lng: number } };

function EventsBinder({ onPickA, onPickB }: { onPickA?: (latlng: LatLng) => void; onPickB?: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e: LeafletMouseEventLike) {
      const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (onPickA) onPickA(latlng);
    },
    contextmenu(e: LeafletMouseEventLike) {
      const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (onPickB) onPickB(latlng);
    },
  });
  return null;
}

function SetView({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center as any, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function MapView({ a, b, pois, onPickA, onPickB }: {
  a: LatLng | null;
  b: LatLng | null;
  pois: Poi[];
  onPickA?: (latlng: LatLng) => void;
  onPickB?: (latlng: LatLng) => void;
}) {
  const center: LatLngTuple = [
    (a?.lat ?? b?.lat ?? 31.2304),
    (a?.lng ?? b?.lng ?? 121.4737)
  ]; // 默认上海中心坐标

  const lines: LatLngTuple[][] = [];
  pois.forEach((p) => {
    if (a) lines.push([[a.lat, a.lng], [p.latlng.lat, p.latlng.lng]]);
    if (b) lines.push([[b.lat, b.lng], [p.latlng.lat, p.latlng.lng]]);
  });

  return (
    <MapContainer style={{ height: 420 }}>
      <SetView center={center} zoom={12} />
      <EventsBinder onPickA={onPickA} onPickB={onPickB} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {a && (
        <Marker position={[a.lat, a.lng] as any}>
          <Popup>好友 A</Popup>
        </Marker>
      )}
      {b && (
        <Marker position={[b.lat, b.lng] as any}>
          <Popup>好友 B</Popup>
        </Marker>
      )}
      {pois.map((p) => (
        <Marker key={p.id} position={[p.latlng.lat, p.latlng.lng] as any}>
          <Popup>
            <div>
              <strong>{p.name}</strong><br />评分 {p.rating.toFixed(1)}｜人均 ¥{p.price}
            </div>
          </Popup>
        </Marker>
      ))}
      {lines.map((coords, i) => (
        <Polyline key={i} positions={coords as any} pathOptions={{ color: '#888' }} />
      ))}
    </MapContainer>
  );
}