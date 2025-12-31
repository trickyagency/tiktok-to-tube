import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { pageSEO, updateMetaDescription, updateCanonicalUrl } from '@/lib/seo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Check,
  Crown,
  Zap,
  Rocket,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
  MessageCircle,
  Headphones,
} from 'lucide-react';
import { generateGeneralWhatsAppLink } from '@/lib/whatsapp';
import { 
  getDiscountPercentage, 
  calculateDiscountedPrice, 
  getDiscountTierLabel,
  getNextTierInfo,
  calculateAnnualWithVolumeDiscount,
  VOLUME_DISCOUNTS
} from '@/lib/pricing';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 7,
    icon: Zap,
    color: 'text-blue-500',
    description: 'Perfect for getting started',
    features: [
      '2 videos per day',
      'Basic scheduling',
      'Email support',
      'Standard analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    icon: Crown,
    color: 'text-primary',
    description: 'Most popular for growing creators',
    features: [
      '4 videos per day',
      'Advanced scheduling',
      'Priority support',
      'Analytics dashboard',
      'Custom thumbnails',
    ],
    recommended: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 18,
    icon: Rocket,
    color: 'text-purple-500',
    description: 'For serious content creators',
    features: [
      '6 videos per day',
      'Unlimited scheduling',
      'Dedicated support',
      'Advanced analytics',
      'White-label options',
      'Priority processing',
    ],
  },
];

