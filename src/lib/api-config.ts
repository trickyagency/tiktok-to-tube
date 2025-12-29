// Platform Configuration
// Centralized API URLs and platform branding constants

export const PLATFORM_DOMAIN = 'repostflow.digitalautomators.com';
export const PLATFORM_NAME = 'RepostFlow';

// Base URLs
export const PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;
export const API_BASE_URL = `${PLATFORM_URL}/functions/v1`;

// OAuth Configuration
export const OAUTH_REDIRECT_URI = `${API_BASE_URL}/youtube-oauth?action=callback`;
export const JAVASCRIPT_ORIGIN = PLATFORM_URL;

// Helper function for auth redirects (preserves existing logic)
export const getProductionUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If on Lovable preview or localhost, redirect to production
    if (window.location.hostname.includes('lovableproject.com') || 
        window.location.hostname === 'localhost') {
      return PLATFORM_URL;
    }
    // Otherwise use current origin (already on production)
    return window.location.origin;
  }
  
  return PLATFORM_URL;
};
