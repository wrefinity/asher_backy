export type FamilyMember = {
  fullName: string;
  relationship: string;
  age?: string;
};

type FamilyOccupantsPayload = {
  v: 1;
  hasFamily: 'YES' | 'NO';
  members: FamilyMember[];
};

export function parseFamilyOccupants(raw?: string | null): {
  hasFamily?: 'YES' | 'NO';
  members: FamilyMember[];
  legacyText?: string;
} {
  if (!raw?.trim()) {
    return { members: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FamilyOccupantsPayload>;
    if (
      parsed?.v === 1 &&
      (parsed.hasFamily === 'YES' || parsed.hasFamily === 'NO')
    ) {
      return {
        hasFamily: parsed.hasFamily,
        members: Array.isArray(parsed.members)
          ? parsed.members.filter(
              member =>
                typeof member?.fullName === 'string' &&
                typeof member?.relationship === 'string'
            )
          : [],
      };
    }
  } catch {
    // legacy plain text
  }

  return { members: [], legacyText: raw.trim() };
}

export function formatFamilyOccupantsDisplay(raw?: string | null): string {
  const parsed = parseFamilyOccupants(raw);
  if (parsed.legacyText) return parsed.legacyText;
  if (parsed.hasFamily === 'NO') return 'No dependents';
  if (!parsed.members.length) return '';

  return parsed.members
    .map(member => {
      const age = member.age ? `, age ${member.age}` : '';
      return `${member.fullName} (${member.relationship}${age})`;
    })
    .join('; ');
}
