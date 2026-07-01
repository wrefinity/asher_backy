/** Max places shown per category — always the closest matches. */
export const NEARBY_PLACE_LIMIT = 2;

/** Google Places categories to search around a property. */
export const AREA_PLACE_SEARCHES: Array<{
  id: string;
  label: string;
  types?: string[];
  keyword?: string;
  limit: number;
}> = [
  { id: "school", label: "Schools", types: ["school", "primary_school", "secondary_school"], limit: NEARBY_PLACE_LIMIT },
  { id: "hospital", label: "Hospitals & medical", types: ["hospital", "doctor"], limit: NEARBY_PLACE_LIMIT },
  { id: "supermarket", label: "Supermarkets", types: ["supermarket", "grocery_or_supermarket"], limit: NEARBY_PLACE_LIMIT },
  { id: "petrol", label: "Petrol stations", types: ["gas_station"], limit: NEARBY_PLACE_LIMIT },
  { id: "pharmacy", label: "Pharmacies", types: ["pharmacy"], limit: NEARBY_PLACE_LIMIT },
  { id: "bank", label: "Banks", types: ["bank", "atm"], limit: NEARBY_PLACE_LIMIT },
  { id: "post-office", label: "Post offices", types: ["post_office"], limit: NEARBY_PLACE_LIMIT },
  { id: "shopping", label: "Shopping centres", types: ["shopping_mall", "department_store"], limit: NEARBY_PLACE_LIMIT },
  {
    id: "transport",
    label: "Public transport",
    types: ["train_station", "transit_station", "bus_station", "subway_station"],
    limit: NEARBY_PLACE_LIMIT,
  },
  { id: "gym", label: "Gyms & fitness", types: ["gym"], limit: NEARBY_PLACE_LIMIT },
  { id: "park", label: "Parks & recreation", types: ["park"], limit: NEARBY_PLACE_LIMIT },
  { id: "library", label: "Libraries", types: ["library"], limit: NEARBY_PLACE_LIMIT },
  { id: "restaurant", label: "Restaurants", types: ["restaurant"], limit: NEARBY_PLACE_LIMIT },
  { id: "bar", label: "Bars", types: ["bar", "night_club"], limit: NEARBY_PLACE_LIMIT },
  { id: "cafe", label: "Cafés", types: ["cafe"], limit: NEARBY_PLACE_LIMIT },
  {
    id: "ev-charging",
    label: "EV charging",
    types: ["electric_vehicle_charging_station"],
    limit: NEARBY_PLACE_LIMIT,
  },
  {
    id: "broadband",
    label: "Broadband & connectivity",
    keyword: "internet service provider",
    limit: NEARBY_PLACE_LIMIT,
  },
];

export const NEARBY_SEARCH_RADIUS_MI = 2;
export const NEARBY_SEARCH_RADIUS_KM = NEARBY_SEARCH_RADIUS_MI * 1.609344;
