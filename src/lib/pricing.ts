export const VOLUME_DISCOUNTS = [
  { minAccounts: 1, maxAccounts: 2, discount: 0, label: 'Standard' },
  { minAccounts: 3, maxAccounts: 5, discount: 0.1667, label: '17% off' },
  { minAccounts: 6, maxAccounts: 10, discount: 0.3333, label: '33% off' },
  { minAccounts: 11, maxAccounts: Infinity, discount: 0.50, label: '50% off' },
];

export const ANNUAL_DISCOUNT = 0.20; // 20% off for annual plans

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
