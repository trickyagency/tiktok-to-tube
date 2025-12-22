import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Copy, Check, Terminal, Globe, MousePointer } from 'lucide-react';
import { toast } from 'sonner';

const CONSOLE_SCRIPT = `// Scroll down to load all videos first, then run:
Array.from(document.querySelectorAll('a[href*="/video/"]'))
  .map(a => a.href)
  .filter((v,i,a) => a.indexOf(v) === i)
  .join('\\n')`;

export function ChromeExtensionGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyScript = () => {
    navigator.clipboard.writeText(CONSOLE_SCRIPT);
    setCopied(true);
    toast.success('Script copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          How to Export URLs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Export TikTok Video URLs
            <Badge variant="secondary">Free Methods</Badge>
          </DialogTitle>
          <DialogDescription>
            TikTok limits automatic video scraping. Use one of these methods to export your video URLs for bulk import.
          </DialogDescription>
        </DialogHeader>

        <Accordion type="single" collapsible defaultValue="method1" className="w-full">
          <AccordionItem value="method1">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <span>Method 1: Browser Console</span>
                <Badge variant="outline" className="ml-2">Recommended</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>
                  Open the TikTok profile page in Chrome (e.g., <code className="bg-muted px-1 rounded">tiktok.com/@username</code>)
                </li>
                <li>
                  <strong>Scroll down</strong> to load all the videos you want to export
                </li>
                <li>
                  Press <kbd className="px-2 py-1 bg-muted rounded text-xs">F12</kbd> or <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Shift+J</kbd> to open Developer Tools
                </li>
                <li>
                  Click on the <strong>Console</strong> tab
                </li>
                <li>
                  Copy and paste this script, then press <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>:
                </li>
              </ol>

              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {CONSOLE_SCRIPT}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={copyScript}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                The script will output all video URLs. Right-click and select "Copy string contents", then paste into the Bulk Import dialog.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="method2">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span>Method 2: Browser Extension</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Several free Chrome extensions can help you collect TikTok video URLs:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>
                  <strong>Link Grabber</strong> - Extracts all links from a page
                </li>
                <li>
                  <strong>Copy All Urls</strong> - Quick copy of all page links
                </li>
                <li>
                  <strong>Web Scraper</strong> - More advanced extraction tool
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Search for these in the Chrome Web Store. Filter the results to only show TikTok video URLs (containing "/video/").
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="method3">
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-primary" />
                <span>Method 3: Manual Copy</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                For a small number of videos, you can manually copy each link:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to the TikTok profile page</li>
                <li>Right-click on each video thumbnail</li>
                <li>Select "Copy link" or "Copy link address"</li>
                <li>Paste each URL on a new line in the Bulk Import dialog</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                This method is best for importing a few specific videos rather than an entire account.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>💡 Tip:</strong> Once you have your URLs, click the <strong>"Bulk Import"</strong> button to paste them all at once. Our system will fetch the video details and download URLs automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
