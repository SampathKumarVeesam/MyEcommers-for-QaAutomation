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
  const combined = `${address?.street || ''} ${address?.city || ''} ${address?.state || ''} ${address?.postalCode || ''}`.toLowerCase();

  // 1. Tellapur / Osman Nagar / BHEL / Lingampally / Nallagandla / Kollur / Chandanagar
  if (
    combined.includes('tellapur') ||
    combined.includes('osman') ||
    combined.includes('bhel') ||
    combined.includes('lingampally') ||
    combined.includes('nallagandla') ||
    combined.includes('kollur') ||
    combined.includes('502032') ||
    combined.includes('500019')
  ) {
    return { lat: 17.4816, lng: 78.2917 };
  }

  // 2. Gachibowli / Financial District / Nanakramguda
  if (
    combined.includes('gachibowli') ||
    combined.includes('financial district') ||
    combined.includes('nanakramguda') ||
    combined.includes('500032')
  ) {
    return { lat: 17.4401, lng: 78.3489 };
  }

  // 3. Madhapur / Hitech City / Durgam Cheruvu
  if (combined.includes('madhapur') || combined.includes('500081')) {
    return { lat: 17.4486, lng: 78.3908 };
  }
  if (combined.includes('hitech') || combined.includes('hitec')) {
    return { lat: 17.4504, lng: 78.3808 };
  }

  // 4. Kondapur / Kothaguda / Hafeezpet
  if (combined.includes('kondapur') || combined.includes('hafeezpet') || combined.includes('500084')) {
    return { lat: 17.4699, lng: 78.3578 };
  }

  // 5. Jubilee Hills / Film Nagar
  if (combined.includes('jubilee') || combined.includes('film nagar') || combined.includes('500033')) {
    return { lat: 17.4319, lng: 78.4073 };
  }

  // 6. Banjara Hills / Panjagutta
  if (combined.includes('banjara') || combined.includes('500034')) {
    return { lat: 17.4156, lng: 78.4350 };
  }

  // 7. Manikonda / Puppalguda / Shaikpet / Tolichowki
  if (
    combined.includes('manikonda') ||
    combined.includes('puppalguda') ||
    combined.includes('shaikpet') ||
    combined.includes('tolichowki') ||
    combined.includes('500089') ||
    combined.includes('500008')
  ) {
    return { lat: 17.4042, lng: 78.3888 };
  }

  // 8. Miyapur / Chandanagar / Kukatpally
  if (combined.includes('miyapur') || combined.includes('500049') || combined.includes('chandanagar')) {
    return { lat: 17.4968, lng: 78.3614 };
  }
  if (combined.includes('kukatpally') || combined.includes('kphb') || combined.includes('500072')) {
    return { lat: 17.4938, lng: 78.3995 };
  }

  // 9. Narsingi / Kokapet / Gandipet
  if (combined.includes('narsingi') || combined.includes('kokapet') || combined.includes('gandipet') || combined.includes('500075')) {
    return { lat: 17.3880, lng: 78.3580 };
  }

  // 10. Begumpet / Secunderabad / Ameerpet
  if (combined.includes('begumpet') || combined.includes('500016')) {
    return { lat: 17.4447, lng: 78.4664 };
  }
  if (combined.includes('secunderabad') || combined.includes('500003')) {
    return { lat: 17.4399, lng: 78.4983 };
  }
  if (combined.includes('ameerpet') || combined.includes('sr nagar') || combined.includes('500038')) {
    return { lat: 17.4375, lng: 78.4482 };
  }

  // 11. Charminar / Old City / Falaknuma
  if (combined.includes('charminar') || combined.includes('falaknuma') || combined.includes('500002')) {
    return { lat: 17.3616, lng: 78.4747 };
  }

  // 12. Dilsukhnagar / Malakpet / LB Nagar
  if (combined.includes('dilsukhnagar') || combined.includes('malakpet') || combined.includes('lb nagar') || combined.includes('500036')) {
    return { lat: 17.3688, lng: 78.5247 };
  }

  // 13. Uppal / Tarnaka / ECIL / Malkajgiri
  if (combined.includes('uppal') || combined.includes('tarnaka') || combined.includes('ecil') || combined.includes('malkajgiri')) {
    return { lat: 17.4040, lng: 78.5580 };
  }

  // 14. Kompally / Bowenpally / Medchal
  if (combined.includes('kompally') || combined.includes('bowenpally') || combined.includes('medchal') || combined.includes('500014')) {
    return { lat: 17.5340, lng: 78.4850 };
  }

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
