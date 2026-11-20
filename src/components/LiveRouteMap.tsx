import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Store, Truck, CheckCircle2 } from 'lucide-react';
import { OrderStatus, STORE_ORIGIN } from '../types.js';

interface LiveRouteMapProps {
  orderStatus: OrderStatus;
  customerAddress?: string;
  customerCoords?: { lat: number; lng: number };
  destinationLat?: number;
  destinationLng?: number;
  agentName?: string;
  assignedAgentName?: string | null;
  assignedAgentPhone?: string | null;
  agentCoords?: { lat: number; lng: number };
  height?: string;
  className?: string;
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({
  orderStatus,
  customerAddress,
  customerCoords,
  destinationLat,
  destinationLng,
  agentName,
  assignedAgentName,
  assignedAgentPhone,
  agentCoords,
  height = '300px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0.45);

  const storeLat = STORE_ORIGIN.lat; // 17.4486 (Hitech City / Madhapur)
  const storeLng = STORE_ORIGIN.lng; // 78.3908
  const destLat = customerCoords?.lat || destinationLat || 17.4319; // Default Jubilee Hills
  const destLng = customerCoords?.lng || destinationLng || 78.4073;
  const effectiveAgentName = assignedAgentName || agentName || 'Alex Rivers';

  const normStatus = String(orderStatus).toLowerCase().replace(/[\s-]+/g, '_');
  const isOutForDelivery = normStatus === 'out_for_delivery' || normStatus === 'shipped';
  const isDelivered = normStatus === 'delivered' || normStatus === 'completed';

  // Smooth simulation of agent movement when Out for Delivery
  useEffect(() => {
    if (!isOutForDelivery) return;
    const interval = setInterval(() => {
      setAnimationProgress(prev => (prev >= 0.85 ? 0.35 : prev + 0.05));
    }, 3500);
    return () => clearInterval(interval);
  }, [isOutForDelivery]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Teardown existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine current agent position
    let currentAgentLat = storeLat;
    let currentAgentLng = storeLng;

    if (isDelivered) {
      currentAgentLat = destLat;
      currentAgentLng = destLng;
    } else if (isOutForDelivery) {
      if (agentCoords?.lat && agentCoords?.lng) {
        currentAgentLat = agentCoords.lat;
        currentAgentLng = agentCoords.lng;
      } else {
        // Interpolate along route based on animationProgress
        currentAgentLat = storeLat + (destLat - storeLat) * animationProgress;
        currentAgentLng = storeLng + (destLng - storeLng) * animationProgress;
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: [(storeLat + destLat) / 2, (storeLng + destLng) / 2],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // 1. Store Marker Icon
    const storeIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="background-color: #4f46e5; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // 2. Customer Destination Marker Icon
    const customerIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="background-color: #10b981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // 3. Delivery Agent Motorcycle Marker Icon
    const agentIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="background-color: #0284c7; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.5); border: 2.5px solid white; position: relative;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 18h6"/><path d="M17 18a2 2 0 0 0 2-2V9.5a.5.5 0 0 0-.15-.35l-3-3A.5.5 0 0 0 15.5 6H14"/></svg>
          <div style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%; border: 1.5px solid white;"></div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    // Add Store Marker
    L.marker([storeLat, storeLng], { icon: storeIcon })
      .bindPopup(`<strong>${STORE_ORIGIN.name}</strong><br/>${STORE_ORIGIN.address}`)
      .addTo(map);

    // Add Customer Marker
    L.marker([destLat, destLng], { icon: customerIcon })
      .bindPopup(`<strong>Customer Drop Location</strong><br/>${customerAddress || 'Hyderabad, Telangana, India'}`)
      .addTo(map);

    // Realistic waypoint curve routing in Hyderabad
    const midLat1 = storeLat + (destLat - storeLat) * 0.35 + 0.004;
    const midLng1 = storeLng + (destLng - storeLng) * 0.35 - 0.005;
    const midLat2 = storeLat + (destLat - storeLat) * 0.70 - 0.003;
    const midLng2 = storeLng + (destLng - storeLng) * 0.70 + 0.004;

    const routeCoords: [number, number][] = [
      [storeLat, storeLng],
      [midLat1, midLng1],
      [midLat2, midLng2],
      [destLat, destLng],
    ];

    // Background track polyline
    L.polyline(routeCoords, {
      color: '#cbd5e1',
      weight: 5,
      opacity: 0.7,
      lineCap: 'round',
    }).addTo(map);

    // Active delivery polyline
    L.polyline(routeCoords, {
      color: isDelivered ? '#10b981' : isOutForDelivery ? '#4f46e5' : '#64748b',
      weight: 4,
      opacity: 0.9,
      dashArray: isOutForDelivery ? '6, 8' : undefined,
      lineCap: 'round',
    }).addTo(map);

    // Add Agent Marker if Out for Delivery or Delivered
    if (isOutForDelivery || isDelivered) {
      L.marker([currentAgentLat, currentAgentLng], { icon: agentIcon })
        .bindPopup(`<strong>Delivery Agent: ${effectiveAgentName}</strong><br/>${isDelivered ? 'Order Delivered at Destination' : 'En route to customer drop location'}`)
        .addTo(map);
    }

    // Fit map bounds to encompass both locations
    const bounds = L.latLngBounds([[storeLat, storeLng], [destLat, destLng]]);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [storeLat, storeLng, destLat, destLng, customerAddress, isOutForDelivery, isDelivered, effectiveAgentName, animationProgress, agentCoords]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-50 ${className}`}>
      {/* Top Route & Hub Info Badge */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md pointer-events-auto flex items-center gap-2 text-xs">
          <Store className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-bold text-slate-800">Hyderabad Hub:</span>
          <span className="text-slate-600 font-medium truncate max-w-[150px] sm:max-w-[220px]">Mindspace Madhapur (500081)</span>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md pointer-events-auto flex items-center gap-2 text-xs">
          {isDelivered ? (
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Delivered
            </span>
          ) : isOutForDelivery ? (
            <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              Live Tracking (~6.5 km)
            </span>
          ) : (
            <span className="text-slate-500 font-medium">Awaiting Dispatch</span>
          )}
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />

      {/* Bottom Route Legend Bar */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
            <span className="font-medium text-slate-700">Dispatch Store (Hitech City)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-medium text-slate-700">Customer Address (Telangana)</span>
          </div>
          {isOutForDelivery && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              <span className="font-medium text-slate-700">Executive: {effectiveAgentName}</span>
            </div>
          )}
        </div>
        <div className="text-slate-400 font-mono text-[10px]">
          OpenStreetMap 🇮🇳 Hyderabad, TG
        </div>
      </div>
    </div>
  );
};
