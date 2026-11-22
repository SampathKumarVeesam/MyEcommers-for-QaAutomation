export interface Coordinates {
  lat: number;
  lng: number;
}

export const STORE_ORIGIN: Coordinates = {
  lat: 17.4486,
  lng: 78.3908, // Hitech City / Madhapur Hub
};

/**
 * Resolves accurate coordinates for an Indian / Hyderabad address.
 * Prioritizes distinct Hyderabad locality matching over stale fallback coordinates.
 */
export function resolveAddressCoordinates(
  address?: { street?: string; city?: string; state?: string; postalCode?: string; lat?: number; lng?: number } | null,
  fallbackLat?: number,
  fallbackLng?: number
): Coordinates {
  if (!address) {
    return { lat: fallbackLat || 17.4486, lng: fallbackLng || 78.3908 };
  }

  const combined = `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.postalCode || ''}`.toLowerCase();

  // 1. Tellapur / Osman Nagar / BHEL / Lingampally / Nallagandla / Kollur
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

  // If specific coordinates are provided and no locality pattern matched, use them
  if (address.lat && address.lng && !isNaN(Number(address.lat)) && !isNaN(Number(address.lng))) {
    return { lat: Number(address.lat), lng: Number(address.lng) };
  }
  if (fallbackLat && fallbackLng && !isNaN(Number(fallbackLat)) && !isNaN(Number(fallbackLng))) {
    return { lat: Number(fallbackLat), lng: Number(fallbackLng) };
  }

  return { lat: 17.4486, lng: 78.3908 };
}
