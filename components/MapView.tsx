
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapViewProps {
  polyline: [number, number][];
  origin: string;
  destination: string;
}

const MapView: React.FC<MapViewProps> = ({ polyline, origin, destination }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const polylineLayer = useRef<L.Polyline | null>(null);
  const markers = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([39.9042, 116.4074], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
    }

    if (leafletMap.current && polyline.length > 0) {
      // Clear old layers
      if (polylineLayer.current) leafletMap.current.removeLayer(polylineLayer.current);
      markers.current.forEach(m => leafletMap.current?.removeLayer(m));
      markers.current = [];

      // Add new route
      polylineLayer.current = L.polyline(polyline, { color: '#3b82f6', weight: 5, opacity: 0.7 }).addTo(leafletMap.current);
      
      const startMarker = L.marker(polyline[0]).addTo(leafletMap.current).bindPopup(`Start: ${origin}`);
      const endMarker = L.marker(polyline[polyline.length - 1]).addTo(leafletMap.current).bindPopup(`End: ${destination}`);
      
      markers.current = [startMarker, endMarker];
      
      const bounds = L.latLngBounds(polyline);
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [polyline, origin, destination]);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-slate-200 pointer-events-none">
        Map data © OpenStreetMap
      </div>
    </div>
  );
};

export default MapView;
