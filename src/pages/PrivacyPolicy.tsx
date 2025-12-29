import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { updatePageTitle, updateMetaDescription, updateCanonicalUrl } from "@/lib/seo";

const PrivacyPolicy = () => {
  useEffect(() => {
    updatePageTitle('Privacy Policy | RepostFlow');
    updateMetaDescription('Learn how RepostFlow collects, uses, and protects your data. Our privacy policy covers GDPR and CCPA compliance.');
    updateCanonicalUrl('/privacy');
  }, []);

  const sections = [
    { id: 'introduction', title: 'Introduction' },
    { id: 'information-collected', title: 'Information We Collect' },
    { id: 'how-we-use', title: 'How We Use Your Information' },
    { id: 'data-sharing', title: 'Data Sharing' },
    { id: 'data-security', title: 'Data Security' },
    { id: 'data-retention', title: 'Data Retention' },
    { id: 'your-rights', title: 'Your Rights' },
    { id: 'cookies', title: 'Cookies' },
    { id: 'children', title: "Children's Privacy" },
    { id: 'changes', title: 'Changes to This Policy' },
    { id: 'contact', title: 'Contact Us' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Spacer for fixed header */}
      <div className="h-16" />

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24">
              <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
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
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: December 29, 2024</p>
              </div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <section id="introduction" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to RepostFlow ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our TikTok to YouTube automation service.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  By using RepostFlow, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
                </p>
              </section>

              <section id="information-collected" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
                <h3 className="text-lg font-medium text-foreground mb-2">Account Information</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Email address and password (encrypted)</li>
                  <li>Full name (optional)</li>
                  <li>Profile information</li>
                </ul>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-6">TikTok Account Data</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>TikTok username and profile information</li>
                  <li>Video metadata (titles, descriptions, view counts)</li>
                  <li>Video URLs for processing</li>
                </ul>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-6">YouTube Account Data</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>YouTube channel information</li>
                  <li>OAuth tokens for API access (encrypted)</li>
                  <li>Upload history and video metadata</li>
                </ul>
                
                <h3 className="text-lg font-medium text-foreground mb-2 mt-6">Usage Data</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Log data (IP address, browser type, pages visited)</li>
                  <li>Feature usage patterns</li>
                  <li>Error reports and performance data</li>
                </ul>
              </section>

              <section id="how-we-use" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>Provide and maintain our service</li>
                  <li>Process and upload videos from TikTok to YouTube</li>
                  <li>Manage your account and subscriptions</li>
                  <li>Send service-related notifications</li>
                  <li>Respond to customer support requests</li>
                  <li>Improve and optimize our service</li>
                  <li>Detect and prevent fraud or abuse</li>
                </ul>
              </section>

              <section id="data-sharing" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Data Sharing</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell your personal information. We may share your data with:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>Service Providers:</strong> Supabase (database and authentication), YouTube API (video uploads)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
                </ul>
              </section>

              <section id="data-security" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your data, including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure authentication with optional MFA</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and role-based permissions</li>
                </ul>
              </section>

              <section id="data-retention" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal purposes.
                </p>
              </section>

              <section id="your-rights" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Depending on your location, you may have the following rights:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                  <li><strong>Deletion:</strong> Request deletion of your data</li>
                  <li><strong>Portability:</strong> Request transfer of your data</li>
                  <li><strong>Objection:</strong> Object to certain processing activities</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  To exercise these rights, please contact us at the email address below.
                </p>
              </section>

              <section id="cookies" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use essential cookies to maintain your session and preferences. We do not use third-party tracking cookies or advertising cookies. You can manage cookie preferences through your browser settings.
                </p>
              </section>

              <section id="children" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will take steps to delete it promptly.
                </p>
              </section>

              <section id="changes" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </section>

              <section id="contact" className="mb-10">
                <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy or our data practices, please contact us via WhatsApp or through the contact information provided on our website.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default PrivacyPolicy;
