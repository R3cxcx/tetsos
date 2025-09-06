import { useState, useEffect } from 'react';
import { MapPin, Plus, X, Search, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRawAttendance } from '@/hooks/useRawAttendance';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserIdMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserIdMapping {
  id?: string;
  user_id: string;
  employee_id: string;
  employee_name?: string;
}

interface Employee {
  employee_id: string;
  english_name: string;
  position?: string;
  department?: string;
}

export function UserIdMappingDialog({ open, onOpenChange }: UserIdMappingDialogProps) {
  const [mappings, setMappings] = useState<UserIdMapping[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMapping, setNewMapping] = useState<UserIdMapping>({
    user_id: '',
    employee_id: ''
  });

  const { toast } = useToast();
  const { fetchUserIdMappings, addUserIdMapping, deleteUserIdMapping } = useRawAttendance();

  useEffect(() => {
    if (open) {
      fetchMappings();
      fetchEmployees();
    }
  }, [open]);

  const fetchMappings = async () => {
    try {
      const { data, error } = await fetchUserIdMappings();

      if (error) throw new Error(error);

      if (data) {
        setMappings(data);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user ID mappings",
        variant: "destructive"
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      // Import supabase client inline
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('employees')
        .select('employee_id, english_name, position')
        .eq('status', 'active')
        .order('english_name');

      if (error) throw error;

      if (data) {
        setEmployees(data.map(emp => ({
          employee_id: emp.employee_id,
          english_name: emp.english_name,
          position: emp.position,
          department: undefined // Removed department lookup for now
        })));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
    }
  };

  const handleAddMapping = async () => {
    if (!newMapping.user_id || !newMapping.employee_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in both User ID and Employee ID",
        variant: "destructive"
      });
      return;
    }

    // Check if user_id already exists
    if (mappings.find(m => m.user_id === newMapping.user_id)) {
      toast({
        title: "Duplicate User ID",
        description: "This User ID is already mapped to an employee",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await addUserIdMapping({
        user_id: newMapping.user_id,
        employee_id: newMapping.employee_id
      });

      if (error) throw new Error(error);

      toast({
        title: "Success",
        description: "User ID mapping added successfully",
      });

      setNewMapping({ user_id: '', employee_id: '' });
      fetchMappings();
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast({
        title: "Error",
        description: "Failed to add user ID mapping",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    setLoading(true);
    try {
      const { error } = await deleteUserIdMapping(mappingId);

      if (error) throw new Error(error);

      toast({
        title: "Success",
        description: "User ID mapping deleted successfully",
      });

      fetchMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: "Error",
        description: "Failed to delete user ID mapping",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.english_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mapping.employee_name && mapping.employee_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">User ID Mapping Management</h2>
            <p className="text-sm text-muted-foreground">
              Map fingerprint device User IDs to employee IDs for attendance processing
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Mapping Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Mapping
              </CardTitle>
              <CardDescription>
                Create a new mapping between a fingerprint device User ID and an employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-id">Fingerprint Device User ID</Label>
                  <Input
                    id="user-id"
                    placeholder="Enter User ID from device"
                    value={newMapping.user_id}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, user_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-id">Employee ID</Label>
                  <Select
                    value={newMapping.employee_id}
                    onValueChange={(value) => setNewMapping(prev => ({ ...prev, employee_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_id} - {emp.english_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleAddMapping}
                disabled={loading || !newMapping.user_id || !newMapping.employee_id}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </CardContent>
          </Card>

          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Mappings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by User ID, Employee ID, or Employee Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </CardContent>
          </Card>

          {/* Current Mappings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Current Mappings
              </CardTitle>
              <CardDescription>
                {filteredMappings.length} mapping{filteredMappings.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No mappings found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {mapping.user_id}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="font-mono">
                            {mapping.employee_id}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mapping.employee_name}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => mapping.id && handleDeleteMapping(mapping.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee List Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Available Employees
              </CardTitle>
              <CardDescription>
                {filteredEmployees.length} active employee{filteredEmployees.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.employee_id}
                    className={`p-3 rounded-lg border ${
                      mappings.find(m => m.employee_id === emp.employee_id)
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{emp.employee_id}</span>
                      {mappings.find(m => m.employee_id === emp.employee_id) && (
                        <UserCheck className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    <div className="text-sm font-medium">{emp.english_name}</div>
                    {emp.position && (
                      <div className="text-xs text-muted-foreground">{emp.position}</div>
                    )}
                    {emp.department && (
                      <div className="text-xs text-muted-foreground">{emp.department}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
