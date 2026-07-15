export interface InspectionCreateInput {
    propertyId: string;
    tenantId?: string;
    type?: string;
    trigger?: 'MANUAL' | 'MOVE_OUT';
    moveOutNoticeId?: string;
    scheduledDate?: string | Date;
    scheduledTime?: string;
    inspector?: string;
    inspectorId?: string;
    status?: 'Draft' | 'Not Started' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    score?: number;
    findings?: number;
    criticalIssues?: number;
    overallCondition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    generalNotes?: string;
    recommendations?: string;
    notes?: string; // Kept for backward compatibility
    onSiteSignature?: string;
    inspectorSignature?: string;
    landlordSignature?: string;
  }
  
  export interface InspectionUpdateInput {
    type?: string;
    trigger?: 'MANUAL' | 'MOVE_OUT';
    moveOutNoticeId?: string;
    scheduledDate?: string | Date;
    scheduledTime?: string;
    inspector?: string;
    inspectorId?: string;
    tenantId?: string;
    status?: 'Draft' | 'Not Started' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    score?: number;
    findings?: number;
    criticalIssues?: number;
    overallCondition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    generalNotes?: string;
    recommendations?: string;
    notes?: string; // Kept for backward compatibility
    onSiteSignature?: string;
    inspectorSignature?: string;
    landlordSignature?: string;
    completedAt?: string | Date;
  }
