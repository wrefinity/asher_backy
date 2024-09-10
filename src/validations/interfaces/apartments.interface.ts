export interface ApartmentIF {
  id?: string;
  code: string;
  description: string;
  name: string;
  size: string; // 2500sqf
  monthlyRent: string;
  minLeaseDuration: string;
  maxLeaseDuration: string;
  sittingRoom?: number;
  waitingRoom?: number;
  bedrooms?: number;
  kitchen?: number;
  bathrooms?: number;
  garages?: number;
  floorplans: string[];
  facilities: string[];
  offices?: number;
  isVacant?: boolean;
  rentalAmount: number;
  images: string[];
  videourl?: string[];
  propertyId: string;
}
