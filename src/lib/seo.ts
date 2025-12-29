// SEO utility functions for managing page-specific metadata

export const updatePageTitle = (title: string) => {
  document.title = title.includes('RepostFlow') ? title : `${title} | RepostFlow`;
};

export const updateMetaDescription = (description: string) => {
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
};

export const updateCanonicalUrl = (path: string) => {
  const baseUrl = 'https://repostflow.digitalautomators.com';
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  
  canonical.href = `${baseUrl}${path}`;
};

// Predefined SEO data for each route
export const pageSEO = {
  pricing: {
    title: 'Pricing - TikTok to YouTube Automation Plans | RepostFlow',
    description: 'Choose your RepostFlow plan. Starting at $7/month per TikTok account. Automate your TikTok to YouTube Shorts workflow with watermark-free uploads.',
  },
  auth: {
    title: 'Sign In | RepostFlow',
    description: 'Sign in or create your RepostFlow account to start automating your TikTok to YouTube content.',
  },
  dashboard: {
    title: 'Dashboard | RepostFlow',
    description: 'Manage your TikTok to YouTube automation from your RepostFlow dashboard.',
  },
  tiktok: {
    title: 'TikTok Accounts | RepostFlow',
    description: 'Manage your connected TikTok accounts for automated YouTube publishing.',
  },
  youtube: {
    title: 'YouTube Channels | RepostFlow',
    description: 'Manage your connected YouTube channels for automated video uploads.',
  },
  queue: {
    title: 'Video Queue | RepostFlow',
    description: 'View and manage your video publishing queue.',
  },
  schedules: {
    title: 'Schedules | RepostFlow',
    description: 'Set up automated publishing schedules for your content.',
  },
  history: {
    title: 'Upload History | RepostFlow',
    description: 'View your video upload history and statistics.',
  },
  settings: {
    title: 'Settings | RepostFlow',
    description: 'Manage your account settings and preferences.',
  },
  subscription: {
    title: 'My Subscription | RepostFlow',
    description: 'View and manage your RepostFlow subscription.',
  },
  analytics: {
    title: 'Analytics | RepostFlow',
    description: 'View your upload analytics and performance metrics.',
  },
  users: {
    title: 'User Management | RepostFlow',
    description: 'Manage users and permissions.',
  },
  subscriptionManagement: {
    title: 'Subscription Management | RepostFlow',
    description: 'Manage user subscriptions and plans.',
  },
  cron: {
    title: 'Cron Monitor | RepostFlow',
    description: 'Monitor scheduled jobs and their execution history.',
  },
  uploadAnalytics: {
    title: 'Upload Analytics | RepostFlow',
    description: 'Detailed analytics for your video uploads.',
  },
} as const;
