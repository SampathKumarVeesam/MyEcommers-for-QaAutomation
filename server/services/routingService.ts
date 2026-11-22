export const STORE_COORDS = {
  lat: parseFloat(process.env.STORE_LAT || '17.4486'),
  lng: parseFloat(process.env.STORE_LNG || '78.3908'),
};

/**
 * Calculate Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Calculates estimated travel duration from origin to destination.
 * Uses project-osrm with fallback to Haversine speed calculation at 25 km/h + 5 min dispatch buffer.
 */
export async function calculateRouteDuration(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ durationSeconds: number; distanceKm: number }> {
  const distanceKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const fallbackDurationSeconds = Math.round((distanceKm / 25) * 3600) + 300; // 25 km/h + 5 min buffer

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const osrmDuration = Math.round(data.routes[0].duration) + 300;
        const osrmDistKm = parseFloat((data.routes[0].distance / 1000).toFixed(2));
        return {
          durationSeconds: Math.max(600, Math.min(3600, osrmDuration)),
          distanceKm: osrmDistKm,
        };
      }
    }
  } catch {}

  return {
    durationSeconds: Math.max(600, Math.min(3600, fallbackDurationSeconds)),
    distanceKm,
  };
}

/**
 * Dynamically resolves coordinates for a shipping address.
 * Matches known localities or generates a deterministic offset around Hyderabad.
 */
export function resolveCoordinatesForAddress(address: any): { lat: number; lng: number } {
  if (address?.lat && address?.lng && !isNaN(Number(address.lat)) && !isNaN(Number(address.lng))) {
    return { lat: Number(address.lat), lng: Number(address.lng) };
  }
  const combined = `${address?.street || ''} ${address?.city || ''} ${address?.postalCode || ''}`.toLowerCase();

  if (combined.includes('jubilee')) return { lat: 17.4319, lng: 78.4073 };
  if (combined.includes('banjara')) return { lat: 17.4156, lng: 78.4350 };
  if (combined.includes('gachibowli')) return { lat: 17.4401, lng: 78.3489 };
  if (combined.includes('kondapur')) return { lat: 17.4699, lng: 78.3578 };
  if (combined.includes('madhapur') || combined.includes('500081')) return { lat: 17.4486, lng: 78.3908 };
  if (combined.includes('hitech')) return { lat: 17.4504, lng: 78.3808 };
  if (combined.includes('begumpet')) return { lat: 17.4447, lng: 78.4664 };
  if (combined.includes('secunderabad')) return { lat: 17.4399, lng: 78.4983 };
  if (combined.includes('charminar')) return { lat: 17.3616, lng: 78.4747 };
  if (combined.includes('kukatpally')) return { lat: 17.4938, lng: 78.3995 };
  if (combined.includes('ameerpet')) return { lat: 17.4375, lng: 78.4482 };
  if (combined.includes('manikonda')) return { lat: 17.4042, lng: 78.3888 };
  if (combined.includes('miyapur')) return { lat: 17.4968, lng: 78.3614 };

  // Deterministic offset based on address string hash so different addresses always get distinct pins
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 1000) / 10000) - 0.05;
  const lngOffset = ((Math.abs(hash >> 3) % 1000) / 10000) - 0.05;

  return {
    lat: parseFloat((17.4375 + latOffset).toFixed(4)),
    lng: parseFloat((78.4482 + lngOffset).toFixed(4)),
  };
}
