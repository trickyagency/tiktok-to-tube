import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RepostFlow!',
    description: 'Let us show you around. This quick tour will help you get started with automating your TikTok to YouTube workflow.',
  },
  {
    id: 'sidebar',
    title: 'Navigation',
    description: 'Use the sidebar to navigate between different sections of the dashboard.',
    target: '[data-tour="sidebar"]',
    placement: 'right',
  },
  {
    id: 'youtube',
    title: 'Connect YouTube',
    description: 'Add your YouTube channels to start uploading videos automatically.',
    target: '[data-tour="youtube-link"]',
    placement: 'right',
  },
  {
    id: 'tiktok',
    title: 'Add TikTok Accounts',
    description: 'Monitor TikTok creators to automatically scrape their videos.',
    target: '[data-tour="tiktok-link"]',
    placement: 'right',
  },
  {
    id: 'queue',
    title: 'Video Queue',
    description: 'View and manage your scheduled uploads in the queue.',
    target: '[data-tour="queue-link"]',
    placement: 'right',
  },
  {
    id: 'command-palette',
    title: 'Quick Navigation',
    description: 'Press ⌘K (or Ctrl+K) anytime to open the command palette for quick navigation and actions.',
    target: '[data-tour="search-button"]',
    placement: 'bottom',
  },
];

const TOUR_STORAGE_KEY = 'onboarding-tour-completed';

export const useOnboardingTour = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(true); // Start as true to prevent flash

  // Check if tour was completed on mount
  useEffect(() => {
    if (!user) return;
    
    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`;
    const completed = localStorage.getItem(storageKey) === 'true';
    setHasCompleted(completed);
    
    // Auto-start tour for new users after a short delay
    if (!completed) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, []);

  const completeTour = useCallback(() => {
    if (!user) return;
    
    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`;
    localStorage.setItem(storageKey, 'true');
    setHasCompleted(true);
    setIsActive(false);
    setCurrentStep(0);
  }, [user]);

  const resetTour = useCallback(() => {
    if (!user) return;
    
    const storageKey = `${TOUR_STORAGE_KEY}-${user.id}`;
    localStorage.removeItem(storageKey);
    setHasCompleted(false);
    setCurrentStep(0);
  }, [user]);

  return {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    currentTourStep: TOUR_STEPS[currentStep],
    hasCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    resetTour,
  };
};
