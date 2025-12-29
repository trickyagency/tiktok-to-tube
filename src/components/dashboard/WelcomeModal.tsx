import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Youtube, Video, Calendar, BarChart3 } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: Youtube,
    title: 'Connect YouTube',
    description: 'Link your YouTube channels for automatic uploads',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Video,
    title: 'Monitor TikTok',
    description: "Track any creator's content automatically",
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Set up automated publishing schedules',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track your upload performance and growth',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <span className="text-2xl">🚀</span>
          </div>
          <DialogTitle className="text-xl">Welcome to RepostFlow!</DialogTitle>
          <DialogDescription className="text-base">
            Let's get your content automation set up.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${feature.bgColor} flex items-center justify-center mb-2`}>
                <feature.icon className={`h-4 w-4 ${feature.color}`} />
              </div>
              <h4 className="font-medium text-sm">{feature.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
            </div>
          ))}
        </div>

        <Button onClick={onClose} className="w-full">
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
