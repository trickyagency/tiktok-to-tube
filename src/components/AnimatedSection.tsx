import { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fade-up' | 'fade-in' | 'scale-in';
}

export const AnimatedSection = ({ 
  children, 
  className = '', 
  delay = 0,
  animation = 'fade-up'
}: AnimatedSectionProps) => {
  const { ref, isInView } = useScrollAnimation();

  const baseStyles = 'transition-all duration-700 ease-out';
  
  const animationStyles = {
    'fade-up': {
      hidden: 'opacity-0 translate-y-8',
      visible: 'opacity-100 translate-y-0'
    },
    'fade-in': {
      hidden: 'opacity-0',
      visible: 'opacity-100'
    },
    'scale-in': {
      hidden: 'opacity-0 scale-95',
      visible: 'opacity-100 scale-100'
    }
  };

  const styles = animationStyles[animation];

  return (
    <div
      ref={ref}
      className={`${baseStyles} ${isInView ? styles.visible : styles.hidden} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
