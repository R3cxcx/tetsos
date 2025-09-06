import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateTerminal } from '@/hooks/useTerminals';

const formSchema = z.object({
  terminal_uid: z.string().min(1, 'Terminal UID is required'),
  terminal_name: z.string().min(1, 'Terminal name is required'),
  location: z.string().optional(),
  site_admin_name: z.string().optional(),
  connection_method: z.enum(['ethernet', 'wifi', 'usb', 'serial']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTerminalDialog({ open, onOpenChange }: CreateTerminalDialogProps) {
  const createTerminal = useCreateTerminal();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      terminal_uid: '',
      terminal_name: '',
      location: '',
      site_admin_name: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createTerminal.mutateAsync({
        terminal_uid: data.terminal_uid,
        terminal_name: data.terminal_name,
        location: data.location,
        site_admin_name: data.site_admin_name,
        connection_method: data.connection_method,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Terminal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="terminal_uid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terminal UID *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TERM001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terminal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terminal Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Entrance Terminal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Building, Floor 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_admin_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Admin Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connection_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connection method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ethernet">Ethernet</SelectItem>
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="serial">Serial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTerminal.isPending}>
                {createTerminal.isPending ? 'Creating...' : 'Create Terminal'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}