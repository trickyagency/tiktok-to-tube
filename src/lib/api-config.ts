// Platform Configuration
// Centralized API URLs and platform branding constants with environment detection

// Environment types
type Environment = 'development' | 'staging' | 'production';

// Environment-specific configuration
const ENV_CONFIG = {
  development: {
    domain: 'localhost:8080',
    protocol: 'http' as const,
  },
  staging: {
    domain: 'staging.repostflow.digitalautomators.com',
    protocol: 'https' as const,
  },
  production: {
    domain: 'repostflow.digitalautomators.com',
    protocol: 'https' as const,
  },
} as const;

// Detect current environment automatically
const detectEnvironment = (): Environment => {
  // 1. Check for explicit environment variable override
  const envOverride = import.meta.env.VITE_APP_ENVIRONMENT;
  if (envOverride && envOverride in ENV_CONFIG) {
    return envOverride as Environment;
  }
  
  // 2. Detect based on hostname in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Localhost or 127.0.0.1 = development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    // Preview environment = development
    if (hostname.includes('lovableproject.com')) {
      return 'development';
    }
    
    // Staging subdomain
    if (hostname.includes('staging')) {
      return 'staging';
    }
  }
  
  // 3. Check Vite's build mode
  if (import.meta.env.MODE === 'development') {
    return 'development';
  }
  
  // 4. Default to production
  return 'production';
};

// Current environment
export const CURRENT_ENVIRONMENT = detectEnvironment();
export const IS_DEVELOPMENT = CURRENT_ENVIRONMENT === 'development';
export const IS_STAGING = CURRENT_ENVIRONMENT === 'staging';
export const IS_PRODUCTION = CURRENT_ENVIRONMENT === 'production';

// Get config for current environment
const currentConfig = ENV_CONFIG[CURRENT_ENVIRONMENT];

// Platform constants
export const PLATFORM_NAME = 'RepostFlow';
export const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || ENV_CONFIG.production.domain;

// Base URLs - always use production domain for external services
export const PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;
export const API_BASE_URL = IS_DEVELOPMENT 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : `${PLATFORM_URL}/functions/v1`;

// OAuth Configuration - always points to production
export const OAUTH_REDIRECT_URI = `https://${ENV_CONFIG.production.domain}/functions/v1/youtube-oauth?action=callback`;
export const JAVASCRIPT_ORIGIN = `https://${ENV_CONFIG.production.domain}`;

// Helper function for auth redirects (always redirects to production for auth)
export const getProductionUrl = (): string => {
  if (typeof window !== 'undefined') {
    // For non-production environments, redirect auth to production
    if (!IS_PRODUCTION) {
      return `https://${ENV_CONFIG.production.domain}`;
    }
    // On production, use current origin
    return window.location.origin;
  }
  
  return `https://${ENV_CONFIG.production.domain}`;
};

// Debug helper - only logs in development
export const logEnvironmentInfo = (): void => {
  if (IS_DEVELOPMENT) {
    console.log('🔧 Environment Info:', {
      environment: CURRENT_ENVIRONMENT,
      domain: PLATFORM_DOMAIN,
      apiBase: API_BASE_URL,
      mode: import.meta.env.MODE,
      protocol: currentConfig.protocol,
    });
  }
};
