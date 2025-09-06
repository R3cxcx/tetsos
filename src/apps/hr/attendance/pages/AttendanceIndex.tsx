import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, BarChart3, Settings, Monitor } from 'lucide-react';

export default function AttendanceIndex() {
  const navigate = useNavigate();

  const appSections = [
    {
      title: "Attendance Data",
      description: "Track employee attendance and working hours",
      icon: Database,
      path: "/hr/attendance/data"
    },
    {
      title: "Terminals",
      description: "Manage fingerprint terminals and devices",
      icon: Monitor,
      path: "/hr/attendance/terminals"
    },
    {
      title: "Reports",
      description: "Generate attendance reports and analytics",
      icon: BarChart3,
      path: "/hr/attendance/reports"
    },
    {
      title: "Rules",
      description: "Configure policies, working hours, and business rules",
      icon: Settings,
      path: "/hr/attendance/rules"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Grid Layout matching the reference design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {appSections.map((section) => (
            <Card 
              key={section.title}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-border/50 rounded-2xl bg-card"
              onClick={() => navigate(section.path)}
            >
              <CardHeader className="text-center pb-6 pt-8">
                {/* Circular icon background matching reference */}
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
                  <section.icon className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground mb-2">
                  {section.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm leading-relaxed px-4">
                  {section.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}