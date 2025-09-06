import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRecruitment, CreateInterviewAssessmentData, RecruitmentRequest } from '@/hooks/useRecruitment';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  candidate_name: z.string().min(1, 'Candidate name is required'),
  candidate_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  candidate_phone: z.string().optional(),
  interview_date: z.date().optional(),
  technical_skills_score: z.number().min(1).max(10).optional(),
  communication_score: z.number().min(1).max(10).optional(),
  experience_score: z.number().min(1).max(10).optional(),
  cultural_fit_score: z.number().min(1).max(10).optional(),
  overall_score: z.number().min(1).max(10).optional(),
  technical_notes: z.string().optional(),
  communication_notes: z.string().optional(),
  experience_notes: z.string().optional(),
  cultural_fit_notes: z.string().optional(),
  additional_comments: z.string().optional(),
  recommendation: z.enum(['strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_reject']).optional(),
});

interface InterviewAssessmentDialogProps {
  request: RecruitmentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const recommendationOptions = [
  { value: 'strongly_recommend', label: 'Strongly Recommend' },
  { value: 'recommend', label: 'Recommend' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'not_recommend', label: 'Do Not Recommend' },
  { value: 'strongly_reject', label: 'Strongly Reject' },
];

export function InterviewAssessmentDialog({ 
  request, 
  open, 
  onOpenChange 
}: InterviewAssessmentDialogProps) {
  const { createAssessment } = useRecruitment();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateInterviewAssessmentData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recruitment_request_id: request.id,
      candidate_name: '',
      candidate_email: '',
      candidate_phone: '',
      interview_date: undefined,
      technical_skills_score: 5,
      communication_score: 5,
      experience_score: 5,
      cultural_fit_score: 5,
      overall_score: 5,
      technical_notes: '',
      communication_notes: '',
      experience_notes: '',
      cultural_fit_notes: '',
      additional_comments: '',
      recommendation: undefined,
    },
  });

  // Calculate overall score automatically
  const scores = form.watch(['technical_skills_score', 'communication_score', 'experience_score', 'cultural_fit_score']);
  
  useEffect(() => {
    const validScores = scores.filter((score): score is number => typeof score === 'number' && score > 0);
    if (validScores.length > 0) {
      const average = Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
      form.setValue('overall_score', average);
    }
  }, [scores, form]);

  const onSubmit = async (data: CreateInterviewAssessmentData) => {
    try {
      setIsSubmitting(true);
      
      // Format the data for submission
      const submissionData = {
        ...data,
        recruitment_request_id: request.id,
        interview_date: data.interview_date ? format(data.interview_date, 'yyyy-MM-dd') : undefined,
        candidate_email: data.candidate_email || undefined,
      };

      await createAssessment(submissionData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ScoreSlider = ({ label, field, notes }: { 
    label: string; 
    field: { name: string }; 
    notes: { name: string };
  }) => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name={field.name as keyof CreateInterviewAssessmentData}
        render={({ field: sliderField }) => (
          <FormItem>
            <FormLabel className="flex justify-between">
              {label}
              <span className="text-sm font-normal">
                Score: {sliderField.value}/10
              </span>
            </FormLabel>
            <FormControl>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[Number(sliderField.value) || 5]}
                onValueChange={(value) => sliderField.onChange(value[0])}
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name={notes.name as keyof CreateInterviewAssessmentData}
        render={({ field: notesField }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea 
                placeholder={`Notes about ${label.toLowerCase()}...`}
                {...notesField} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Assessment</DialogTitle>
          <DialogDescription>
            Create an interview assessment for: {request.position_title}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Candidate Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Candidate Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="candidate_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Candidate Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="candidate_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="candidate_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +1 234 567 8900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interview_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interview Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick interview date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Assessment Scores */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Assessment Scores</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ScoreSlider 
                  label="Technical Skills" 
                  field={{ name: 'technical_skills_score' }}
                  notes={{ name: 'technical_notes' }}
                />
                
                <ScoreSlider 
                  label="Communication" 
                  field={{ name: 'communication_score' }}
                  notes={{ name: 'communication_notes' }}
                />
                
                <ScoreSlider 
                  label="Experience" 
                  field={{ name: 'experience_score' }}
                  notes={{ name: 'experience_notes' }}
                />
                
                <ScoreSlider 
                  label="Cultural Fit" 
                  field={{ name: 'cultural_fit_score' }}
                  notes={{ name: 'cultural_fit_notes' }}
                />
              </div>

              <div className="space-y-2">
                <FormLabel className="flex justify-between">
                  Overall Score (Calculated)
                  <span className="text-sm font-normal">
                    Score: {form.watch('overall_score') || 5}/10
                  </span>
                </FormLabel>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Automatically calculated as the average of all assessment scores
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommendation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your recommendation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recommendationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additional_comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Comments</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional comments or observations..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Assessment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}