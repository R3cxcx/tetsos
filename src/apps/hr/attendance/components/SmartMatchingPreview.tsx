import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Users, TrendingUp, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEnhancedRawAttendance, EmployeeMatchResult, EnhancedRawAttendanceRecord } from '@/hooks/useEnhancedRawAttendance';
import { toast } from 'sonner';

interface SmartMatchingPreviewProps {
  records: EnhancedRawAttendanceRecord[];
  onMatchingComplete: (results: EmployeeMatchResult[]) => void;
}

export function SmartMatchingPreview({ records, onMatchingComplete }: SmartMatchingPreviewProps) {
  const [matchResults, setMatchResults] = useState<EmployeeMatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const { performSmartMatching, autoRegisterEmployees, loading } = useEnhancedRawAttendance();

  const runMatching = async () => {
    setIsMatching(true);
    try {
      const results = await performSmartMatching(records);
      setMatchResults(results);
      onMatchingComplete(results);
      
      toast.success(`Matching completed: ${results.filter(r => r.matched_employee).length}/${results.length} matched`);
    } catch (error) {
      console.error('Matching failed:', error);
      toast.error('Smart matching failed');
    } finally {
      setIsMatching(false);
    }
  };

  useEffect(() => {
    if (records.length > 0) {
      runMatching();
    }
  }, [records]);

  const exactMatches = matchResults.filter(r => r.match_confidence === 'exact').length;
  const normalizedMatches = matchResults.filter(r => r.match_confidence === 'normalized').length;
  const fuzzyMatches = matchResults.filter(r => r.match_confidence === 'fuzzy').length;
  const noMatches = matchResults.filter(r => r.match_confidence === 'none').length;
  const totalMatches = exactMatches + normalizedMatches + fuzzyMatches;
  const matchRate = records.length > 0 ? (totalMatches / records.length) * 100 : 0;

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'exact':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Exact Match</Badge>;
      case 'normalized':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Normalized</Badge>;
      case 'fuzzy':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Fuzzy Match</Badge>;
      default:
        return <Badge variant="destructive">No Match</Badge>;
    }
  };

  const handleAutoRegister = async () => {
    const unmatchedResults = matchResults.filter(r => r.match_confidence === 'none');
    if (unmatchedResults.length === 0) {
      toast.info('No unmatched records to register');
      return;
    }

    try {
      const result = await autoRegisterEmployees(unmatchedResults);
      if (result.success) {
        toast.success(`Auto-registered ${result.created} employees`);
        // Re-run matching after registration
        runMatching();
      } else {
        toast.error(`Auto-registration failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Auto-registration failed');
    }
  };

  if (isMatching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Smart Matching in Progress
          </CardTitle>
          <CardDescription>
            Analyzing {records.length} records using intelligent matching algorithms...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={50} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              Applying exact match → normalized match → fuzzy name match strategies
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matching Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {totalMatches} of {records.length} records
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exact Matches</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{exactMatches}</div>
            <div className="text-xs text-muted-foreground">Perfect ID matches</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Smart Matches</CardTitle>
            <Brain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{normalizedMatches + fuzzyMatches}</div>
            <div className="text-xs text-muted-foreground">AI-assisted matches</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{noMatches}</div>
            <div className="text-xs text-muted-foreground">Need attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Matching Results Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Matching Results</CardTitle>
            <CardDescription>Detailed breakdown of employee matching results</CardDescription>
          </div>
          <div className="flex gap-2">
            {noMatches > 0 && (
              <Button 
                variant="outline" 
                onClick={handleAutoRegister}
                disabled={loading}
              >
                <Users className="h-4 w-4 mr-2" />
                Auto-Register {noMatches} Employees
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={runMatching}
              disabled={loading}
            >
              <Brain className="h-4 w-4 mr-2" />
              Re-run Matching
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Match Rate Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Match Rate</span>
                <span>{matchRate.toFixed(1)}%</span>
              </div>
              <Progress value={matchRate} className="w-full" />
            </div>

            {/* Detailed Results Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Raw Employee ID</TableHead>
                    <TableHead>Raw Name</TableHead>
                    <TableHead>Matched Employee</TableHead>
                    <TableHead>Match Method</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchResults.slice(0, 20).map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {getConfidenceBadge(result.match_confidence)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.employee_id}
                      </TableCell>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>
                        {result.matched_employee ? (
                          <div>
                            <div className="font-medium">{result.matched_employee.english_name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {result.matched_employee.employee_id}
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-600">No match found</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {result.match_method.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.user_id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {matchResults.length > 20 && (
              <div className="text-center text-sm text-muted-foreground">
                Showing 20 of {matchResults.length} results
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}