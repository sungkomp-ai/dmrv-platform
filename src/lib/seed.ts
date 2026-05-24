import { db } from '@/lib/db';

const SEED_LOCATIONS = [
  { name: "Global HQ", category: "office", lat: 40.7128, lng: -74.006, description: "New York Headquarters - Strategic operations center", status: "active", value: 95, region: "North America", country: "USA", employees: 2400, revenue: 4800000 },
  { name: "San Francisco Office", category: "office", lat: 37.7749, lng: -122.4194, description: "West Coast innovation hub", status: "active", value: 88, region: "North America", country: "USA", employees: 1800, revenue: 3200000 },
  { name: "London Office", category: "office", lat: 51.5074, lng: -0.1278, description: "EMEA regional headquarters", status: "active", value: 91, region: "Europe", country: "UK", employees: 1200, revenue: 2800000 },
  { name: "Singapore Office", category: "office", lat: 1.3521, lng: 103.8198, description: "APAC regional headquarters", status: "active", value: 87, region: "Asia Pacific", country: "Singapore", employees: 900, revenue: 2100000 },
  { name: "Tokyo Office", category: "office", lat: 35.6762, lng: 139.6503, description: "Japan market operations", status: "active", value: 82, region: "Asia Pacific", country: "Japan", employees: 650, revenue: 1800000 },
  { name: "Sydney Office", category: "office", lat: -33.8688, lng: 151.2093, description: "Oceania operations center", status: "active", value: 78, region: "Asia Pacific", country: "Australia", employees: 420, revenue: 1200000 },
  { name: "Berlin Office", category: "office", lat: 52.52, lng: 13.405, description: "DACH market operations", status: "active", value: 76, region: "Europe", country: "Germany", employees: 380, revenue: 980000 },
  { name: "Dubai Office", category: "office", lat: 25.2048, lng: 55.2708, description: "Middle East regional hub", status: "maintenance", value: 65, region: "Middle East", country: "UAE", employees: 280, revenue: 850000 },
  { name: "Shenzhen Factory", category: "factory", lat: 22.5431, lng: 114.0579, description: "Primary manufacturing facility", status: "active", value: 93, region: "Asia Pacific", country: "China", employees: 5200, revenue: 8900000 },
  { name: "Detroit Factory", category: "factory", lat: 42.3314, lng: -83.0458, description: "Automotive components plant", status: "active", value: 85, region: "North America", country: "USA", employees: 3100, revenue: 5600000 },
  { name: "Munich Factory", category: "factory", lat: 48.1351, lng: 11.582, description: "Precision engineering facility", status: "active", value: 89, region: "Europe", country: "Germany", employees: 2800, revenue: 4900000 },
  { name: "São Paulo Factory", category: "factory", lat: -23.5505, lng: -46.6333, description: "South America production center", status: "active", value: 72, region: "South America", country: "Brazil", employees: 2100, revenue: 3200000 },
  { name: "Chennai Factory", category: "factory", lat: 13.0827, lng: 80.2707, description: "India manufacturing operations", status: "active", value: 78, region: "Asia Pacific", country: "India", employees: 3400, revenue: 2800000 },
  { name: "Monterrey Factory", category: "factory", lat: 25.6866, lng: -100.3161, description: "Mexico production facility", status: "maintenance", value: 60, region: "North America", country: "Mexico", employees: 1500, revenue: 1800000 },
  { name: "Rotterdam Warehouse", category: "warehouse", lat: 51.9244, lng: 4.4777, description: "European distribution hub", status: "active", value: 88, region: "Europe", country: "Netherlands", employees: 800, revenue: 1500000 },
  { name: "Memphis Warehouse", category: "warehouse", lat: 35.1495, lng: -90.049, description: "Central US logistics center", status: "active", value: 84, region: "North America", country: "USA", employees: 1200, revenue: 1800000 },
  { name: "Shanghai Warehouse", category: "warehouse", lat: 31.2304, lng: 121.4737, description: "Asia-Pacific distribution hub", status: "active", value: 86, region: "Asia Pacific", country: "China", employees: 950, revenue: 1600000 },
  { name: "Johannesburg Warehouse", category: "warehouse", lat: -26.2041, lng: 28.0473, description: "Africa distribution center", status: "active", value: 62, region: "Africa", country: "South Africa", employees: 450, revenue: 680000 },
  { name: "Santiago Warehouse", category: "warehouse", lat: -33.4489, lng: -70.6693, description: "South America logistics", status: "inactive", value: 45, region: "South America", country: "Chile", employees: 0, revenue: 0 },
  { name: "Mojave Solar Farm", category: "renewable", lat: 35.0116, lng: -115.4764, description: "200MW solar installation", status: "active", value: 92, region: "North America", country: "USA", employees: 150, revenue: 920000 },
  { name: "North Sea Wind Farm", category: "renewable", lat: 56.0, lng: 3.2, description: "Offshore wind installation 350MW", status: "active", value: 90, region: "Europe", country: "UK", employees: 200, revenue: 1100000 },
  { name: "Rajasthan Solar Park", category: "renewable", lat: 27.0238, lng: 74.2179, description: "500MW solar park", status: "active", value: 87, region: "Asia Pacific", country: "India", employees: 300, revenue: 750000 },
  { name: "Patagonia Wind Farm", category: "renewable", lat: -51.7314, lng: -72.5082, description: "Wind energy facility 280MW", status: "active", value: 83, region: "South America", country: "Argentina", employees: 120, revenue: 560000 },
  { name: "Iceland Geothermal", category: "renewable", lat: 64.9631, lng: -19.0208, description: "Geothermal power station 150MW", status: "active", value: 94, region: "Europe", country: "Iceland", employees: 80, revenue: 480000 },
  { name: "Morocco Solar Complex", category: "renewable", lat: 31.0, lng: -7.0, description: "Concentrated solar power 580MW", status: "active", value: 88, region: "Africa", country: "Morocco", employees: 220, revenue: 680000 },
  { name: "Oregon Data Center", category: "datacenter", lat: 45.5152, lng: -122.6784, description: "Primary cloud infrastructure", status: "active", value: 97, region: "North America", country: "USA", employees: 350, revenue: 3200000 },
  { name: "Frankfurt Data Center", category: "datacenter", lat: 50.1109, lng: 8.6821, description: "EU data sovereignty hub", status: "active", value: 95, region: "Europe", country: "Germany", employees: 280, revenue: 2800000 },
  { name: "Mumbai Data Center", category: "datacenter", lat: 19.076, lng: 72.8777, description: "South Asia cloud region", status: "active", value: 86, region: "Asia Pacific", country: "India", employees: 200, revenue: 1500000 },
  { name: "São Paulo Data Center", category: "datacenter", lat: -23.5505, lng: -46.6333, description: "South America cloud region", status: "active", value: 80, region: "South America", country: "Brazil", employees: 150, revenue: 980000 },
  { name: "Cape Town Data Center", category: "datacenter", lat: -33.9249, lng: 18.4241, description: "Africa cloud region", status: "inactive", value: 40, region: "Africa", country: "South Africa", employees: 0, revenue: 0 },
];

let seedingPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (seedingPromise) {
    await seedingPromise;
    return;
  }

  const count = await db.location.count();
  if (count > 0) return;

  seedingPromise = db.location.createMany({ data: SEED_LOCATIONS }).finally(() => {
    seedingPromise = null;
  });
  await seedingPromise;
}
