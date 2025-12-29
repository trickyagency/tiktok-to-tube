export const WHATSAPP_NUMBER = "923068222670";
export const WHATSAPP_DISPLAY = "+92 306 822 2670";

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
