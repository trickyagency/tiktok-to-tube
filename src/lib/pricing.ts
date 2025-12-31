export const VOLUME_DISCOUNTS = [
  { minAccounts: 1, maxAccounts: 2, discount: 0, label: 'Standard', tier: 'starter' },
  { minAccounts: 3, maxAccounts: 5, discount: 0.15, label: '15% off', tier: 'growth' },
  { minAccounts: 6, maxAccounts: 10, discount: 0.25, label: '25% off', tier: 'business' },
  { minAccounts: 11, maxAccounts: 20, discount: 0.35, label: '35% off', tier: 'enterprise' },
  { minAccounts: 21, maxAccounts: Infinity, discount: 0.40, label: '40% off', tier: 'agency' },
];

export const ANNUAL_DISCOUNT = 0.25; // 25% off for annual plans

// Agency tier special benefits
export const AGENCY_BENEFITS = [
  'Dedicated account manager',
  'Priority support (< 2hr response)',
  'Custom API access',
  'White-label options',
  'Bulk import tools',
  'Advanced analytics dashboard',
];

export function getVolumeDiscount(accountCount: number): number {
  const tier = VOLUME_DISCOUNTS.find(
    t => accountCount >= t.minAccounts && accountCount <= t.maxAccounts
  );
  return tier?.discount || 0;
}

export function getDiscountPercentage(accountCount: number): number {
  return Math.round(getVolumeDiscount(accountCount) * 100);
}

export function getDiscountTierLabel(accountCount: number): string {
  const tier = VOLUME_DISCOUNTS.find(
    t => accountCount >= t.minAccounts && accountCount <= t.maxAccounts
  );
  return tier?.label || 'Standard';
}

export function getDiscountTierName(accountCount: number): string {
  const tier = VOLUME_DISCOUNTS.find(
    t => accountCount >= t.minAccounts && accountCount <= t.maxAccounts
  );
  return tier?.tier || 'starter';
}

export function isAgencyTier(accountCount: number): boolean {
  return accountCount >= 21;
}

export function getNextTierInfo(accountCount: number): { 
  accountsNeeded: number; 
  nextDiscount: number; 
  nextLabel: string;
} | null {
  const currentTierIndex = VOLUME_DISCOUNTS.findIndex(
    t => accountCount >= t.minAccounts && accountCount <= t.maxAccounts
  );
  
  const nextTier = VOLUME_DISCOUNTS[currentTierIndex + 1];
  if (!nextTier) return null;
  
  return {
    accountsNeeded: nextTier.minAccounts - accountCount,
    nextDiscount: nextTier.discount,
    nextLabel: nextTier.label,
  };
}

export function calculateDiscountedPrice(basePrice: number, accountCount: number): number {
  const discount = getVolumeDiscount(accountCount);
  return Math.round(basePrice * (1 - discount) * 100) / 100;
}

export function calculateTotalPrice(basePrice: number, accountCount: number): number {
  return Math.round(calculateDiscountedPrice(basePrice, accountCount) * accountCount * 100) / 100;
}

export function calculateSavings(basePrice: number, accountCount: number): number {
  const fullPrice = basePrice * accountCount;
  const discountedTotal = calculateTotalPrice(basePrice, accountCount);
  return Math.round((fullPrice - discountedTotal) * 100) / 100;
}

export function calculateAnnualWithVolumeDiscount(
  baseMonthlyPrice: number,
  accountCount: number
): {
  monthlyPerAccount: number;
  annualPerAccountPerMonth: number;
  totalMonthly: number;
  totalAnnualPerMonth: number;
  totalAnnualYear: number;
  volumeSavingsYear: number;
  annualSavingsYear: number;
  totalSavingsYear: number;
} {
  const volumeDiscountedPrice = calculateDiscountedPrice(baseMonthlyPrice, accountCount);
  const annualPricePerMonth = Math.round(volumeDiscountedPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100;

  const totalMonthly = Math.round(volumeDiscountedPrice * accountCount * 100) / 100;
  const totalAnnualPerMonth = Math.round(annualPricePerMonth * accountCount * 100) / 100;
  const totalAnnualYear = Math.round(totalAnnualPerMonth * 12 * 100) / 100;

  const fullYearlyPrice = baseMonthlyPrice * accountCount * 12;
  const volumeSavingsYear = Math.round((baseMonthlyPrice - volumeDiscountedPrice) * accountCount * 12 * 100) / 100;
  const annualSavingsYear = Math.round(volumeDiscountedPrice * ANNUAL_DISCOUNT * accountCount * 12 * 100) / 100;
  const totalSavingsYear = Math.round((fullYearlyPrice - totalAnnualYear) * 100) / 100;

  return {
    monthlyPerAccount: volumeDiscountedPrice,
    annualPerAccountPerMonth: annualPricePerMonth,
    totalMonthly,
    totalAnnualPerMonth,
    totalAnnualYear,
    volumeSavingsYear,
    annualSavingsYear,
    totalSavingsYear,
  };
}
