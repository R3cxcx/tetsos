import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRecruitment } from '@/hooks/useRecruitment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Calendar, TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecruitmentStats {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalCandidates: number;
  avgTimeToHire: number;
  pendingApprovals: number;
}

interface ActivityItem {
  id: string;
  type: string;
  details: string;
  date: string;
  request_title: string;
  department: string;
  performer_name?: string;
}

export default function TrackerIndex() {
  const { requests } = useRecruitment();
  const navigate = useNavigate();
  const [stats, setStats] = useState<RecruitmentStats>({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalCandidates: 0,
    avgTimeToHire: 0,
    pendingApprovals: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTrackerData();
  }, [requests]);

  const fetchTrackerData = async () => {
    try {
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('recruitment_activities')
        .select(`
          id,
          activity_type,
          activity_details,
          created_at,
          recruitment_requests!inner(
            position_title,
            department
          ),
          profiles!performed_by(
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;

      // Fetch candidate count
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('interview_assessments')
        .select('id');

      if (candidatesError) throw candidatesError;

      // Process activities
      const formattedActivities = activitiesData.map((activity) => ({
        id: activity.id as string,
        type: activity.activity_type as string,
        details: activity.activity_details as string | null,
        date: activity.created_at as string,
        request_title: (activity.recruitment_requests as unknown as Record<string, unknown>).position_title as string,
        department: (activity.recruitment_requests as unknown as Record<string, unknown>).department as string,
        performer_name: (activity.profiles as unknown as Record<string, unknown> | null) 
          ? `${(activity.profiles as unknown as Record<string, unknown>).first_name || ''} ${(activity.profiles as unknown as Record<string, unknown>).last_name || ''}`.trim() || 'Unknown'
          : 'System'
      }));

      // Calculate stats
      const totalRequests = requests.length;
      const activeRequests = requests.filter(r => 
        !['hired', 'rejected', 'contract_generated'].includes(r.status)
      ).length;
      const completedRequests = requests.filter(r => 
        ['hired', 'contract_generated'].includes(r.status)
      ).length;
      const pendingApprovals = requests.filter(r => 
        r.status.includes('pending')
      ).length;

      // Calculate average time to hire (simplified)
      const hiredRequests = requests.filter(r => r.hired_at);
      const avgTimeToHire = hiredRequests.length > 0 
        ? hiredRequests.reduce((sum, req) => {
            const created = new Date(req.created_at);
            const hired = new Date(req.hired_at!);
            return sum + (hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / hiredRequests.length
        : 0;

      setStats({
        totalRequests,
        activeRequests,
        completedRequests,
        totalCandidates: candidatesData.length,
        avgTimeToHire: Math.round(avgTimeToHire),
        pendingApprovals
      });

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity =>
    activity.request_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'status_change':
        return <TrendingUp className="h-4 w-4" />;
      case 'interview_scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'assessment_completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const completionRate = stats.totalRequests > 0 
    ? (stats.completedRequests / stats.totalRequests) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/hr/recruitment')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Recruitment Tracker</h2>
          <p className="text-muted-foreground">Comprehensive overview of recruitment processes and activities</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeRequests} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">
              Interviewed so far
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    requests.reduce((acc: Record<string, number>, req) => {
                      acc[req.status] = (acc[req.status] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    requests.reduce((acc: Record<string, number>, req) => {
                      acc[req.department] = (acc[req.department] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([department, count]) => (
                    <div key={department} className="flex justify-between items-center">
                      <span className="text-sm">{department}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading activities...</div>
          ) : filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No activities found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{activity.request_title}</p>
                            <p className="text-xs text-muted-foreground">{activity.department}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                        {activity.performer_name && (
                          <p className="text-xs text-muted-foreground">By {activity.performer_name}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}