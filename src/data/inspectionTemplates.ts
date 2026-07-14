/** Shared inspection checklist templates (server-side seed for guest / start). */

type ItemSeed = { itemName: string; condition: string; actionRequired: boolean };

type SectionSeed = {
  sectionType: string;
  items: ItemSeed[];
};

const item = (itemName: string): ItemSeed => ({
  itemName,
  condition: 'N/A',
  actionRequired: false,
});

const ROUTINE: SectionSeed[] = [
  {
    sectionType: 'exterior',
    items: [
      item('Roof Condition'),
      item('Exterior Walls'),
      item('Driveway / Walkways'),
      item('Exterior Lighting'),
    ],
  },
  {
    sectionType: 'interior',
    items: [
      item('Flooring'),
      item('Walls & Ceiling'),
      item('Windows & Doors'),
      item('Smoke / CO Alarms'),
    ],
  },
  {
    sectionType: 'kitchen',
    items: [item('Appliances'), item('Cabinets'), item('Sink & Plumbing')],
  },
  {
    sectionType: 'bathroom',
    items: [item('Fixtures'), item('Tiles & Seals'), item('Ventilation')],
  },
];

const MOVE: SectionSeed[] = [
  {
    sectionType: 'exterior',
    items: [
      item('Roof Condition'),
      item('Exterior Walls'),
      item('Driveway / Walkways'),
      item('Garden / Fence'),
      item('Locks & Keys'),
    ],
  },
  {
    sectionType: 'interior',
    items: [
      item('Flooring / Carpets'),
      item('Walls & Ceiling'),
      item('Windows & Doors'),
      item('Furnishings / Inventory'),
      item('Smoke / CO Alarms'),
    ],
  },
  {
    sectionType: 'kitchen',
    items: [
      item('Appliances (full set)'),
      item('Cabinets & Worktops'),
      item('Sink & Plumbing'),
      item('Extractor / Hood'),
    ],
  },
  {
    sectionType: 'bathroom',
    items: [
      item('Fixtures'),
      item('Tiles, Seals & Shower'),
      item('Ventilation'),
      item('Towel Rails / Accessories'),
    ],
  },
];

const DAMAGE: SectionSeed[] = [
  {
    sectionType: 'exterior',
    items: [
      item('Walls / Siding Impact'),
      item('Windows / Glass'),
      item('Exterior Doors'),
    ],
  },
  {
    sectionType: 'interior',
    items: [
      item('Walls (holes / marks)'),
      item('Floors / Stains'),
      item('Doors & Frames'),
    ],
  },
  {
    sectionType: 'kitchen',
    items: [item('Appliance Damage'), item('Cabinets / Worktops')],
  },
  {
    sectionType: 'bathroom',
    items: [item('Tiles / Grout'), item('Fixtures / Leaks')],
  },
];

const SAFETY: SectionSeed[] = [
  {
    sectionType: 'exterior',
    items: [item('Access / Egress'), item('Exterior Lighting')],
  },
  {
    sectionType: 'interior',
    items: [
      item('Smoke / CO Alarms'),
      item('Electrics (sockets / consumer)'),
      item('Heating Safety Notes'),
    ],
  },
  {
    sectionType: 'kitchen',
    items: [item('Gas Appliances (if applicable)'), item('Extractor / Ventilation')],
  },
  {
    sectionType: 'bathroom',
    items: [item('Wet-area Slip / Leak Risk'), item('Extract Fan')],
  },
];

function resolveFamily(type?: string | null): 'routine' | 'move' | 'damage' | 'safety' {
  const normalized = (type || '').trim().toLowerCase();
  if (
    normalized.includes('move-out') ||
    normalized.includes('move out') ||
    normalized.includes('move-in') ||
    normalized.includes('move in')
  ) {
    return 'move';
  }
  if (normalized.includes('damage')) return 'damage';
  if (normalized.includes('safety')) return 'safety';
  return 'routine';
}

export function getTemplateSectionsPayloadForType(type?: string | null): SectionSeed[] {
  const family = resolveFamily(type);
  if (family === 'move') return MOVE.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
  if (family === 'damage') return DAMAGE.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
  if (family === 'safety') return SAFETY.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
  return ROUTINE.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
}
