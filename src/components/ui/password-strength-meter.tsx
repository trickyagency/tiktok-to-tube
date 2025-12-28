import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

const calculateStrength = (password: string): StrengthResult => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let level: StrengthLevel = 'weak';
  if (score >= 5) level = 'strong';
  else if (score >= 4) level = 'good';
  else if (score >= 3) level = 'fair';

  return { level, score, checks };
};

const strengthConfig: Record<StrengthLevel, { label: string; color: string; bgColor: string; segments: number }> = {
  weak: { label: 'Weak', color: 'bg-red-500', bgColor: 'text-red-500', segments: 1 },
  fair: { label: 'Fair', color: 'bg-orange-500', bgColor: 'text-orange-500', segments: 2 },
  good: { label: 'Good', color: 'bg-yellow-500', bgColor: 'text-yellow-500', segments: 3 },
  strong: { label: 'Strong', color: 'bg-green-500', bgColor: 'text-green-500', segments: 4 },
};

const requirements = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'lowercase', label: 'Lowercase letter' },
  { key: 'uppercase', label: 'Uppercase letter' },
  { key: 'number', label: 'Number' },
  { key: 'special', label: 'Special character' },
] as const;

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);
  const config = strengthConfig[strength.level];

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                segment <= config.segments ? config.color : 'bg-muted'
              )}
            />
          ))}
        </div>
        <p className={cn('text-xs font-medium', config.bgColor)}>
          {config.label}
        </p>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {requirements.map(({ key, label }) => {
            const met = strength.checks[key];
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                {met ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={cn(met ? 'text-foreground' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
