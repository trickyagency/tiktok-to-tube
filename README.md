# RepostFlow - TikTok to YouTube Automation

Automatically repurpose your TikTok videos to YouTube Shorts. Watermark-free, SEO-optimized uploads on autopilot.

## Features

- 🎬 Automatic TikTok video scraping
- 📤 Seamless YouTube Shorts uploads
- 🚫 Watermark-free video processing
- 📅 Scheduled publishing
- 📊 Analytics dashboard
- 👥 Multi-account support

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database, Auth, Edge Functions, Storage)
- **APIs**: TikTok scraping, YouTube Data API v3

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Supabase account

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd repostflow

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your Supabase credentials in .env

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all available configuration options.

## Deployment

The application can be deployed to any static hosting platform. Build the production bundle with:

```bash
npm run build
```

## Documentation

- [Environment Configuration](/.env.example) - Available environment variables
- [API Configuration](/src/lib/api-config.ts) - Platform and OAuth settings

## License

Proprietary - All rights reserved.
