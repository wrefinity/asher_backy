/**
 * Backfill marketValue / propertyValue from monthly rent (price) when missing.
 * Run: npx tsx scripts/backfill-property-values.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** 10× annual rent — matches property value analytics valuation model */
function valuationFromMonthlyRent(monthlyRent: number): number {
  return monthlyRent * 12 * 10;
}

async function main() {
  const properties = await prisma.properties.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      price: true,
      marketValue: true,
      propertyValue: true,
    },
  });

  let updated = 0;
  for (const property of properties) {
    const monthlyRent = Number(property.price) || 0;
    const market = Number(property.marketValue) || 0;
    const propVal = Number(property.propertyValue) || 0;

    if (monthlyRent <= 0 && market <= 0) continue;

    const nextMarket =
      market > 0 ? market : valuationFromMonthlyRent(monthlyRent);
    const nextPropertyValue =
      propVal > 0 ? propVal : Math.round(nextMarket * 0.7 * 100) / 100;

    if (
      Math.abs(nextMarket - market) < 0.01 &&
      Math.abs(nextPropertyValue - propVal) < 0.01
    ) {
      continue;
    }

    await prisma.properties.update({
      where: { id: property.id },
      data: {
        marketValue: nextMarket,
        propertyValue: nextPropertyValue,
      },
    });
    updated += 1;
    console.log(
      `Updated ${property.name}: marketValue=${nextMarket}, propertyValue=${nextPropertyValue}`
    );
  }

  console.log(`Done. Updated ${updated} of ${properties.length} properties.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
