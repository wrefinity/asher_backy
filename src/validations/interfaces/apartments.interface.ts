export interface ApartmentIF {
  code: string;
  description: string;
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
