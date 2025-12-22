import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TourStep } from '@/hooks/useOnboardingTour';

interface OnboardingTourProps {
  isActive: boolean;
  currentStep: TourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

const OnboardingTour = ({
  isActive,
  currentStep,
  stepNumber,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: OnboardingTourProps) => {
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find and position the tooltip relative to the target element
  useEffect(() => {
    if (!isActive || !currentStep.target) {
      setTargetPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(currentStep.target!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep]);

  // Calculate tooltip position based on target and placement
  useEffect(() => {
    if (!targetPosition || !tooltipRef.current) {
      // Center the tooltip if no target
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 16;

    let style: React.CSSProperties = {};

    switch (currentStep.placement) {
      case 'right':
        style = {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left + targetPosition.width + padding,
          transform: 'translateY(-50%)',
        };
        break;
      case 'left':
        style = {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left - tooltipRect.width - padding,
          transform: 'translateY(-50%)',
        };
        break;
      case 'bottom':
        style = {
          top: targetPosition.top + targetPosition.height + padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translateX(-50%)',
        };
        break;
      case 'top':
        style = {
          top: targetPosition.top - tooltipRect.height - padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translateX(-50%)',
        };
        break;
      default:
        style = {
          top: targetPosition.top + targetPosition.height + padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translateX(-50%)',
        };
    }

    setTooltipStyle(style);
  }, [targetPosition, currentStep.placement]);

  if (!isActive) return null;

  const isFirstStep = stepNumber === 0;
  const isLastStep = stepNumber === totalSteps - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onSkip}
      />

      {/* Spotlight cutout for target element */}
      {targetPosition && (
        <div
          className="absolute rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-background pointer-events-none animate-in zoom-in-95 duration-300"
          style={{
            top: targetPosition.top - 4,
            left: targetPosition.left - 4,
            width: targetPosition.width + 8,
            height: targetPosition.height + 8,
            boxShadow: '0 0 0 9999px hsl(var(--background) / 0.8)',
          }}
        />
      )}

      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className={cn(
          'absolute w-80 shadow-2xl border-primary/20 animate-in slide-in-from-bottom-4 duration-300',
          !targetPosition && 'max-w-md'
        )}
        style={tooltipStyle}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isFirstStep && <Sparkles className="h-5 w-5 text-primary" />}
              {currentStep.title}
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === stepNumber ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={onPrev}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={onNext}>
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
};

export default OnboardingTour;
