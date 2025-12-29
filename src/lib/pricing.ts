export const VOLUME_DISCOUNTS = [
  { minAccounts: 1, discount: 0 },    // Full price
  { minAccounts: 2, discount: 0.05 }, // 5% off
  { minAccounts: 3, discount: 0.10 }, // 10% off
  { minAccounts: 4, discount: 0.15 }, // 15% off
  { minAccounts: 5, discount: 0.20 }, // 20% off (max)
];

export function getVolumeDiscount(accountCount: number): number {
  const tier = [...VOLUME_DISCOUNTS]
    .reverse()
    .find(t => accountCount >= t.minAccounts);
  return tier?.discount || 0;
}

export function getDiscountPercentage(accountCount: number): number {
  return Math.round(getVolumeDiscount(accountCount) * 100);
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
