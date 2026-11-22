import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Store, MapPin, Truck, Play, Pause, Navigation, CheckCircle2, RotateCcw } from 'lucide-react';
import { OrderStatus, STORE_ORIGIN } from '../types.js';
import { apiUrl } from '../config/api.js';

export interface LiveOrderMapProps {
  orderId?: string | number;
  orderStatus?: OrderStatus | string;
  customerAddress?: string;
  customerCoords?: { lat: number; lng: number };
  destinationLat?: number;
  destinationLng?: number;
  storeCoords?: { lat: number; lng: number };
  agentCoords?: { lat: number; lng: number };
  agentName?: string | null;
  assignedAgentName?: string | null;
  assignedAgentPhone?: string | null;
  isAgentView?: boolean;
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void;
  height?: string;
  className?: string;
}

export const LiveOrderMap: React.FC<LiveOrderMapProps> = ({
  orderId,
  orderStatus = 'out_for_delivery',
  customerAddress,
  customerCoords,
  destinationLat,
  destinationLng,
  storeCoords,
  agentCoords: initialAgentCoords,
  agentName,
  assignedAgentName,
  isAgentView = false,
  onLocationUpdate,
  height = '320px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const agentMarkerRef = useRef<L.Marker | null>(null);

  const fixedStore = storeCoords || { lat: STORE_ORIGIN.lat, lng: STORE_ORIGIN.lng };
  const destLat = customerCoords?.lat || destinationLat || 17.4375;
  const destLng = customerCoords?.lng || destinationLng || 78.4482;
  const effectiveAgentName = assignedAgentName || agentName || 'Delivery Partner';

  const [currentAgentCoords, setCurrentAgentCoords] = useState<{ lat: number; lng: number }>(() => {
    return initialAgentCoords || { lat: fixedStore.lat, lng: fixedStore.lng };
  });

  const [simulating, setSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  const normStatus = String(orderStatus).toLowerCase().replace(/[\s-]+/g, '_');
  const isOutForDelivery = normStatus === 'out_for_delivery' || normStatus === 'shipped';
  const isDelivered = normStatus === 'delivered' || normStatus === 'completed';

  // Sync external agentCoords
  useEffect(() => {
    if (initialAgentCoords && !simulating) {
      setCurrentAgentCoords(initialAgentCoords);
      if (agentMarkerRef.current) {
        agentMarkerRef.current.setLatLng([initialAgentCoords.lat, initialAgentCoords.lng]);
      }
    }
  }, [initialAgentCoords, simulating]);

  // Fetch real road route from OSRM connecting Store -> Agent -> Customer
  useEffect(() => {
    let isMounted = true;
    const fetchOsrmRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fixedStore.lng},${fixedStore.lat};${currentAgentCoords.lng},${currentAgentCoords.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.routes && json.routes[0]?.geometry?.coordinates && isMounted) {
            const coords: [number, number][] = json.routes[0].geometry.coordinates.map(
              (pt: [number, number]) => [pt[1], pt[0]] as [number, number]
            );
            setRouteCoordinates(coords);
            return;
          }
        }
      } catch {
        // Fallback below
      }

      // Straight-line curved fallback
      if (isMounted) {
        const midLat1 = fixedStore.lat + (destLat - fixedStore.lat) * 0.35 + 0.003;
        const midLng1 = fixedStore.lng + (destLng - fixedStore.lng) * 0.35 - 0.004;
        const midLat2 = fixedStore.lat + (destLat - fixedStore.lat) * 0.70 - 0.002;
        const midLng2 = fixedStore.lng + (destLng - fixedStore.lng) * 0.70 + 0.003;
        setRouteCoordinates([
          [fixedStore.lat, fixedStore.lng],
          [midLat1, midLng1],
          [currentAgentCoords.lat, currentAgentCoords.lng],
          [midLat2, midLng2],
          [destLat, destLng],
        ]);
      }
    };

    fetchOsrmRoute();
    return () => {
      isMounted = false;
    };
  }, [fixedStore.lat, fixedStore.lng, destLat, destLng]);

  // Push location update to backend
  const pushLocationUpdate = useCallback(
    async (coords: { lat: number; lng: number }) => {
      if (onLocationUpdate) {
        onLocationUpdate(coords);
      }
      if (orderId) {
        try {
          await fetch(apiUrl(`/api/orders/${orderId}/location`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(coords),
          });
        } catch {}
      }
    },
    [orderId, onLocationUpdate]
  );

  // Simulation movement ticker
  useEffect(() => {
    if (!simulating || !isOutForDelivery) return;

    const interval = setInterval(() => {
      setSimulationStep(prev => {
        const nextStep = prev + 1;
        const totalSteps = 20;
        const progress = Math.min(1, nextStep / totalSteps);

        // Interpolate along route or towards destination
        const newLat = parseFloat((fixedStore.lat + (destLat - fixedStore.lat) * progress).toFixed(5));
        const newLng = parseFloat((fixedStore.lng + (destLng - fixedStore.lng) * progress).toFixed(5));
        const newCoords = { lat: newLat, lng: newLng };

        setCurrentAgentCoords(newCoords);
        if (agentMarkerRef.current) {
          agentMarkerRef.current.setLatLng([newLat, newLng]);
        }
        pushLocationUpdate(newCoords);

        if (progress >= 1) {
          setSimulating(false);
          return 0;
        }
        return nextStep;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [simulating, isOutForDelivery, fixedStore.lat, fixedStore.lng, destLat, destLng, pushLocationUpdate]);

  // Leaflet map setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [(fixedStore.lat + destLat) / 2, (fixedStore.lng + destLng) / 2],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // 1. Store Icon (Fixed)
    const storeIcon = L.divIcon({
      className: 'custom-store-pin',
      html: `
        <div style="background-color: #4f46e5; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.45); border: 2.5px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // 2. Customer Destination Icon (Dynamic)
    const customerIcon = L.divIcon({
      className: 'custom-customer-pin',
      html: `
        <div style="background-color: #10b981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.45); border: 2.5px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // 3. Delivery Agent Icon (Moving Rider)
    const agentIcon = L.divIcon({
      className: 'custom-agent-pin',
      html: `
        <div style="background-color: #0284c7; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.55); border: 3px solid white; position: relative;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 18h6"/><path d="M17 18a2 2 0 0 0 2-2V9.5a.5.5 0 0 0-.15-.35l-3-3A.5.5 0 0 0 15.5 6H14"/></svg>
          <div style="position: absolute; top: -2px; right: -2px; width: 11px; height: 11px; background-color: #22c55e; border-radius: 50%; border: 2px solid white;"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Add Store Marker
    L.marker([fixedStore.lat, fixedStore.lng], { icon: storeIcon })
      .bindPopup(`<strong>${STORE_ORIGIN.name} (Fixed Dispatch Hub)</strong><br/>${STORE_ORIGIN.address}`)
      .addTo(map);

    // Add Customer Marker
    L.marker([destLat, destLng], { icon: customerIcon })
      .bindPopup(`<strong>Customer Drop Location</strong><br/>${customerAddress || 'Hyderabad, Telangana'}`)
      .addTo(map);

    // Add Agent Marker if out for delivery or delivered
    if (isOutForDelivery || isDelivered) {
      const markerLat = isDelivered ? destLat : currentAgentCoords.lat;
      const markerLng = isDelivered ? destLng : currentAgentCoords.lng;
      agentMarkerRef.current = L.marker([markerLat, markerLng], { icon: agentIcon })
        .bindPopup(`<strong>Executive: ${effectiveAgentName}</strong><br/>${isDelivered ? 'Order Delivered at Destination' : 'En route to customer drop location'}`)
        .addTo(map);
    }

    // Auto-fit bounds
    const bounds = L.latLngBounds([
      [fixedStore.lat, fixedStore.lng],
      [destLat, destLng],
      [currentAgentCoords.lat, currentAgentCoords.lng],
    ]);
    map.fitBounds(bounds, { padding: [45, 45] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [fixedStore.lat, fixedStore.lng, destLat, destLng, customerAddress, isOutForDelivery, isDelivered, effectiveAgentName]);

  // Update Polyline when route coordinates update
  useEffect(() => {
    if (!mapInstanceRef.current || routeCoordinates.length === 0) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
    }

    // Background track line
    L.polyline(routeCoordinates, {
      color: '#cbd5e1',
      weight: 6,
      opacity: 0.75,
      lineCap: 'round',
    }).addTo(mapInstanceRef.current);

    // Active route line
    routePolylineRef.current = L.polyline(routeCoordinates, {
      color: isDelivered ? '#10b981' : isOutForDelivery ? '#4f46e5' : '#64748b',
      weight: 4.5,
      opacity: 0.9,
      dashArray: isOutForDelivery ? '6, 8' : undefined,
      lineCap: 'round',
    }).addTo(mapInstanceRef.current);
  }, [routeCoordinates, isDelivered, isOutForDelivery]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50 ${className}`}>
      {/* Top Hub & Status Header */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs pointer-events-auto flex items-center gap-2 text-xs">
          <Store className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-bold text-slate-800">Origin Hub:</span>
          <span className="text-slate-600 font-medium truncate max-w-[150px] sm:max-w-[220px]">
            Hitech City / Madhapur (500081)
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Simulate movement toggle for QA / Demo testing */}
          {isAgentView && isOutForDelivery && (
            <button
              type="button"
              data-test="toggle-simulate-rider-movement"
              data-testid="toggle-simulate-rider-movement"
              onClick={() => setSimulating(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                simulating
                  ? 'bg-amber-600 text-white border-amber-700 animate-pulse'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {simulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{simulating ? 'Pause Movement' : 'Simulate Rider Movement'}</span>
            </button>
          )}

          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2 text-xs">
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
                Live GPS Active
              </span>
            ) : (
              <span className="text-slate-500 font-medium">Awaiting Dispatch</span>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />

      {/* Bottom Route Legend Bar */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
            <span className="font-medium text-slate-700">Store Origin (Fixed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="font-medium text-slate-700">Customer Drop (Dynamic)</span>
          </div>
          {isOutForDelivery && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              <span className="font-medium text-slate-700">Rider: {effectiveAgentName}</span>
            </div>
          )}
        </div>
        <div className="text-slate-400 font-mono text-[10px]">
          OSRM Routing &bull; Hyderabad, TG 🇮🇳
        </div>
      </div>
    </div>
  );
};
