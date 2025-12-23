import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/dashboard/Dashboard";
import YouTubeChannels from "./pages/dashboard/YouTubeChannels";
import TikTokAccounts from "./pages/dashboard/TikTokAccounts";
import VideoQueue from "./pages/dashboard/VideoQueue";
import UploadHistory from "./pages/dashboard/UploadHistory";
import UploadAnalytics from "./pages/dashboard/UploadAnalytics";
import Analytics from "./pages/dashboard/Analytics";
import Settings from "./pages/dashboard/Settings";
import CronMonitor from "./pages/dashboard/CronMonitor";
import UserManagement from "./pages/dashboard/UserManagement";
import ProtectedRoute from "@/components/ProtectedRoute";
import CommandPalette from "@/components/dashboard/CommandPalette";
import KeyboardShortcutsHelp from "@/components/dashboard/KeyboardShortcutsHelp";
import KeyboardShortcutIndicator from "@/components/dashboard/KeyboardShortcutIndicator";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
      <KeyboardShortcutIndicator isVisible={waitingForSecondKey} />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<Auth />} />
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
