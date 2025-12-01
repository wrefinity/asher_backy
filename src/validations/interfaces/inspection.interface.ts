export interface InspectionCreateInput {
    propertyId: string;
    tenantId?: string;
    type?: string;
    scheduledDate?: string | Date;
    scheduledTime?: string;
    inspector?: string;
    inspectorId?: string;
    status?: 'Not Started' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    score?: number;
    findings?: number;
    criticalIssues?: number;
    overallCondition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    generalNotes?: string;
    recommendations?: string;
    notes?: string; // Kept for backward compatibility
  }
  
  export interface InspectionUpdateInput {
    type?: string;
    scheduledDate?: string | Date;
    scheduledTime?: string;
    inspector?: string;
    inspectorId?: string;
    status?: 'Not Started' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    score?: number;
    findings?: number;
    criticalIssues?: number;
    overallCondition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    generalNotes?: string;
    recommendations?: string;
    notes?: string; // Kept for backward compatibility
    completedAt?: string | Date;
  }