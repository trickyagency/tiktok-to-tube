export const WHATSAPP_NUMBER = "923068222670";
export const WHATSAPP_DISPLAY = "+92 306 822 2670";

export function openWhatsApp(message: string): void {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

interface WhatsAppMessageParams {
  type: 'new' | 'renew';
  username: string;
  planName: string;
  planPrice: number;
  userEmail?: string;
  expiryDate?: string;
}

export function generateWhatsAppLink(params: WhatsAppMessageParams): string {
  const { type, username, planName, planPrice, userEmail, expiryDate } = params;
  
  let message: string;
  
  if (type === 'new') {
    message = `Hi! I want to subscribe to the ${planName} plan ($${planPrice}/month) for my TikTok account @${username}.

Account: @${username}
Plan: ${planName} ($${planPrice}/month)${userEmail ? `\nEmail: ${userEmail}` : ''}

Please send payment details.`;
  } else {
    message = `Hi! I want to renew my ${planName} subscription ($${planPrice}/month) for @${username}.

Account: @${username}
Current Plan: ${planName} ($${planPrice}/month)${expiryDate ? `\nExpires: ${expiryDate}` : ''}${userEmail ? `\nEmail: ${userEmail}` : ''}

Please send payment details for renewal.`;
  }
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function generateGeneralWhatsAppLink(): string {
  const message = `Hi! I'm interested in subscribing to your TikTok to YouTube service. Please share the details.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

interface SwitchPlanParams {
  currentPlanName: string;
  newPlanName: string;
  newPlanPrice: number;
  userEmail?: string;
}

export function generateSwitchPlanWhatsAppLink(params: SwitchPlanParams): string {
  const { currentPlanName, newPlanName, newPlanPrice, userEmail } = params;
  
  const message = `Hi! I want to switch my subscription plan.

Current Plan: ${currentPlanName}
New Plan: ${newPlanName} ($${newPlanPrice}/month)${userEmail ? `\nEmail: ${userEmail}` : ''}

Please help me change my plan.`;
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

interface VolumeDiscountParams {
  planName: string;
  accountCount: number;
  pricePerAccount: number;
  totalPrice: number;
  discountPercentage: number;
  userEmail?: string;
}

export function generateVolumeDiscountWhatsAppLink(params: VolumeDiscountParams): string {
  const { planName, accountCount, pricePerAccount, totalPrice, discountPercentage, userEmail } = params;
  
  const message = `Hi! I'm interested in a multi-account subscription.

Plan: ${planName}
Number of Accounts: ${accountCount}
Discount: ${discountPercentage}% off
Price per Account: $${pricePerAccount}/month
Total Monthly: $${totalPrice}/month${userEmail ? `\nEmail: ${userEmail}` : ''}

Please help me set this up.`;
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

interface RequestUpgradeParams {
  currentPlanName: string;
  currentAccountCount: number;
  desiredAccountCount?: number;
  userEmail?: string;
}

export function generateUpgradeRequestWhatsAppLink(params: RequestUpgradeParams): string {
  const { currentPlanName, currentAccountCount, desiredAccountCount, userEmail } = params;
  
  const message = `Hi! I want to upgrade my subscription.

Current Plan: ${currentPlanName}
Current Account Slots: ${currentAccountCount}${desiredAccountCount ? `\nDesired Account Slots: ${desiredAccountCount}` : ''}${userEmail ? `\nEmail: ${userEmail}` : ''}

Please share upgrade options and pricing.`;
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

interface RenewalRequestParams {
  planName: string;
  accountCount: number;
  expiryDate?: string;
  userEmail?: string;
}

export function generateRenewalWhatsAppLink(params: RenewalRequestParams): string {
  const { planName, accountCount, expiryDate, userEmail } = params;
  
  const message = `Hi! I want to renew my subscription.

Plan: ${planName}
Account Slots: ${accountCount}${expiryDate ? `\nExpires: ${expiryDate}` : ''}${userEmail ? `\nEmail: ${userEmail}` : ''}

Please send payment details for renewal.`;
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

interface QuickRenewalParams {
  planName: string;
  planBasePrice: number;
  accountCount: number;
  billingInterval: 'monthly' | 'yearly';
  expiryDate?: string;
  userEmail?: string;
  volumeDiscount?: number;
  pricePerAccount?: number;
  totalPrice?: number;
}

export function generateQuickRenewalWhatsAppLink(params: QuickRenewalParams): string {
  const { 
    planName, 
    planBasePrice, 
    accountCount, 
    billingInterval, 
    expiryDate, 
    userEmail,
    volumeDiscount = 0,
    pricePerAccount,
    totalPrice
  } = params;
  
  const billingLabel = billingInterval === 'yearly' ? 'Yearly' : 'Monthly';
  const periodLabel = billingInterval === 'yearly' ? 'year' : 'month';
  const displayPricePerAccount = pricePerAccount ?? planBasePrice;
  const displayTotal = totalPrice ?? (displayPricePerAccount * accountCount);
  
  let message = `Hi! I want to renew my RepostFlow subscription.

📋 Current Subscription Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Plan: ${planName}
• Accounts: ${accountCount}
• Billing: ${billingLabel}`;

  if (volumeDiscount > 0) {
    message += `\n• Volume Discount: ${volumeDiscount}% off`;
  }
  
  message += `
• Price per Account: $${displayPricePerAccount.toFixed(2)}/${periodLabel}
• Total: $${displayTotal.toFixed(2)}/${periodLabel}`;

  if (expiryDate) {
    message += `\n\n📅 Expires: ${expiryDate}`;
  }
  
  if (userEmail) {
    message += `\n📧 Email: ${userEmail}`;
  }
  
  message += `\n\nPlease send payment details for renewal.`;
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
