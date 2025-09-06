import { useState, useEffect } from 'react';
import { useRecruitment } from '@/hooks/useRecruitment';
import { useRefresh } from '@/contexts/RefreshContext';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BarChart3, TrendingUp, ArrowRight } from 'lucide-react';

export default function RecruitmentIndex() {
  const { requests, refreshRequests } = useRecruitment();
  const navigate = useNavigate();
  const { setRefreshFunction } = useRefresh();

  useEffect(() => {
    setRefreshFunction(() => refreshRequests);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction]);

  // Calculate quick stats for overview
  const stats = {
    totalRequests: requests.length,
    activeRequests: requests.filter(r => 
      !['hired', 'rejected', 'contract_generated'].includes(r.status)
    ).length,
    pendingApprovals: requests.filter(r => 
      r.status.includes('pending')
    ).length,
    recentRequests: requests.filter(r => {
      const created = new Date(r.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created > weekAgo;
    }).length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Recruitment Management</h1>
            <p className="text-muted-foreground">Comprehensive recruitment and hiring management system</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/recruitment/requests')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentRequests} created this week
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/recruitment/requests')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRequests}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/recruitment/candidates')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                View all candidates
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/recruitment/requests')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" 
                onClick={() => navigate('/hr/recruitment/requests')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Recruitment Requests</CardTitle>
              <CardDescription>Create and manage hiring requests</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                Manage Requests
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" 
                onClick={() => navigate('/hr/recruitment/candidates')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Candidates</CardTitle>
              <CardDescription>Track and manage job candidates</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                View Candidates
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" 
                onClick={() => navigate('/hr/recruitment/tracker')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Recruitment Tracker</CardTitle>
              <CardDescription>Monitor overall progress and analytics</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                View Tracker
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest recruitment updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{request.position_title}</p>
                    <p className="text-muted-foreground">{request.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="capitalize">{request.status.replace(/_/g, ' ')}</p>
                    <p className="text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}