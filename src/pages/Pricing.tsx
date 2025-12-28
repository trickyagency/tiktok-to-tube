import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Check,
  Crown,
  Zap,
  Rocket,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { generateGeneralWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 7,
    icon: Zap,
    color: 'emerald',
    description: 'Perfect for testing & beginners',
    features: [
      'Up to 2 videos/day',
      'Watermark-free uploads',
      'Auto upload',
      'Basic SEO (title + description)',
      'Standard queue',
    ],
    cta: 'Get Started',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    icon: Crown,
    color: 'blue',
    popular: true,
    description: 'Best value for serious creators',
    features: [
      'Up to 4 videos/day',
      'Watermark-free uploads',
      'Advanced SEO (hashtags + keywords)',
      'Auto scheduling',
      'Faster processing',
      'Re-upload protection',
    ],
    cta: 'Start Pro',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 18,
    icon: Rocket,
    color: 'purple',
    description: 'Maximum power for growth',
    features: [
      'Up to 6 videos/day (MAX)',
      'Smart SEO (AI-optimized titles)',
      'Best posting time optimization',
      'Duplicate detection',
      'Priority processing',
      'Growth optimization',
    ],
    cta: 'Go Scale',
  },
];

const benefits = [
  {
    icon: Sparkles,
    title: 'Automated Uploads',
    description: 'Set it and forget it. Your TikTok videos automatically upload to YouTube.',
  },
  {
    icon: Shield,
    title: 'Watermark-Free',
    description: 'Clean videos without TikTok watermarks for a professional look.',
  },
  {
    icon: Clock,
    title: 'Schedule Smart',
    description: 'Upload at the best times to maximize your reach and engagement.',
  },
  {
    icon: TrendingUp,
    title: 'SEO Optimized',
    description: 'Automatic titles, descriptions, and hashtags to boost discoverability.',
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  const handleWhatsAppContact = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">RepostFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleWhatsAppContact}
              className="hidden sm:flex gap-2 border-green-500/50 text-green-600 hover:bg-green-500/10"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Simple Per-Account Pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Grow Your YouTube
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              From TikTok Content
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Automatically repurpose your TikTok videos to YouTube Shorts. 
            Pay per TikTok account, upload unlimited videos based on your plan.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const colorClasses = {
                emerald: {
                  icon: 'text-emerald-500',
                  border: 'border-emerald-500/20 hover:border-emerald-500/40',
                  bg: 'bg-emerald-500/5',
                  button: 'bg-emerald-500 hover:bg-emerald-600 text-white',
                  check: 'text-emerald-500',
                },
                blue: {
                  icon: 'text-blue-500',
                  border: 'border-blue-500/40 hover:border-blue-500/60 ring-2 ring-blue-500/20',
                  bg: 'bg-blue-500/5',
                  button: 'bg-blue-500 hover:bg-blue-600 text-white',
                  check: 'text-blue-500',
                },
                purple: {
                  icon: 'text-purple-500',
                  border: 'border-purple-500/20 hover:border-purple-500/40',
                  bg: 'bg-purple-500/5',
                  button: 'bg-purple-500 hover:bg-purple-600 text-white',
                  check: 'text-purple-500',
                },
              };
              const colors = colorClasses[plan.color as keyof typeof colorClasses];

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col p-8 transition-all duration-300',
                    colors.border,
                    colors.bg,
                    plan.popular && 'scale-105 shadow-xl'
                  )}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white shadow-lg">
                      MOST POPULAR 🔥
                    </Badge>
                  )}

                  <div className="mb-6">
                    <Icon className={cn('h-10 w-10 mb-4', colors.icon)} />
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">per TikTok account</p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className={cn('h-5 w-5 mt-0.5 flex-shrink-0', colors.check)} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn('w-full', colors.button)}
                    size="lg"
                    onClick={() => navigate('/auth')}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* WhatsApp Contact Section */}
      <section className="py-12 border-t border-border/40 bg-green-500/5">
        <div className="container">
          <Card className="max-w-2xl mx-auto p-8 text-center border-green-500/30 bg-green-500/5">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to Subscribe?</h2>
            <p className="text-muted-foreground mb-6">
              Contact us on WhatsApp to get started with your subscription!
            </p>
            <Button 
              size="lg" 
              onClick={handleWhatsAppContact}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Contact on WhatsApp
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              {WHATSAPP_DISPLAY}
            </p>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 border-t border-border/40 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Why Choose Us?</h2>
            <p className="text-muted-foreground mt-2">
              Everything you need to repurpose your TikTok content
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <Card key={i} className="p-6 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">How does billing work?</h3>
              <p className="text-muted-foreground">
                You pay a monthly subscription for each TikTok account you want to manage. 
                After signing up, request a plan for your account and complete payment via WhatsApp. 
                Your subscription will be activated after payment confirmation.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">How do I pay?</h3>
              <p className="text-muted-foreground">
                Payment is handled via WhatsApp. When you subscribe or renew, you'll be redirected to 
                WhatsApp with a pre-filled message containing your subscription details. Complete the 
                payment as instructed, and your subscription will be activated within 24 hours.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. 
                Simply request a plan change via WhatsApp and it will be activated after payment confirmation.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What does "videos per day" mean?</h3>
              <p className="text-muted-foreground">
                This is the maximum number of videos that can be uploaded from one TikTok account 
                to YouTube per day. Basic allows 2, Pro allows 4, and Scale allows 6 videos daily.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/40">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Grow?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start repurposing your TikTok content to YouTube today and reach a whole new audience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleWhatsAppContact}
              className="border-green-500/50 text-green-600 hover:bg-green-500/10"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RepostFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
