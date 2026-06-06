import type { LibraryMarketCode } from './marketCodes';

export type BillCatalogItem = {
  name: string;
  description: string;
  suggestedFrequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';
  typicalPayableBy: 'TENANT' | 'LANDLORD';
  tags?: string[];
};

export type BillCatalogCategory = {
  name: string;
  description: string;
  items: BillCatalogItem[];
};

/** Standard landlord-managed charge categories by supported market. */
export const MARKET_BILL_CATALOG: Record<LibraryMarketCode, BillCatalogCategory[]> = {
  UK: [
    {
      name: 'Rent & occupancy',
      description: 'Core tenancy charges',
      items: [
        { name: 'Rent', description: 'Periodic rent charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['rent'] },
        { name: 'Rent increase (Section 13)', description: 'Formal rent increase charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['rent-increase'] },
        { name: 'Holding deposit top-up', description: 'Additional deposit required', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Service & estate charges',
      description: 'UK block/estate charges',
      items: [
        { name: 'Service charge', description: 'Communal maintenance and management', suggestedFrequency: 'QUARTERLY', typicalPayableBy: 'TENANT', tags: ['service-charge'] },
        { name: 'Ground rent', description: 'Leasehold ground rent', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
        { name: 'Building insurance contribution', description: 'Tenant share of building insurance', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
        { name: 'Reserve / sinking fund', description: 'Major works reserve contribution', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Utilities & council',
      description: 'Utilities and local charges',
      items: [
        { name: 'Electricity', description: 'Electric supply charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Gas', description: 'Gas supply charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Water', description: 'Water and sewerage', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Council tax', description: 'Council tax (if tenant liable)', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['council-tax'] },
        { name: 'TV licence', description: 'TV licence fee', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
        { name: 'Internet / broadband', description: 'Broadband service', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Parking & amenities',
      description: 'Optional tenant charges',
      items: [
        { name: 'Parking space', description: 'Allocated parking bay', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['parking'] },
        { name: 'Storage locker', description: 'Storage unit rental', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Pet fee', description: 'Additional pet charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Fees & penalties',
      description: 'Administrative charges',
      items: [
        { name: 'Late payment fee', description: 'Fee for overdue rent/bills', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT', tags: ['late-fee'] },
        { name: 'Admin / renewal fee', description: 'Tenancy renewal administration', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
        { name: 'Key replacement', description: 'Lost key or fob replacement', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
  ],
  NG: [
    {
      name: 'Rent & deposits',
      description: 'Core Nigerian tenancy charges',
      items: [
        { name: 'Rent', description: 'Periodic rent', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT', tags: ['rent'] },
        { name: 'Rent increase', description: 'Revised rent amount', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT', tags: ['rent-increase'] },
        { name: 'Agency / legal fee', description: 'Tenancy documentation fee', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
        { name: 'Caution deposit top-up', description: 'Additional security deposit', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Service & estate',
      description: 'Estate and service levies',
      items: [
        { name: 'Service charge', description: 'Estate maintenance levy', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['service-charge'] },
        { name: 'Security levy', description: 'Estate security contribution', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Waste disposal', description: 'Refuse collection charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Utilities',
      description: 'Power and water',
      items: [
        { name: 'Electricity (PHCN/Disco)', description: 'Grid electricity', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Diesel / generator', description: 'Generator fuel or service charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Water', description: 'Water supply', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Internet', description: 'Broadband service', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Parking & extras',
      description: 'Optional charges',
      items: [
        { name: 'Parking space', description: 'Dedicated parking bay', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['parking'] },
        { name: 'Cleaning service', description: 'Periodic cleaning charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Fees & penalties',
      description: 'Administrative charges',
      items: [
        { name: 'Late payment fee', description: 'Overdue payment penalty', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT', tags: ['late-fee'] },
        { name: 'Maintenance reimbursement', description: 'Tenant share of repair cost', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
  ],
  US: [
    {
      name: 'Rent & fees',
      description: 'Core US rental charges',
      items: [
        { name: 'Rent', description: 'Monthly rent', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['rent'] },
        { name: 'Rent increase', description: 'Renewal or mid-lease increase', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['rent-increase'] },
        { name: 'Application fee', description: 'Application processing', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
        { name: 'Pet fee / deposit', description: 'Pet-related charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'HOA & property',
      description: 'Community and property charges',
      items: [
        { name: 'HOA / condo fee', description: 'Homeowners association fee', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['hoa'] },
        { name: 'Property tax pass-through', description: 'Tenant share of property tax', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT', tags: ['property-tax'] },
        { name: 'Renter\'s insurance', description: 'Required renters insurance', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Utilities',
      description: 'Utility charges',
      items: [
        { name: 'Electricity', description: 'Electric utility', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Gas', description: 'Gas utility', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Water / sewer', description: 'Water and sewer', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Trash / recycling', description: 'Waste collection', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Internet', description: 'Internet service', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Parking & amenities',
      description: 'Optional charges',
      items: [
        { name: 'Parking', description: 'Parking spot or garage', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['parking'] },
        { name: 'Storage unit', description: 'On-site storage', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Lawn / snow maintenance', description: 'Seasonal maintenance pass-through', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Fees & penalties',
      description: 'Administrative charges',
      items: [
        { name: 'Late fee', description: 'Late rent penalty', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT', tags: ['late-fee'] },
        { name: 'NSF fee', description: 'Returned payment fee', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
  ],
  IE: [
    {
      name: 'Rent & occupancy',
      description: 'Core Irish tenancy charges',
      items: [
        { name: 'Rent', description: 'Periodic rent', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['rent'] },
        { name: 'Rent increase (RPZ notice)', description: 'Permitted rent increase', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['rent-increase'] },
        { name: 'Deposit top-up', description: 'Additional deposit', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Service & management',
      description: 'Estate and management fees',
      items: [
        { name: 'Service charge', description: 'Management / communal charge', suggestedFrequency: 'QUARTERLY', typicalPayableBy: 'TENANT', tags: ['service-charge'] },
        { name: 'Building insurance', description: 'Tenant insurance contribution', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Utilities',
      description: 'Utility charges',
      items: [
        { name: 'Electricity', description: 'Electric supply', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Gas', description: 'Gas supply', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Water', description: 'Water charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'Broadband', description: 'Internet service', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
        { name: 'TV licence', description: 'TV licence', suggestedFrequency: 'YEARLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Parking & extras',
      description: 'Optional charges',
      items: [
        { name: 'Parking', description: 'Parking space', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT', tags: ['parking'] },
        { name: 'Pet fee', description: 'Pet charge', suggestedFrequency: 'MONTHLY', typicalPayableBy: 'TENANT' },
      ],
    },
    {
      name: 'Fees & penalties',
      description: 'Administrative charges',
      items: [
        { name: 'Late payment fee', description: 'Overdue penalty', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT', tags: ['late-fee'] },
        { name: 'Renewal admin fee', description: 'Lease renewal fee', suggestedFrequency: 'ONE_TIME', typicalPayableBy: 'TENANT' },
      ],
    },
  ],
};

export function getBillCatalogForMarket(market: string): BillCatalogCategory[] {
  const code = market.toUpperCase() as LibraryMarketCode;
  return MARKET_BILL_CATALOG[code] ?? MARKET_BILL_CATALOG.UK;
}

export function flattenBillCatalog(market: string): Array<BillCatalogItem & { categoryName: string }> {
  return getBillCatalogForMarket(market).flatMap((category) =>
    category.items.map((item) => ({ ...item, categoryName: category.name }))
  );
}
