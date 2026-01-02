import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CopyableUrl } from '@/components/ui/copyable-url';
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react';
import { OAUTH_REDIRECT_URI, JAVASCRIPT_ORIGIN } from '@/lib/api-config';

export function GoogleCloudSetupGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      title: 'Create a Google Cloud Project',
      items: [
        <>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.cloud.google.com</a></>,
        'Click "Select a project" → "New Project"',
        'Name it (e.g., "My YouTube Uploader") and click Create',
      ],
    },
    {
      title: 'Enable YouTube Data API v3',
      items: [
        'Go to "APIs & Services" → "Library"',
        'Search for "YouTube Data API v3"',
        'Click on it and press "Enable"',
      ],
    },
    {
      title: 'Configure OAuth Consent Screen',
      items: [
        'Go to "APIs & Services" → "OAuth consent screen"',
        'Select "External" user type and click Create',
        'Fill in App name, User support email, and Developer contact email',
        'Click "Save and Continue" through scopes (no changes needed)',
        'Add your email as a test user, then click "Save and Continue"',
      ],
    },
    {
      title: 'Create OAuth 2.0 Credentials',
      items: [
        'Go to "APIs & Services" → "Credentials"',
        'Click "Create Credentials" → "OAuth client ID"',
        'Select "Web application" as Application type',
        'Add the Authorized JavaScript origin (copy from below)',
        'Add the Authorized redirect URI (copy from below)',
        'Click "Create" and copy your Client ID and Client Secret',
      ],
    },
    {
      title: 'Add Your Channel Here',
      items: [
        'Click the "Add YouTube Channel" button',
        'Paste your Client ID and Client Secret',
        'Click "Add Channel", then click "Authorize" to complete the OAuth flow',
      ],
    },
  ];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Google Cloud Setup Guide
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Required URLs */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                ⚠️ Copy these URLs to Google Cloud Console
              </h4>
              
              <CopyableUrl 
                url={JAVASCRIPT_ORIGIN} 
                label="Authorized JavaScript Origin:"
              />
              
              <CopyableUrl 
                url={OAUTH_REDIRECT_URI} 
                label="Authorized Redirect URI:"
              />
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {index + 1}
                    </span>
                    {step.title}
                  </h4>
                  <ul className="ml-8 space-y-1">
                    {step.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Credentials Page
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  YouTube API
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://console.cloud.google.com/apis/credentials/consent" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  OAuth Consent
                </a>
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
