import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRecruitment, CreateRecruitmentRequestData } from '@/hooks/useRecruitment';
import { useMasterData } from '@/hooks/useMasterData';
import { useCostCenters } from '@/hooks/useCostCenters';
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
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  position_title: z.string().min(1, 'Position title is required'),
  department: z.string().min(1, 'Department is required'),
  cost_center: z.string().min(1, 'Cost center is required'),
  job_description: z.string().optional(),
  required_qualifications: z.string().optional(),
  preferred_qualifications: z.string().optional(),
  salary_range_min: z.number().optional(),
  salary_range_max: z.number().optional(),
  expected_start_date: z.date().optional(),
  justification: z.string().optional(),
  headcount_increase: z.boolean(),
  replacement_for: z.string().optional(),
});

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRequestDialog({ open, onOpenChange }: CreateRequestDialogProps) {
  const { createRequest } = useRecruitment();
  const { departments, positions, loading: masterDataLoading } = useMasterData();
  const { costCenters, loading: costCentersLoading } = useCostCenters();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPosition, setOpenPosition] = useState(false);
  const [openDepartment, setOpenDepartment] = useState(false);
  const [openCostCenter, setOpenCostCenter] = useState(false);

  const form = useForm<CreateRecruitmentRequestData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position_title: '',
      department: '',
      cost_center: '',
      job_description: '',
      required_qualifications: '',
      preferred_qualifications: '',
      salary_range_min: undefined,
      salary_range_max: undefined,
    expected_start_date: undefined,
      justification: '',
      headcount_increase: false,
      replacement_for: '',
    },
  });

  const onSubmit = async (data: CreateRecruitmentRequestData) => {
    try {
      setIsSubmitting(true);
      
      // Format the data for submission
      const submissionData = {
        ...data,
        expected_start_date: data.expected_start_date ? format(data.expected_start_date, 'yyyy-MM-dd') : undefined,
      };

      await createRequest(submissionData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recruitment Request</DialogTitle>
          <DialogDescription>
            Submit a new hiring request. This will be routed to the hiring manager for approval.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Title *</FormLabel>
                    <Popover open={openPosition} onOpenChange={setOpenPosition}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openPosition}
                            className="w-full justify-between bg-background"
                          >
                            {field.value
                              ? positions.find((position) => position.title === field.value)?.title
                              : "Select a position"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search positions..." />
                          <CommandList>
                            <CommandEmpty>No position found.</CommandEmpty>
                            <CommandGroup>
                              {positions.map((position) => (
                                <CommandItem
                                  key={position.id}
                                  value={position.title}
                                  onSelect={(currentValue) => {
                                    field.onChange(currentValue === field.value ? "" : currentValue);
                                    setOpenPosition(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === position.title ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {position.title}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openDepartment}
                            className="w-full justify-between bg-background"
                          >
                            {field.value
                              ? departments.find((department) => department.name === field.value)?.name
                              : "Select a department"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search departments..." />
                          <CommandList>
                            <CommandEmpty>No department found.</CommandEmpty>
                            <CommandGroup>
                              {departments.map((department) => (
                                <CommandItem
                                  key={department.id}
                                  value={department.name}
                                  onSelect={(currentValue) => {
                                    field.onChange(currentValue === field.value ? "" : currentValue);
                                    setOpenDepartment(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === department.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {department.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_center"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Center *</FormLabel>
                    <Popover open={openCostCenter} onOpenChange={setOpenCostCenter}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCostCenter}
                            className="w-full justify-between bg-background"
                          >
                            {field.value
                              ? costCenters.find((cc) => cc.code === field.value)?.code + " - " + costCenters.find((cc) => cc.code === field.value)?.name
                              : "Select a cost center"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search cost centers..." />
                          <CommandList>
                            <CommandEmpty>No cost center found.</CommandEmpty>
                            <CommandGroup>
                              {costCenters.map((costCenter) => (
                                <CommandItem
                                  key={costCenter.id}
                                  value={`${costCenter.code} - ${costCenter.name}`}
                                  onSelect={(currentValue) => {
                                    const selected = costCenters.find(cc => `${cc.code} - ${cc.name}` === currentValue);
                                    field.onChange(selected ? selected.code : "");
                                    setOpenCostCenter(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === costCenter.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {costCenter.code} - {costCenter.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Start Date</FormLabel>
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
                              <span>Pick a date</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salary_range_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Range - Minimum</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 50000" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salary_range_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Range - Maximum</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 80000" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="job_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the role, responsibilities, and requirements..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required_qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Qualifications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List the essential qualifications and experience required..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Qualifications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List the nice-to-have qualifications..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Justification</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explain why this position is needed..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headcount_increase"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Headcount Increase
                    </FormLabel>
                    <FormDescription>
                      Is this a new position (headcount increase) or replacement?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!form.watch('headcount_increase') && (
              <FormField
                control={form.control}
                name="replacement_for"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Replacement For</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Name of person being replaced"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      If this is a replacement position, specify who is being replaced.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || masterDataLoading || costCentersLoading}>
                {isSubmitting ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}