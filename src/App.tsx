import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import LandingPage from "./pages/LandingPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Dashboard from "./pages/dashboard/Dashboard";
import YouTubeChannels from "./pages/dashboard/YouTubeChannels";
import TikTokAccounts from "./pages/dashboard/TikTokAccounts";
import VideoQueue from "./pages/dashboard/VideoQueue";
import Schedules from "./pages/dashboard/Schedules";
import UploadHistory from "./pages/dashboard/UploadHistory";
import UploadAnalytics from "./pages/dashboard/UploadAnalytics";
import Analytics from "./pages/dashboard/Analytics";
import Settings from "./pages/dashboard/Settings";
import CronMonitor from "./pages/dashboard/CronMonitor";
import UserManagement from "./pages/dashboard/UserManagement";
import SubscriptionManagement from "./pages/dashboard/SubscriptionManagement";
import MySubscriptions from "./pages/dashboard/MySubscriptions";
import UpgradePlans from "./pages/dashboard/UpgradePlans";
import ProtectedRoute from "@/components/ProtectedRoute";
import CommandPalette from "@/components/dashboard/CommandPalette";
import KeyboardShortcutsHelp from "@/components/dashboard/KeyboardShortcutsHelp";
import KeyboardShortcutIndicator from "@/components/dashboard/KeyboardShortcutIndicator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { PWAInstallPrompt, PWAUpdatePrompt, OfflineIndicator } from "@/components/pwa";

const queryClient = new QueryClient();

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
      <OfflineIndicator />
      <PWAUpdatePrompt />
      <PWAInstallPrompt />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
      <KeyboardShortcutIndicator isVisible={waitingForSecondKey} />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
