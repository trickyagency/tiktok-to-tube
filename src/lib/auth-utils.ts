// Production domain for auth redirects
// This ensures all auth emails point to production, not preview URLs
export const getProductionUrl = (): string => {
  const prodDomain = 'repostflow.digitalautomators.com';
  
  if (typeof window !== 'undefined') {
    // If on Lovable preview or localhost, redirect to production
    if (window.location.hostname.includes('lovableproject.com') || 
        window.location.hostname === 'localhost') {
      return `https://${prodDomain}`;
    }
    // Otherwise use current origin (already on production)
    return window.location.origin;
  }
  
  return `https://${prodDomain}`;
};