const benefits = [
  {
    icon: Clock,
    title: 'Save Hours Daily',
    description: 'Automate your content repurposing and focus on creating',
  },
  {
    icon: TrendingUp,
    title: 'Grow Faster',
    description: 'Reach new audiences on YouTube Shorts automatically',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Your content is handled with enterprise-grade security',
  },
  {
    icon: Headphones,
    title: 'Expert Support',
    description: 'Get help from our team whenever you need it',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [accountCount, setAccountCount] = useState<number>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[1];

  // Calculate pricing for selected plan
  const pricingData = useMemo(() => {
    const basePrice = selectedPlan.price;
    const discountedPrice = calculateDiscountedPrice(basePrice, accountCount);
    const discountPercentage = getDiscountPercentage(accountCount);
    const annualData = calculateAnnualWithVolumeDiscount(basePrice, accountCount);
    
    return {
      basePrice,
      discountedPrice,
      discountPercentage,
      totalMonthly: discountedPrice * accountCount,
      annualPerAccountPerMonth: annualData.annualPerAccountPerMonth,
      totalAnnualYear: annualData.totalAnnualYear,
      totalSavingsYear: annualData.totalSavingsYear,
    };
  }, [selectedPlan, accountCount]);

  const nextTier = getNextTierInfo(accountCount);

  useEffect(() => {
    document.title = pageSEO.pricing.title;
    updateMetaDescription(pageSEO.pricing.description);
    updateCanonicalUrl('/pricing');
  }, []);

  const handleWhatsAppContact = () => {
    window.open(generateGeneralWhatsAppLink(), '_blank');
  };

  const handleAccountCountChange = (value: string) => {
    const num = parseInt(value) || 1;
    setAccountCount(Math.max(1, num));
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Simple Per-Account Pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Choose the plan that fits your needs. Scale up anytime with volume discounts.
          </p>
        </div>
      </section>

      {/* Account Count Input */}
      <section className="pb-8">
        <div className="container">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">How many TikTok accounts?</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the number of accounts you want to manage
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={accountCount}
                    onChange={(e) => handleAccountCountChange(e.target.value)}
                    className="w-24 text-center text-lg font-semibold"
                  />
                  <span className="text-muted-foreground">accounts</span>
                </div>
              </div>
              
              {/* Discount badge and next tier info */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {getDiscountPercentage(accountCount) > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    {getDiscountTierLabel(accountCount)}
                  </Badge>
                )}
                {nextTier && (
                  <span className="text-sm text-amber-600">
                    Add {nextTier.accountsNeeded} more for {nextTier.nextLabel}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-8">
        <div className="container">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingCycle === 'monthly' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingCycle === 'annual' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Annual · Save 25%
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Cards - Clickable to Select */}
      <section className="pb-8">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const Icon = plan.icon;

              return (
                <Card 
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    'relative cursor-pointer transition-all',
                    isSelected 
                      ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isSelected && !plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                        Selected
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={cn('mx-auto mb-2', plan.color)}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">/mo per account</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Summary Card */}
      <section className="pb-12">
        <div className="container">
          <Card className="max-w-2xl mx-auto border-primary bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h3 className="font-semibold text-xl">
                  {selectedPlan.name} Plan × {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
                </h3>
                {pricingData.discountPercentage > 0 && (
                  <Badge className="mt-2 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    Volume Discount: {pricingData.discountPercentage}% off
                  </Badge>
                )}
              </div>
              
              {/* Pricing Display */}
              <div className="text-center mb-6">
                {billingCycle === 'monthly' ? (
                  <>
                    {pricingData.discountPercentage > 0 && (
                      <div className="text-sm text-muted-foreground line-through mb-1">
                        ${pricingData.basePrice}/account/month
                      </div>
                    )}
                    <div className="text-lg">
                      <span className="font-semibold">${pricingData.discountedPrice.toFixed(2)}</span>
                      <span className="text-muted-foreground">/account/month</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mt-3">
                      ${pricingData.totalMonthly.toFixed(2)}<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg">
                      <span className="font-semibold">${pricingData.annualPerAccountPerMonth.toFixed(2)}</span>
                      <span className="text-muted-foreground">/account/month</span>
                    </div>
                    <div className="text-4xl font-bold text-primary mt-3">
                      ${pricingData.totalAnnualYear.toFixed(2)}<span className="text-lg font-normal text-muted-foreground">/year</span>
                    </div>
                    <Badge className="mt-3 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                      Save ${pricingData.totalSavingsYear.toFixed(2)} annually
                    </Badge>
                  </>
                )}
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button size="lg" onClick={handleWhatsAppContact} className="min-w-[200px]">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Get Started - Contact on WhatsApp
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
                  Sign Up Free
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Volume Discounts Reference */}
      <section className="pb-12">
        <div className="container">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-center">Volume Discounts</CardTitle>
              <p className="text-sm text-muted-foreground text-center">
                The more accounts you add, the more you save
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {VOLUME_DISCOUNTS.map((tier) => {
                  const rangeLabel = tier.maxAccounts === Infinity 
                    ? `${tier.minAccounts}+` 
                    : `${tier.minAccounts}-${tier.maxAccounts}`;
                  const isActive = accountCount >= tier.minAccounts && accountCount <= tier.maxAccounts;
                  
                  return (
                    <div 
                      key={tier.tier}
                      className={cn(
                        'text-center p-4 rounded-lg border transition-all',
                        isActive 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border'
                      )}
                    >
                      <div className="font-semibold">{rangeLabel}</div>
                      <div className="text-sm text-muted-foreground capitalize">{tier.tier}</div>
                      <div className={cn('text-lg font-bold', tier.discount > 0 && 'text-emerald-600')}>
                        {tier.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* WhatsApp Contact */}
      <section className="pb-12">
        <div className="container">
          <Card className="max-w-2xl mx-auto border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Need help choosing?</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact us on WhatsApp for personalized recommendations
                  </p>
                </div>
                <Button 
                  onClick={handleWhatsAppContact}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat on WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 border-t border-border/40 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">Why Choose Us?</h2>
            <p className="text-muted-foreground mt-2">
              Everything you need to repurpose your TikTok content
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {benefits.map((benefit, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6 text-center">
                  <benefit.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how-it-works">
              <AccordionTrigger>How does the service work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Simply connect your TikTok accounts and YouTube channels. Our platform automatically 
                scrapes your TikTok videos and repurposes them for YouTube Shorts based on your schedule.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="volume-discounts">
              <AccordionTrigger>What are volume discounts?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Volume discounts reduce your per-account cost as you add more accounts:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>3-5 accounts: 15% off</li>
                  <li>6-10 accounts: 25% off</li>
                  <li>11-20 accounts: 35% off</li>
                  <li>21+ accounts: 50% off</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="annual">
              <AccordionTrigger>How does annual billing work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Annual billing gives you an additional 25% discount on top of any volume discounts. 
                You pay for the full year upfront at a reduced rate.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="cancel">
              <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes, you can cancel your subscription at any time. Your access will continue until 
                the end of your current billing period.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="payment">
              <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept various payment methods. Contact us on WhatsApp to discuss the best 
                payment option for your needs.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="trial">
              <AccordionTrigger>Is there a free trial?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Contact us on WhatsApp to discuss trial options. We offer demos and limited trials 
                for qualified users.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-border/40">
        <div className="container text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of creators who are automating their content repurposing and growing their audience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleWhatsAppContact}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Contact on WhatsApp
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Create Free Account
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
