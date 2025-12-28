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
