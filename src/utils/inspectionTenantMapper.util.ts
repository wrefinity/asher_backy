const SECTION_LABELS: Record<string, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
};

export type TenantInspectionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export function normalizeInspectionStatus(
  status?: string | null
): TenantInspectionStatus {
  const normalized = (status || '').trim().toLowerCase().replace(/\s+/g, '_');

  if (normalized === 'completed') return 'completed';
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'cancelled';
  }

  return 'pending';
}

export function normalizeInspectionPriority(priority?: string | null): string {
  const normalized = (priority || 'medium').trim().toLowerCase();

  if (normalized === 'critical') return 'urgent';
  if (['low', 'medium', 'high', 'urgent'].includes(normalized)) {
    return normalized;
  }

  return 'medium';
}

export function normalizeInspectionType(type?: string | null): string {
  if (!type) return 'routine';

  const normalized = type.trim().toLowerCase();

  if (normalized.includes('move-in') || normalized.includes('move_in')) {
    return 'move_in';
  }
  if (normalized.includes('move-out') || normalized.includes('move_out')) {
    return 'move_out';
  }
  if (normalized.includes('renewal')) return 'pre_renewal';
  if (normalized.includes('routine') || normalized.includes('annual')) {
    return 'routine';
  }

  return 'routine';
}

function formatSectionName(sectionType?: string | null, sectionName?: string | null) {
  if (sectionName?.trim()) return sectionName.trim();
  if (!sectionType) return 'Inspection Section';

  const key = sectionType.trim().toLowerCase();
  return SECTION_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function mapPhoto(photo: any) {
  if (!photo) return photo;

  return {
    ...photo,
    photoUrl: photo.photoUrl || photo.url,
    uploadedAt: photo.uploadedAt || photo.createdAt,
  };
}

function mapItem(item: any) {
  if (!item) return item;

  const condition = (item.condition || 'good').toString().toLowerCase();

  return {
    ...item,
    condition,
    photos: Array.isArray(item.photos) ? item.photos.map(mapPhoto) : [],
  };
}

function mapSection(section: any) {
  if (!section) return section;

  return {
    ...section,
    sectionName: formatSectionName(section.sectionType, section.sectionName),
    items: Array.isArray(section.items) ? section.items.map(mapItem) : [],
    photos: Array.isArray(section.photos) ? section.photos.map(mapPhoto) : [],
  };
}

function mapAcknowledgment(acknowledgment: any) {
  if (!acknowledgment) return null;

  return {
    ...acknowledgment,
    hasDisputes: acknowledgment.hasDisputes ?? acknowledgment.disputed ?? false,
    acknowledged: acknowledgment.acknowledged ?? false,
  };
}

export function inspectionNeedsTenantAcknowledgment(inspection: any): boolean {
  const acknowledgment = inspection?.acknowledgment || inspection?.inspectionAcknowledgment;
  return (
    normalizeInspectionStatus(inspection?.status) === 'completed' &&
    !!acknowledgment &&
    acknowledgment.acknowledged === false
  );
}

/** True when the appointment is scheduled and tenant has not yet confirmed receipt. */
export function inspectionNeedsScheduleAcknowledgment(inspection: any): boolean {
  const status = normalizeInspectionStatus(inspection?.status);
  if (status !== 'pending' && status !== 'in_progress') return false;
  if (inspection?.tenantScheduleAcknowledgedAt) return false;
  // Move-out has its own home banner; still allow ack but prefer MANUAL/routine here.
  const trigger = String(inspection?.trigger || 'MANUAL').toUpperCase();
  if (trigger === 'MOVE_OUT') return false;
  return true;
}

export function mapInspectionForTenant(inspection: any) {
  if (!inspection) return inspection;

  const sections = inspection.sections || inspection.inspectionSections || [];
  const certificates = inspection.certificates || inspection.inspectionCertificates || [];
  const acknowledgment =
    inspection.acknowledgment || inspection.inspectionAcknowledgment;

  return {
    ...inspection,
    id: inspection.id,
    propertyId: inspection.propertyId,
    tenantId: inspection.tenantId,
    landlordId: inspection.landlordId,
    inspectionType: normalizeInspectionType(inspection.type || inspection.inspectionType),
    status: normalizeInspectionStatus(inspection.status),
    priority: normalizeInspectionPriority(inspection.priority),
    scheduledDate: inspection.scheduledDate,
    completedDate: inspection.completedAt || inspection.completedDate,
    findings: inspection.generalNotes || inspection.notes || undefined,
    findingsCount: inspection.findings ?? 0,
    criticalIssuesCount: inspection.criticalIssues ?? 0,
    criticalIssues: undefined,
    recommendations: inspection.recommendations || undefined,
    inspectionSections: Array.isArray(sections) ? sections.map(mapSection) : [],
    inspectionCertificates: Array.isArray(certificates)
      ? certificates.map((cert: any) => ({
          ...cert,
          certificateType: cert.certificateType || cert.type,
          certificateUrl: cert.certificateUrl || cert.pdfUrl,
        }))
      : [],
    inspectionAcknowledgment: mapAcknowledgment(acknowledgment),
    needsAcknowledgment: inspectionNeedsTenantAcknowledgment({
      ...inspection,
      acknowledgment,
    }),
    scheduleAcknowledged: !!inspection.tenantScheduleAcknowledgedAt,
    tenantScheduleAcknowledgedAt: inspection.tenantScheduleAcknowledgedAt || null,
    needsScheduleAcknowledgment: inspectionNeedsScheduleAcknowledgment(inspection),
  };
}
