import { ArrowLeft, Settings, Clock, Calendar, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function AttendanceRulesIndex() {
  const navigate = useNavigate();

  const ruleCategories = [
    {
      title: "Working Hours",
      description: "Configure standard working hours and shift schedules",
      icon: Clock,
      color: "blue",
      settings: [
        "Standard working hours (9 AM - 5 PM)",
        "Shift schedules and rotations",
        "Break time allowances",
        "Lunch break duration"
      ]
    },
    {
      title: "Leave Policies",
      description: "Set up leave types, quotas, and approval workflows",
      icon: Calendar,
      color: "green",
      settings: [
        "Annual leave entitlements",
        "Sick leave policies",
        "Personal and emergency leave",
        "Leave approval chains"
      ]
    },
    {
      title: "Overtime Rules",
      description: "Define overtime calculation and approval rules",
      icon: AlertTriangle,
      color: "orange",
      settings: [
        "Overtime rate calculations",
        "Maximum overtime limits",
        "Approval requirements",
        "Weekend and holiday rates"
      ]
    },
    {
      title: "Attendance Policies",
      description: "Configure attendance rules and disciplinary actions",
      icon: Users,
      color: "purple",
      settings: [
        "Late arrival tolerance",
        "Absence notification rules",
        "Consecutive absence limits",
        "Disciplinary action triggers"
      ]
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "from-blue-500 to-cyan-500 text-blue-600",
      green: "from-green-500 to-emerald-500 text-green-600", 
      orange: "from-orange-500 to-red-500 text-orange-600",
      purple: "from-purple-500 to-pink-500 text-purple-600"
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/hr/attendance')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Attendance Rules & Policies</h1>
            <p className="text-muted-foreground">Configure attendance policies, working hours, and business rules</p>
          </div>
        </div>

        {/* Rule Categories */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {ruleCategories.map((category) => (
            <Card key={category.title} className="group cursor-pointer hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getColorClasses(category.color).split(' ').slice(0, 2).join(' ')} flex items-center justify-center`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.settings.map((setting, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <CheckCircle className={`h-4 w-4 ${getColorClasses(category.color).split(' ')[2]}`} />
                      <span>{setting}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => navigate(`/hr/attendance/rules/${category.title.toLowerCase().replace(' ', '-')}`)}
                >
                  Configure {category.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Setup
            </CardTitle>
            <CardDescription>Common configuration tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => navigate('/hr/attendance/rules/working-hours')}
              >
                <Clock className="h-5 w-5" />
                <span className="text-sm">Set Working Hours</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => navigate('/hr/attendance/rules/leave-policies')}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Configure Leave</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => navigate('/hr/attendance/rules/overtime-rules')}
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">Setup Overtime</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}