/** Cities we serve, with coordinates for geolocation-based detection. */
export interface CityInfo {
  name: string
  lat: number
  lng: number
}

export const CITIES: CityInfo[] = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
  { name: 'Gurgaon', lat: 28.4595, lng: 77.0266 },
  { name: 'Noida', lat: 28.5355, lng: 77.391 },
]

export const CITY_NAMES = CITIES.map((c) => c.name)

/** Great-circle distance in km. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Nearest serviced city to a coordinate. */
export function nearestCity(lat: number, lng: number): { city: CityInfo; distanceKm: number } {
  let best = CITIES[0]
  let bestKm = Infinity
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.lat, c.lng)
    if (km < bestKm) {
      bestKm = km
      best = c
    }
  }
  return { city: best, distanceKm: Math.round(bestKm) }
}

/** Within this radius we treat the city as "your city". */
export const SERVICE_RADIUS_KM = 80
