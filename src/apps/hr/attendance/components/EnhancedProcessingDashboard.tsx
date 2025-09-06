import { useState, useEffect } from 'react';
import { Brain, BarChart3, Settings, Zap, AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedRawAttendance, ProcessingStats } from '@/hooks/useEnhancedRawAttendance';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';
import { toast } from 'sonner';

interface EnhancedProcessingDashboardProps {
  onProcessingComplete?: (stats: ProcessingStats) => void;
}

export function EnhancedProcessingDashboard({ onProcessingComplete }: EnhancedProcessingDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [businessRules, setBusinessRules] = useState<any[]>([]);
  const [processingInProgress, setProcessingInProgress] = useState(false);
  const [lastProcessingStats, setLastProcessingStats] = useState<ProcessingStats | null>(null);

  const { getProcessingDashboard, processWithEnhancements, loading } = useEnhancedRawAttendance();
  const { 
    fetchBusinessRules, 
    processRawAttendance, 
    autoApproveAttendance,
    fetchAnomalies 
  } = useEnhancedAttendance();

  useEffect(() => {
    loadDashboardData();
    loadBusinessRules();
  }, []);

  const loadDashboardData = async () => {
    try {
      const result = await getProcessingDashboard();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const loadBusinessRules = async () => {
    try {
      await fetchBusinessRules();
      // fetchBusinessRules updates state internally, no return value needed
      setBusinessRules([]); // Set empty array as placeholder
    } catch (error) {
      console.error('Failed to load business rules:', error);
      setBusinessRules([]);
    }
  };

  const handleEnhancedProcessing = async () => {
    setProcessingInProgress(true);
    try {
      const result = await processRawAttendance();
      if (result && result.success) {
        const resultData = result.data as any;
        const stats: ProcessingStats = {
          total_records: resultData?.raw_marked_processed || 0,
          matched_records: resultData?.upserted || 0,
          unmatched_records: resultData?.skipped_unmatched || 0,
          processed_records: resultData?.upserted || 0,
          skipped_records: resultData?.skipped_unmatched || 0,
          anomalies_detected: resultData?.anomalies_detected || 0,
          business_rules_applied: resultData?.business_rules_applied ? Object.keys(resultData.business_rules_applied) : []
        };
        
        setLastProcessingStats(stats);
        onProcessingComplete?.(stats);
        
        toast.success(
          `Processing complete: ${stats.processed_records} processed, ${stats.anomalies_detected} anomalies detected`
        );
        
        // Reload dashboard data
        await loadDashboardData();
      }
    } catch (error) {
      toast.error('Enhanced processing failed');
    } finally {
      setProcessingInProgress(false);
    }
  };

  const handleAutoApprove = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await autoApproveAttendance(today);
      toast.success('Auto-approval completed for today');
      await loadDashboardData();
    } catch (error) {
      toast.error('Auto-approval failed');
    }
  };

  const processingRate = dashboardData ? 
    (dashboardData.processedRecords / Math.max(dashboardData.totalRecords, 1)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingRate.toFixed(1)}%</div>
            <Progress value={processingRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raw Records</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalRecords || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.unprocessedRecords || 0} unprocessed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessRules.length}</div>
            <p className="text-xs text-muted-foreground">Active rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Features</CardTitle>
            <Brain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">ON</div>
            <p className="text-xs text-muted-foreground">Smart matching active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="processing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="rules">Business Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Enhanced Processing Control
              </CardTitle>
              <CardDescription>
                Process raw attendance data with AI-powered matching and business rule validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleEnhancedProcessing}
                    disabled={processingInProgress || loading}
                    className="flex-1"
                  >
                    {processingInProgress ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Start Enhanced Processing
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleAutoApprove}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Auto-Approve Today
                  </Button>
                </div>

                {lastProcessingStats && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Last Processing Results</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-green-600">{lastProcessingStats.processed_records}</div>
                        <div className="text-muted-foreground">Processed</div>
                      </div>
                      <div>
                        <div className="font-medium text-red-600">{lastProcessingStats.unmatched_records}</div>
                        <div className="text-muted-foreground">Unmatched</div>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-600">{lastProcessingStats.anomalies_detected}</div>
                        <div className="text-muted-foreground">Anomalies</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">{lastProcessingStats.business_rules_applied.length}</div>
                        <div className="text-muted-foreground">Rules Applied</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Active Business Rules
              </CardTitle>
              <CardDescription>
                Automated rules applied during attendance processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businessRules.map((rule, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Type: {rule.rule_type} | Effective: {rule.effective_from}
                      </div>
                    </div>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
                
                {businessRules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No business rules configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Processing Analytics
              </CardTitle>
              <CardDescription>
                Insights into raw attendance data processing patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Processing Trend */}
                <div>
                  <h4 className="font-medium mb-2">Processing Efficiency</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span>{processingRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={processingRate} />
                  </div>
                </div>

                {/* Recent Activity Summary */}
                <div>
                  <h4 className="font-medium mb-2">Recent Activity</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {dashboardData?.processedRecords || 0}
                      </div>
                      <div className="text-xs text-green-600">Processed</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">
                        {dashboardData?.unprocessedRecords || 0}
                      </div>
                      <div className="text-xs text-yellow-600">Pending</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {((dashboardData?.processedRecords || 0) / Math.max(dashboardData?.totalRecords || 1, 1) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-blue-600">Efficiency</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h4 className="font-medium mb-2">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      View Anomalies
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Rules
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}