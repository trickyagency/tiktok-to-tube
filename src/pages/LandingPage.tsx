import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { updatePageTitle, updateMetaDescription, updateCanonicalUrl, pageSEO } from "@/lib/seo";
import {
  Play,
  Upload,
  Calendar,
  BarChart3,
  Shield,
  Zap,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  Clock,
  Target,
} from "lucide-react";

const LandingPage = () => {
  useEffect(() => {
    updatePageTitle(pageSEO.home.title);
    updateMetaDescription(pageSEO.home.description);
    updateCanonicalUrl("/");
  }, []);

  const features = [
    {
      icon: Sparkles,
      title: "Watermark-Free Videos",
      description: "Download and upload clean videos without TikTok watermarks for a professional look.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Set custom upload times to publish when your audience is most active.",
    },
    {
      icon: Target,
      title: "SEO Optimization",
      description: "Auto-generated titles, descriptions, and hashtags optimized for YouTube discovery.",
    },
    {
      icon: Shield,
      title: "Duplicate Protection",
      description: "Intelligent tracking ensures the same video is never uploaded twice.",
    },
    {
      icon: Zap,
      title: "Queue Management",
      description: "Full control over which videos get uploaded and when.",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track uploads, success rates, and channel performance in one dashboard.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Connect Your TikTok",
      description: "Simply enter your TikTok username. No API keys or complex setup required.",
      icon: Play,
    },
    {
      number: "02",
      title: "Link Your YouTube",
      description: "Authorize your YouTube channel with secure OAuth. Takes under a minute.",
      icon: Upload,
    },
    {
      number: "03",
      title: "Automate & Grow",
      description: "Set your schedule and watch as videos upload automatically. Focus on creating.",
      icon: Clock,
    },
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Content Creator",
      avatar: "SM",
      quote: "RepostFlow saved me hours every week. My YouTube Shorts channel grew by 300% in just 2 months!",
      rating: 5,
    },
    {
      name: "James K.",
      role: "Digital Marketer",
      avatar: "JK",
      quote: "The automation is flawless. I manage 5 channels now without breaking a sweat.",
      rating: 5,
    },
    {
      name: "Maria L.",
      role: "Lifestyle Influencer",
      avatar: "ML",
      quote: "Finally, a tool that actually works! The watermark removal alone is worth the price.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How does RepostFlow remove TikTok watermarks?",
      answer: "We use advanced scraping technology to download the original, watermark-free version of your videos directly from TikTok servers. This ensures the highest quality uploads to YouTube.",
    },
    {
      question: "Is this compliant with YouTube and TikTok terms?",
      answer: "You should only use RepostFlow with content you own or have rights to. Repurposing your own content across platforms is a common and accepted practice for content creators.",
    },
    {
      question: "How many videos can I upload per day?",
      answer: "This depends on your plan. Basic plans allow up to 3 videos per day per account, while Pro plans support up to 10 videos per day. YouTube also has its own daily quota limits.",
    },
    {
      question: "Do I need any technical knowledge?",
      answer: "Not at all! RepostFlow is designed to be user-friendly. Just enter your TikTok username, connect your YouTube channel, and you're ready to go.",
    },
    {
      question: "Can I schedule when videos are uploaded?",
      answer: "Yes! You can set specific times for uploads, choose how many videos per day, and even pause automation whenever you need.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Trusted by 500+ Creators
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Turn Your TikToks into{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                YouTube Shorts
              </span>
              {" "}Automatically
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop wasting hours manually downloading and uploading. RepostFlow automates your TikTok to YouTube workflow with watermark-free videos and smart scheduling.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-lg px-8">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg px-8"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>Watermark-Free</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>No API Keys Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>24/7 Automation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Videos Uploaded</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Happy Creators</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">5hrs</div>
              <div className="text-sm text-muted-foreground">Saved Weekly</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Growing in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              No technical knowledge required. Get set up in under 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <Card className="h-full bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <span className="text-6xl font-bold text-primary/20 group-hover:text-primary/30 transition-colors">
                        {step.number}
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Scale Your Content
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed to save you time and grow your audience across platforms.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="group bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Creators Worldwide
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See what our users have to say about their experience with RepostFlow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="font-medium">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Starting at just <span className="text-primary font-semibold">$7/month</span> per TikTok account. Cancel anytime.
            </p>
          </div>

          <div className="flex justify-center">
            <Link to="/pricing">
              <Button size="lg" className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                View All Plans
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Grow Your YouTube?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join 500+ creators who are already saving hours and growing their audience with RepostFlow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-lg px-8">
                  Start Free Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
