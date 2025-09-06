import { useState, useEffect } from 'react';
import { Clock, MapPin, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';

interface ClockInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClockInOutDialog({ open, onOpenChange }: ClockInOutDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [action, setAction] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { toast } = useToast();
  const { clockInOut, attendanceRecords } = useAttendance();
  const { employees } = useEmployees();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check if employee is already clocked in today
  const isEmployeeClockedIn = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.some(record => 
      record.employee_id === employeeId && 
      record.date === today && 
      record.clock_in && 
      !record.clock_out
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const result = await clockInOut({
        employee_id: selectedEmployeeId,
        action,
        timestamp: currentTime.toISOString(),
        location: location || undefined,
        notes: notes || undefined
      });

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `Employee successfully ${action === 'clock_in' ? 'clocked in' : 'clocked out'}`,
        });
        
        // Reset form
        setSelectedEmployeeId('');
        setLocation('');
        setNotes('');
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const isClockedIn = isEmployeeClockedIn(employeeId);
    setAction(isClockedIn ? 'clock_out' : 'clock_in');
  };

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
  const isClockedIn = selectedEmployeeId ? isEmployeeClockedIn(selectedEmployeeId) : false;

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Clock In/Out
          </CardTitle>
          <CardDescription>
            Record employee attendance for today
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Time Display */}
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentTime.toLocaleDateString()}
              </div>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {employees
                  .filter(emp => emp.status === 'active')
                  .map(employee => {
                    const clockedIn = isEmployeeClockedIn(employee.id);
                    return (
                      <Button
                        key={employee.id}
                        type="button"
                        variant={selectedEmployeeId === employee.id ? "default" : "outline"}
                        className={`h-auto p-3 flex flex-col items-center gap-1 ${
                          clockedIn ? 'border-green-500 bg-green-50' : ''
                        }`}
                        onClick={() => handleEmployeeSelect(employee.id)}
                      >
                         <div className="text-xs font-medium">
                           {employee.english_name}
                         </div>
                        <div className="text-xs text-muted-foreground">
                          {employee.employee_id}
                        </div>
                        {clockedIn && (
                          <Badge variant="secondary" className="text-xs">
                            Clocked In
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
              </div>
            </div>

            {/* Action Display */}
            {selectedEmployee && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {selectedEmployee.english_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedEmployee.employee_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Action: {action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isClockedIn ? 'Currently working' : 'Not clocked in'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="h-4 w-4 inline mr-2" />
                Location (Optional)
              </Label>
              <Input
                id="location"
                placeholder="e.g., Main Office, Remote, Client Site"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                <FileText className="h-4 w-4 inline mr-2" />
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedEmployeeId || loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {action === 'clock_in' ? 'Clock In' : 'Clock Out'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
