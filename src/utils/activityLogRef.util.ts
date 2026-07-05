/** Appended to log events for deep-linking without schema changes. */
const REF_SUFFIX = /\s·\sref:(\w+):(\S+)$/;

export type ActivityLogRefType = 'inspection' | 'notice';

export function appendActivityLogRef(
  events: string,
  ref: { type: ActivityLogRefType; id: string }
): string {
  return `${events} · ref:${ref.type}:${ref.id}`;
}

export function parseActivityLogRef(
  text: string
): { type: ActivityLogRefType; id: string } | null {
  const match = text.match(REF_SUFFIX);
  if (!match) return null;
  return { type: match[1] as ActivityLogRefType, id: match[2] };
}

export function stripActivityLogRef(text: string): string {
  return text.replace(REF_SUFFIX, '').trim();
}
