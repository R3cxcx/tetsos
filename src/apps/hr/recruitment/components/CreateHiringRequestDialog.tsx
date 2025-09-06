import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useHiringRequests, type CreateHiringRequestData } from '@/hooks/useHiringRequests';
import { useToast } from '@/hooks/use-toast';

interface CreateHiringRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruitmentRequestId: string;
  candidate: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
  };
  recruitmentManagers: Array<{
    user_id: string;
    name: string;
    email: string;
  }>;
  onSuccess: () => void;
}

export default function CreateHiringRequestDialog({
  open,
  onOpenChange,
  recruitmentRequestId,
  candidate,
  recruitmentManagers,
  onSuccess
}: CreateHiringRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposedSalary, setProposedSalary] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState<Date>();
  const [justification, setJustification] = useState('');
  const [contractDetails, setContractDetails] = useState('');
  const [recruitmentManagerId, setRecruitmentManagerId] = useState('');

  const { createHiringRequest } = useHiringRequests();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!proposedSalary) {
      toast({
        title: "Error",
        description: "Please enter a proposed salary",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData: CreateHiringRequestData = {
        recruitment_request_id: recruitmentRequestId,
        candidate_id: candidate.id,
        proposed_salary: parseFloat(proposedSalary),
        proposed_start_date: proposedStartDate?.toISOString().split('T')[0],
        justification: justification || undefined,
        contract_details: contractDetails || undefined,
        recruitment_manager_id: recruitmentManagerId || undefined
      };

      await createHiringRequest(requestData);

      toast({
        title: "Success",
        description: `Hiring request created for ${candidate.full_name}`,
      });

      // Reset form
      setProposedSalary('');
      setProposedStartDate(undefined);
      setJustification('');
      setContractDetails('');
      setRecruitmentManagerId('');

      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      console.error('Error creating hiring request:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create hiring request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Create Hiring Request
          </DialogTitle>
          <DialogDescription>
            Create a hiring request for <strong>{candidate.full_name}</strong> with proposed salary and terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Candidate Information</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Name:</strong> {candidate.full_name}
            </p>
            {candidate.email && (
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> {candidate.email}
              </p>
            )}
            {candidate.phone && (
              <p className="text-sm text-muted-foreground">
                <strong>Phone:</strong> {candidate.phone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proposed Salary */}
            <div>
              <Label htmlFor="proposedSalary" className="font-medium">
                Proposed Salary *
              </Label>
              <Input
                id="proposedSalary"
                type="number"
                value={proposedSalary}
                onChange={(e) => setProposedSalary(e.target.value)}
                placeholder="e.g., 75000"
                className="mt-1"
              />
            </div>

            {/* Proposed Start Date */}
            <div>
              <Label className="font-medium">Proposed Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !proposedStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {proposedStartDate ? format(proposedStartDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={proposedStartDate}
                    onSelect={setProposedStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Recruitment Manager */}
          <div>
            <Label className="font-medium">Assign Recruitment Manager</Label>
            <Select value={recruitmentManagerId} onValueChange={setRecruitmentManagerId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select recruitment manager (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">No manager assigned</SelectItem>
                {recruitmentManagers.map(manager => (
                  <SelectItem key={manager.user_id} value={manager.user_id}>
                    {manager.name} {manager.email && `(${manager.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div>
            <Label htmlFor="justification" className="font-medium">
              Justification
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this candidate should be hired and at this salary..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Contract Details */}
          <div>
            <Label htmlFor="contractDetails" className="font-medium">
              Contract Details
            </Label>
            <Textarea
              id="contractDetails"
              value={contractDetails}
              onChange={(e) => setContractDetails(e.target.value)}
              placeholder="Specific contract terms, benefits, conditions..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !proposedSalary}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Hiring Request'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}