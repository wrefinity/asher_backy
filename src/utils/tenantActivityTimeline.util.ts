import { LogType } from '@prisma/client';

export type ActivityTimelineTone =
  | 'enquiry'
  | 'viewing'
  | 'application'
  | 'reference'
  | 'agreement'
  | 'onboarding'
  | 'maintenance'
  | 'payment'
  | 'bill'
  | 'inspection'
  | 'default';

export type TenantActivityItem = {
  id: string;
  title: string;
  subtitle?: string;
  createdAt: string;
  tone: ActivityTimelineTone;
  source: 'milestone' | 'web' | 'maintenance' | 'payment' | 'bill' | 'inspection';
};

export function resolveActivityTone(text: string, type?: string | null): ActivityTimelineTone {
  const haystack = text.toLowerCase();
  if (type === 'ENQUIRED' || haystack.includes('enquir')) return 'enquiry';
  if (haystack.includes('viewing') || haystack.includes('invite') || haystack.includes('feedback')) {
    return 'viewing';
  }
  if (haystack.includes('reference')) return 'reference';
  if (haystack.includes('agreement') || haystack.includes('lease') || haystack.includes('signed')) {
    return 'agreement';
  }
  if (haystack.includes('maintenance') || haystack.includes('repair')) return 'maintenance';
  if (haystack.includes('payment') || haystack.includes('wallet') || haystack.includes('paid')) {
    return 'payment';
  }
  if (haystack.includes('bill') || haystack.includes('rent due')) return 'bill';
  if (haystack.includes('inspection')) return 'inspection';
  if (haystack.includes('tenant') || haystack.includes('onboard')) return 'onboarding';
  if (haystack.includes('application') || haystack.includes('approved') || haystack.includes('submitted')) {
    return 'application';
  }
  return 'default';
}

function propertyLabel(entity: Record<string, any>): string {
  return (
    entity?.properties?.name ||
    entity?.property?.name ||
    entity?.propertyName ||
    'a property'
  );
}

function formatMoney(amount: number, currency?: string | null): string {
  const code = currency ? String(currency) : 'NGN';
  return `${code} ${Number(amount).toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function milestonesToActivityItems(milestones: any[]): TenantActivityItem[] {
  const items: TenantActivityItem[] = [];

  milestones.forEach((item, index) => {
    const text = `${item.subjects ?? ''} ${item.events ?? ''}`.trim();
    if (!text) return;
    items.push({
      id: item.id ? `milestone-${item.id}` : `milestone-${item.createdAt}-${index}`,
      title: item.events || item.subjects || 'Update',
      subtitle: item.subjects && item.events ? item.subjects : undefined,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date(0).toISOString(),
      tone: resolveActivityTone(text, item.type),
      source: 'milestone',
    });
  });

  return items;
}

export function webStatsToActivityItems(stats: Record<string, any>): TenantActivityItem[] {
  const items: TenantActivityItem[] = [];
  const recentFeedback = Array.isArray(stats.recentFeedback) ? stats.recentFeedback : [];

  recentFeedback.forEach((log: any) => {
    const propertyName = propertyLabel(log);
    if (log.type === LogType.ENQUIRED) {
      items.push({
        id: `web-enquiry-${log.id}`,
        title: 'Enquiry sent',
        subtitle: `You enquired about ${propertyName}`,
        createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
        tone: 'enquiry',
        source: 'web',
      });
      return;
    }
    if (log.type === LogType.FEEDBACK) {
      items.push({
        id: `web-feedback-${log.id}`,
        title: 'Viewing feedback submitted',
        subtitle: `Feedback for ${propertyName}`,
        createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
        tone: 'viewing',
        source: 'web',
      });
    }
  });

  const recentInvites = Array.isArray(stats.recentInvites) ? stats.recentInvites : [];
  recentInvites.forEach((invite: any) => {
    const propertyName = propertyLabel(invite);
    const createdAt = invite.updatedAt || invite.createdAt || new Date().toISOString();
    const response = invite.response;

    if (response === 'ACCEPTED' || response === 'RESCHEDULED_ACCEPTED') {
      items.push({
        id: `web-viewing-accepted-${invite.id}`,
        title: 'Viewing accepted',
        subtitle: propertyName,
        createdAt: new Date(createdAt).toISOString(),
        tone: 'viewing',
        source: 'web',
      });
      return;
    }
    if (response === 'DECLINED') {
      items.push({
        id: `web-viewing-declined-${invite.id}`,
        title: 'Viewing declined',
        subtitle: propertyName,
        createdAt: new Date(createdAt).toISOString(),
        tone: 'viewing',
        source: 'web',
      });
      return;
    }
    if (response === 'CANCELLED') {
      items.push({
        id: `web-viewing-cancelled-${invite.id}`,
        title: 'Viewing cancelled',
        subtitle: propertyName,
        createdAt: new Date(createdAt).toISOString(),
        tone: 'viewing',
        source: 'web',
      });
    }
  });

  return items;
}

export function tenancyDataToActivityItems(data: {
  maintenanceRequests?: any[];
  transactions?: any[];
  bills?: any[];
  inspections?: any[];
}): TenantActivityItem[] {
  const items: TenantActivityItem[] = [];

  (data.maintenanceRequests ?? []).forEach((req: any) => {
    items.push({
      id: `maintenance-${req.id}`,
      title: req.category?.name || 'Maintenance request',
      subtitle: String(req.status || 'Requested').replace(/_/g, ' '),
      createdAt: (req.updatedAt || req.createdAt || new Date()).toISOString(),
      tone: 'maintenance',
      source: 'maintenance',
    });
  });

  (data.transactions ?? []).forEach((tx: any) => {
    const amount = formatMoney(
      Number(tx.amount),
      tx.currency ?? tx.property?.currency ?? tx.wallet?.currency
    );
    items.push({
      id: `payment-${tx.id}`,
      title: String(tx.reference || 'Wallet transaction').replace(/_/g, ' '),
      subtitle: `${amount} · ${tx.status || 'Completed'}`,
      createdAt: (tx.createdAt || new Date()).toISOString(),
      tone: 'payment',
      source: 'payment',
    });
  });

  (data.bills ?? []).forEach((bill: any) => {
    items.push({
      id: `bill-${bill.id}`,
      title: bill.description || bill.billName || bill.name || 'Bill',
      subtitle: bill.status || 'Due',
      createdAt: (bill.updatedAt || bill.createdAt || bill.dueDate || new Date()).toISOString(),
      tone: 'bill',
      source: 'bill',
    });
  });

  (data.inspections ?? []).forEach((inspection: any) => {
    items.push({
      id: `inspection-${inspection.id}`,
      title: inspection.title || inspection.type || 'Property inspection',
      subtitle: inspection.status || 'Scheduled',
      createdAt: (inspection.updatedAt || inspection.createdAt || new Date()).toISOString(),
      tone: 'inspection',
      source: 'inspection',
    });
  });

  return items;
}

export function dedupeActivityItems(items: TenantActivityItem[]): TenantActivityItem[] {
  const seen = new Set<string>();
  const result: TenantActivityItem[] = [];

  items.forEach((item) => {
    const day = item.createdAt?.slice(0, 10) ?? '';
    const fuzzyKey = `${day}|${item.title.toLowerCase().trim()}|${(item.subtitle ?? '').toLowerCase().trim()}`;
    if (seen.has(item.id) || seen.has(fuzzyKey)) return;
    seen.add(item.id);
    seen.add(fuzzyKey);
    result.push(item);
  });

  return result;
}
