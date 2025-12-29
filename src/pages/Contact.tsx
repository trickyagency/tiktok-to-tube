import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageCircle, Mail, Clock, Send, HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AnimatedSection } from "@/components/AnimatedSection";
import { updatePageTitle, updateMetaDescription, updateCanonicalUrl, pageSEO } from "@/lib/seo";
import { openWhatsApp } from "@/lib/whatsapp";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be less than 255 characters"),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const faqs = [
  {
    question: "How quickly will you respond?",
    answer: "We typically respond within 24 hours during business days. For urgent issues, we recommend using WhatsApp for faster support."
  },
  {
    question: "What's the best way to reach support?",
    answer: "For quick questions, WhatsApp is the fastest option. For detailed inquiries or issues that require documentation, please use the contact form or email us directly."
  },
  {
    question: "Can I schedule a demo?",
    answer: "Absolutely! Just fill out the contact form with 'Demo Request' as the subject, and we'll arrange a personalized walkthrough of RepostFlow."
  },
  {
    question: "How do I report a bug?",
    answer: "Please use the contact form with 'Technical Support' selected. Include as much detail as possible: what you were doing, what happened, and any error messages you saw."
  },
  {
    question: "Where can I find documentation?",
    answer: "You can find guides and FAQs throughout the dashboard. For specific questions, reach out to us and we'll be happy to help!"
  },
];

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const subject = watch("subject");

  useEffect(() => {
    updatePageTitle(pageSEO.contact.title);
    updateMetaDescription(pageSEO.contact.description);
    updateCanonicalUrl('/contact');
  }, []);

  const onSubmit = (data: ContactFormData) => {
    setIsSubmitting(true);
    
    // Build WhatsApp message
    const message = `*New Contact Form Submission*

*Name:* ${data.name}
*Email:* ${data.email}
*Subject:* ${data.subject}

*Message:*
${data.message}`;

    openWhatsApp(message);
    
    toast({
      title: "Opening WhatsApp",
      description: "Your message has been prepared. Please send it via WhatsApp.",
    });

    reset();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <AnimatedSection>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Get in Touch
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Have questions about RepostFlow? We're here to help. Reach out and we'll get back to you as soon as possible.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <AnimatedSection delay={0}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-primary" />
                      Send us a Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          {...register("name")}
                          className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          {...register("email")}
                          className={errors.email ? "border-destructive" : ""}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Select onValueChange={(value) => setValue("subject", value)} value={subject}>
                          <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                            <SelectItem value="Technical Support">Technical Support</SelectItem>
                            <SelectItem value="Billing">Billing</SelectItem>
                            <SelectItem value="Demo Request">Demo Request</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.subject && (
                          <p className="text-sm text-destructive">{errors.subject.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us how we can help..."
                          rows={5}
                          {...register("message")}
                          className={errors.message ? "border-destructive" : ""}
                        />
                        {errors.message && (
                          <p className="text-sm text-destructive">{errors.message.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground text-right">
                          Max 1000 characters
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Preparing..." : "Send Message"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* Contact Info & FAQ */}
              <div className="space-y-8">
                {/* Contact Methods */}
                <AnimatedSection delay={100}>
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle>Other Ways to Reach Us</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <button
                        onClick={() => openWhatsApp("Hi! I have a question about RepostFlow.")}
                        className="flex items-start gap-4 w-full text-left p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">WhatsApp</h3>
                          <p className="text-sm text-muted-foreground">
                            Quick responses for urgent questions
                          </p>
                        </div>
                      </button>

                      <a
                        href="mailto:support@repostflow.com"
                        className="flex items-start gap-4 w-full text-left p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Email</h3>
                          <p className="text-sm text-muted-foreground">
                            support@repostflow.com
                          </p>
                        </div>
                      </a>

                      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Response Time</h3>
                          <p className="text-sm text-muted-foreground">
                            We typically respond within 24 hours
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>

                {/* FAQ */}
                <AnimatedSection delay={200}>
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        Frequently Asked Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
