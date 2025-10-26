export interface CreateEventDTO {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  reminder?: boolean;
  date: Date;
}

export interface UpdateEventDTO {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  date?: Date;
  reminder?: boolean;
}

export interface EventResponseDTO {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAvailabilityDTO {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface EventsByDateResponse {
  date: string;
  events: EventResponseDTO[];
}