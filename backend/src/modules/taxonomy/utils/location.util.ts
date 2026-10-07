export type LocationParts = {
  countryCode: string;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
};

const normalizePart = (value: string | null | undefined) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Case- and whitespace-insensitive identity of a location; stored in `locations.location_key`. */
export function buildLocationKey(parts: LocationParts) {
  return [parts.countryCode.trim().toUpperCase(), normalizePart(parts.state), normalizePart(parts.city), normalizePart(parts.postalCode)].join('|');
}

let regionNames: Intl.DisplayNames | null | undefined;

export function countryName(countryCode: string) {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export type LocationLevel = 'COUNTRY' | 'STATE' | 'CITY';

export function locationLevel(parts: LocationParts): LocationLevel {
  if (parts.city) return 'CITY';
  if (parts.state) return 'STATE';
  return 'COUNTRY';
}

/** "Gurugram, Haryana, India" / "Haryana, India" / "India". */
export function locationLabel(parts: LocationParts) {
  const segments = [parts.city, parts.state, countryName(parts.countryCode)].filter(Boolean);
  const label = segments.join(', ');
  return parts.postalCode ? `${label} ${parts.postalCode}` : label;
}
