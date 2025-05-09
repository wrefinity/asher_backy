export interface InspectionCreateInput {
    propertyId: string;
    tenantId: string;
    score: number;
    notes?: string;
  }
  
  export interface InspectionUpdateInput {
    score?: number;
    notes?: string;
  }