import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Calendar, User, Filter, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';
import { format } from 'date-fns';

interface AttendanceAnomaliesPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AttendanceAnomaliesPanel({ isOpen = true, onClose }: AttendanceAnomaliesPanelProps) {
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { anomalies, fetchAnomalies, loading } = useEnhancedAttendance();

  useEffect(() => {
    if (isOpen) {
      fetchAnomalies(dateFrom, dateTo);
    }
  }, [isOpen, dateFrom, dateTo, fetchAnomalies]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'excessive_hours':
      case 'insufficient_hours':
        return <Clock className="h-4 w-4" />;
      case 'very_early_arrival':
      case 'very_late_departure':
      case 'extremely_late':
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      excessive_hours: 'Excessive Hours',
      insufficient_hours: 'Insufficient Hours',
      very_early_arrival: 'Very Early Arrival',
      very_late_departure: 'Very Late Departure',
      extremely_late: 'Extremely Late'
    };
    return labels[type] || type.replace('_', ' ').toUpperCase();
  };

  const filteredAnomalies = anomalies.filter(anomaly => {
    const matchesSeverity = severityFilter === 'all' || anomaly.severity === severityFilter;
    const matchesType = typeFilter === 'all' || anomaly.anomaly_type === typeFilter;
    return matchesSeverity && matchesType;
  });

  const uniqueTypes = [...new Set(anomalies.map(a => a.anomaly_type))];

  if (!isOpen) return null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Attendance Anomalies
          </CardTitle>
          <CardDescription>
            System-detected irregularities requiring attention
          </CardDescription>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-from">From Date</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to">To Date</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {filteredAnomalies.filter(a => a.severity === 'high').length}
            </div>
            <div className="text-sm text-red-600">High Priority</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {filteredAnomalies.filter(a => a.severity === 'medium').length}
            </div>
            <div className="text-sm text-orange-600">Medium Priority</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredAnomalies.filter(a => a.severity === 'low').length}
            </div>
            <div className="text-sm text-yellow-600">Low Priority</div>
          </div>
        </div>

        {/* Anomalies List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading anomalies...</p>
            </div>
          ) : filteredAnomalies.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No anomalies detected for the selected criteria</p>
            </div>
          ) : (
            filteredAnomalies.map((anomaly, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${
                      anomaly.severity === 'high' ? 'text-red-500' :
                      anomaly.severity === 'medium' ? 'text-orange-500' :
                      'text-yellow-500'
                    }`}>
                      {getTypeIcon(anomaly.anomaly_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{anomaly.employee_name}</span>
                        <Badge variant={getSeverityColor(anomaly.severity)} className="text-xs">
                          {anomaly.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {getTypeLabel(anomaly.anomaly_type)} • {format(new Date(anomaly.date), 'MMM dd, yyyy')}
                      </div>
                      
                      {/* Anomaly Details */}
                      <div className="text-xs space-y-1">
                        {anomaly.anomaly_details.clock_in && (
                          <div>Clock In: {format(new Date(anomaly.anomaly_details.clock_in), 'HH:mm')}</div>
                        )}
                        {anomaly.anomaly_details.clock_out && (
                          <div>Clock Out: {format(new Date(anomaly.anomaly_details.clock_out), 'HH:mm')}</div>
                        )}
                        {anomaly.anomaly_details.total_hours && (
                          <div>Total Hours: {Number(anomaly.anomaly_details.total_hours).toFixed(2)}h</div>
                        )}
                        {anomaly.anomaly_details.status && (
                          <div>Status: {anomaly.anomaly_details.status}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}