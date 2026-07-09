// Admin-controlled (AsherAdmin) config for which document types a vendor
// must submit during onboarding (Part 1 of VENDOR_APP_FLOW_SPEC.md) -
// replaces the hardcoded ID_CARD/CERTIFICATION pair.
import { prismaClient } from '..';

const DEFAULT_REQUIREMENTS = [
  { type: 'ID_CARD', label: 'Government-issued ID' },
  { type: 'CERTIFICATION', label: 'Trade certification' },
];

/** Seeds the default requirements once, if the table is empty - keeps the
 * app working out of the box before an admin has configured anything. */
async function ensureSeeded() {
  const count = await prismaClient.vendorDocumentRequirement.count();
  if (count > 0) return;

  await prismaClient.vendorDocumentRequirement.createMany({
    data: DEFAULT_REQUIREMENTS,
    skipDuplicates: true,
  });
}

export async function getActiveDocumentRequirements() {
  await ensureSeeded();
  return prismaClient.vendorDocumentRequirement.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getAllDocumentRequirements() {
  await ensureSeeded();
  return prismaClient.vendorDocumentRequirement.findMany({
    orderBy: { createdAt: 'asc' },
  });
}

export async function createDocumentRequirement(type: string, label: string) {
  return prismaClient.vendorDocumentRequirement.create({
    data: { type, label },
  });
}

export async function updateDocumentRequirement(
  id: string,
  data: { label?: string; active?: boolean }
) {
  return prismaClient.vendorDocumentRequirement.update({
    where: { id },
    data,
  });
}

export async function deleteDocumentRequirement(id: string) {
  return prismaClient.vendorDocumentRequirement.delete({ where: { id } });
}
