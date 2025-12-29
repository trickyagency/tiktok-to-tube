import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePageTitle, updateMetaDescription, updateCanonicalUrl } from "@/lib/seo";

const TermsOfService = () => {
  useEffect(() => {
    updatePageTitle('Terms of Service | RepostFlow');
    updateMetaDescription('Read the terms and conditions for using RepostFlow. Understand your rights and responsibilities when using our TikTok to YouTube automation service.');
    updateCanonicalUrl('/terms');
  }, []);

  const sections = [
    { id: 'acceptance', title: 'Acceptance of Terms' },
    { id: 'description', title: 'Description of Service' },
    { id: 'accounts', title: 'User Accounts' },
    { id: 'subscriptions', title: 'Subscriptions & Payment' },
    { id: 'content', title: 'User Content' },
    { id: 'prohibited', title: 'Prohibited Uses' },
    { id: 'third-party', title: 'Third-Party Services' },
    { id: 'intellectual-property', title: 'Intellectual Property' },
    { id: 'disclaimers', title: 'Disclaimers' },
    { id: 'liability', title: 'Limitation of Liability' },
    { id: 'termination', title: 'Termination' },
    { id: 'governing-law', title: 'Governing Law' },
    { id: 'contact', title: 'Contact Us' },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/pricing" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RF</span>
            </div>
            <span className="font-semibold text-xl text-foreground">RepostFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/pricing">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24">
              <Link to="/pricing" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <nav className="hidden lg:block space-y-1">
                <p className="text-sm font-medium text-foreground mb-3">On this page</p>
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <article className="flex-1 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
                <p className="text-muted-foreground">Last updated: December 29, 2024</p>
              </div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <section id="acceptance" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using RepostFlow ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 18 years of age or have the consent of a parent or guardian.
                </p>
              </section>

              <section id="description" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed">
                  RepostFlow is a web-based platform that automates the process of downloading videos from TikTok and uploading them to YouTube. The Service includes:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>TikTok account monitoring and video scraping</li>
                  <li>Watermark-free video downloading</li>
                  <li>Automated YouTube Shorts uploading</li>
                  <li>Scheduling and queue management</li>
                  <li>Analytics and upload history tracking</li>
                </ul>
              </section>

              <section id="accounts" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">User Accounts</h2>
                <p className="text-muted-foreground leading-relaxed">
                  When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
                </p>
              </section>

              <section id="subscriptions" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Subscriptions & Payment</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Billing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Subscription fees are billed on a monthly basis. By subscribing, you authorize us to charge your payment method on a recurring basis.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-6">Pricing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Pricing is per TikTok account. Current pricing is displayed on our pricing page. We reserve the right to change pricing with 30 days notice.
                </p>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-6">Refunds</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Due to the nature of digital services, refunds are generally not provided. However, we may consider refund requests on a case-by-case basis for technical issues that prevent service use.
                </p>
              </section>

              <section id="content" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">User Content</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You retain ownership of any content you process through our Service. By using RepostFlow, you represent and warrant that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>You own or have the rights to the TikTok content you process</li>
                  <li>You have permission to upload content to your YouTube channel</li>
                  <li>Your use complies with TikTok's and YouTube's terms of service</li>
                  <li>The content does not infringe any third-party rights</li>
                </ul>
              </section>

              <section id="prohibited" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Prohibited Uses</h2>
                <p className="text-muted-foreground leading-relaxed">You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>Process content you do not have rights to</li>
                  <li>Infringe on intellectual property rights of others</li>
                  <li>Upload illegal, harmful, or offensive content</li>
                  <li>Attempt to bypass service limitations or security measures</li>
                  <li>Use automated systems to abuse the service</li>
                  <li>Resell or redistribute the service without authorization</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </section>

              <section id="third-party" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Service integrates with third-party platforms including TikTok and YouTube. Your use of these platforms is subject to their respective terms of service:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>YouTube Terms of Service and API Services Terms</li>
                  <li>TikTok Terms of Service</li>
                  <li>Google Privacy Policy</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We are not responsible for the practices or content of these third-party services.
                </p>
              </section>

              <section id="intellectual-property" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of RepostFlow. The Service is protected by copyright, trademark, and other laws.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Our trademarks may not be used in connection with any product or service without prior written consent.
                </p>
              </section>

              <section id="disclaimers" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Disclaimers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We do not warrant that the Service will be uninterrupted, secure, or error-free. We are not responsible for any changes to third-party APIs that may affect Service functionality.
                </p>
              </section>

              <section id="liability" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  IN NO EVENT SHALL REPOSTFLOW, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Our total liability shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
                </p>
              </section>

              <section id="termination" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so through your account settings.
                </p>
              </section>

              <section id="governing-law" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall be governed and construed in accordance with applicable laws, without regard to its conflict of law provisions.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>
              </section>

              <section id="contact" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us via WhatsApp or through the contact information provided on our website.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 RepostFlow. All rights reserved.
            </p>
            <nav className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default TermsOfService;
