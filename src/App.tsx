import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";

// Eagerly load landing page for fast initial render
import LandingPage from "./pages/LandingPage";

// Lazy load all other pages
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const YouTubeOAuthProxy = lazy(() => import("./pages/YouTubeOAuthProxy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));

// Lazy load all dashboard pages
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const YouTubeChannels = lazy(() => import("./pages/dashboard/YouTubeChannels"));
const TikTokAccounts = lazy(() => import("./pages/dashboard/TikTokAccounts"));
const VideoQueue = lazy(() => import("./pages/dashboard/VideoQueue"));
const Schedules = lazy(() => import("./pages/dashboard/Schedules"));
const UploadHistory = lazy(() => import("./pages/dashboard/UploadHistory"));
const UploadAnalytics = lazy(() => import("./pages/dashboard/UploadAnalytics"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const CronMonitor = lazy(() => import("./pages/dashboard/CronMonitor"));
const UserManagement = lazy(() => import("./pages/dashboard/UserManagement"));
const SubscriptionManagement = lazy(() => import("./pages/dashboard/SubscriptionManagement"));
const MySubscriptions = lazy(() => import("./pages/dashboard/MySubscriptions"));
const UpgradePlans = lazy(() => import("./pages/dashboard/UpgradePlans"));

import ProtectedRoute from "@/components/ProtectedRoute";
import CommandPalette from "@/components/dashboard/CommandPalette";
import KeyboardShortcutsHelp from "@/components/dashboard/KeyboardShortcutsHelp";
import KeyboardShortcutIndicator from "@/components/dashboard/KeyboardShortcutIndicator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { PWAInstallPrompt, PWAUpdatePrompt, OfflineIndicator } from "@/components/pwa";
import { ScrollToTop } from "@/components/ScrollToTop";

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const AppContent = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  // Handle Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle vim-style keyboard shortcuts (G+key navigation)
  const { waitingForSecondKey } = useKeyboardShortcuts({
    onOpenShortcutsHelp: () => setShortcutsHelpOpen(true),
    onNavigate: (label) => {
      toast(`Navigated to ${label}`, {
        duration: 2000,
      });
    },
  });

  return (
    <>
      <ScrollToTop />
      <OfflineIndicator />
      <PWAUpdatePrompt />
      <PWAInstallPrompt />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
      <KeyboardShortcutIndicator isVisible={waitingForSecondKey} />
      <Toaster />
      <Sonner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/functions/v1/youtube-oauth" element={<YouTubeOAuthProxy />} />
          <Route path="/functions/v1/youtube-oauth/*" element={<YouTubeOAuthProxy />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/youtube"
            element={
              <ProtectedRoute>
                <YouTubeChannels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tiktok"
            element={
              <ProtectedRoute>
                <TikTokAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/queue"
            element={
              <ProtectedRoute>
                <VideoQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/schedules"
            element={
              <ProtectedRoute>
                <Schedules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <ProtectedRoute>
                <UploadHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/upload-analytics"
            element={
              <ProtectedRoute>
                <UploadAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/cron"
            element={
              <ProtectedRoute>
                <CronMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subscriptions"
            element={
              <ProtectedRoute>
                <SubscriptionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/my-subscriptions"
            element={
              <ProtectedRoute>
                <MySubscriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/upgrade"
            element={
              <ProtectedRoute>
                <UpgradePlans />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
