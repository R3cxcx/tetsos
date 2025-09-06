import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface PromotionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  details?: string;
  count?: number;
}

interface PromotionProgressDialogProps {
  open: boolean;
  onClose: () => void;
  steps: PromotionStep[];
  currentStep: number;
  isComplete: boolean;
}

export function PromotionProgressDialog({
  open,
  onClose,
  steps,
  currentStep,
  isComplete
}: PromotionProgressDialogProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
    } else {
      const completedSteps = steps.filter(step => step.status === 'completed').length;
      const newProgress = (completedSteps / steps.length) * 100;
      setProgress(newProgress);
    }
  }, [steps, isComplete]);

  const getStepIcon = (step: PromotionStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const getStepBadge = (step: PromotionStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default">Complete</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Syncing Staged Employees from Raw Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Details */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${
                  index === currentStep ? 'bg-accent border-accent-foreground/20' : 'bg-card'
                }`}
              >
                <div className="mt-0.5">{getStepIcon(step)}</div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{step.name}</h4>
                    {getStepBadge(step)}
                  </div>
                  
                  {step.details && (
                    <p className="text-sm text-muted-foreground">{step.details}</p>
                  )}
                  
                  {step.count !== undefined && (
                    <p className="text-sm font-medium text-primary">
                      {step.count} records
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {isComplete && (
            <div className="mt-6 p-4 bg-accent rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Sync Complete</h4>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                All steps have been processed. You can close this dialog.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}