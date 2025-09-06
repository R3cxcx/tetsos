import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RefreshCw, CheckCircle, AlertCircle, Clock, Users, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';
import { useRawAttendance } from '@/hooks/useRawAttendance';
import { useToast } from '@/hooks/use-toast';

interface ProcessingResult {
  success: boolean;
  upserted: number;
  raw_marked_processed: number;
  skipped_unmatched: number;
  anomalies_detected: number;
  business_rules_applied?: any;
}

export function ProcessingDashboard() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null);

  const { processRawAttendance, autoApproveAttendance } = useEnhancedAttendance();
  const { fetchRawData } = useRawAttendance();
  const { toast } = useToast();

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const result = await processRawAttendance(dateFrom || undefined, dateTo || undefined, true, autoApprove);
      
      if (result.success && result.data) {
        setLastResult(result.data as unknown as ProcessingResult);
        toast({
          title: 'Processing Complete',
          description: `Processed ${(result.data as unknown as ProcessingResult).upserted} attendance records successfully.`,
        });
      } else {
        toast({
          title: 'Processing Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Processing Error',
        description: 'An unexpected error occurred during processing.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoApprove = async () => {
    try {
      const result = await autoApproveAttendance();
      
      if (result.success && result.data) {
        toast({
          title: 'Auto-Approval Complete',
          description: `${(result.data as any).auto_approved_count} records auto-approved.`,
        });
      } else {
        toast({
          title: 'Auto-Approval Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Auto-Approval Error',
        description: 'An unexpected error occurred during auto-approval.',
        variant: 'destructive',
      });
    }
  };

  const handleReviewAndConfirm = () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: 'Date Range Required',
        description: 'Please select both from and to dates for review',
        variant: 'destructive'
      });
      return;
    }

    // Navigate to review page with date parameters
    navigate(`/hr/attendance/review?dateFrom=${dateFrom}&dateTo=${dateTo}`);
  };

  return (
    <div className="space-y-6">
      {/* Processing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Raw Data Processing
          </CardTitle>
          <CardDescription>
            Process raw attendance data and apply business rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date (Optional)</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date (Optional)</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Processing Options</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-approve"
                  checked={autoApprove}
                  onCheckedChange={setAutoApprove}
                />
                <Label htmlFor="auto-approve">Auto-approve normal records</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={handleReviewAndConfirm} 
              disabled={!dateFrom || !dateTo}
              className="flex items-center gap-2"
              variant="default"
            >
              <Eye className="h-4 w-4" />
              Review & Confirm
            </Button>
            <Button 
              onClick={handleProcess} 
              disabled={processing}
              className="flex items-center gap-2"
              variant="outline"
            >
              {processing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {processing ? 'Processing...' : 'Process Directly'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAutoApprove}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Auto-Approve Today
            </Button>
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing raw attendance data...</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {lastResult.upserted}
                </div>
                <div className="text-sm text-green-600">Records Processed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {lastResult.raw_marked_processed}
                </div>
                <div className="text-sm text-blue-600">Raw Records Marked</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {lastResult.anomalies_detected}
                </div>
                <div className="text-sm text-orange-600">Anomalies Detected</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {lastResult.skipped_unmatched}
                </div>
                <div className="text-sm text-red-600">Unmatched Records</div>
              </div>
            </div>

            {lastResult.business_rules_applied && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Business Rules Applied:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(lastResult.business_rules_applied).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key.replace('_', ' ')}:</span>
                      <span>{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">Real-time</div>
                <div className="text-sm text-muted-foreground">Processing Status</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">Automated</div>
                <div className="text-sm text-muted-foreground">Business Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">Enhanced</div>
                <div className="text-sm text-muted-foreground">Analytics</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}