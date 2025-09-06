import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, FileText, BarChart3, Settings, Upload, Database } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

const HRDashboard = () => {
  const { hasPermission, roles, permissions } = useAuth();

  // Debug logging
  console.log('HRDashboard - Debug info:', {
    hasEmployeesRead: hasPermission('employees.read'),
    roles,
    permissions
  });

  return (
    <div className="min-h-screen bg-white">
      
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            Human Resources
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage all aspects of human resources
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
            {/* Recruitment */}
            <Link to="/hr/recruitment">
              <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Settings className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mb-2">
                    Recruitment
                  </CardTitle>
                  <CardDescription className="text-center text-sm">
                    Job postings, applications, and hiring process
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* Employees */}
            {hasPermission('employees.read') ? (
              <Link to="/hr/employees">
                <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mb-2">
                      Employees
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                      Manage employee records, profiles, and information
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card className="w-64 h-64 border-2 rounded-2xl opacity-50">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mb-2 text-gray-400">
                    Employees
                  </CardTitle>
                  <CardDescription className="text-center text-sm text-gray-400">
                    No access to employee records
                  </CardDescription>
                </CardContent>
              </Card>
            )}

            {/* Data Upload */}
            <Link to="/hr/employees/data-upload">
              <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mb-2">
                    Uploaded Data
                  </CardTitle>
                  <CardDescription className="text-center text-sm">
                    Upload and manage employee data staging
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* Attendance */}
            <Link to="/hr/attendance">
              <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mb-2">
                    Attendance
                  </CardTitle>
                  <CardDescription className="text-center text-sm">
                    Track employee attendance and working hours
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            {/* Leave Management */}
            <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl opacity-60">
              <CardContent className="flex flex-col items-center justify-center h-full p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-500" />
                </div>
                <CardTitle className="text-xl font-bold text-center mb-2">
                  Leave Management
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Manage vacation, sick leave, and time-off requests
                </CardDescription>
                <div className="mt-4">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
                </div>
              </CardContent>
            </Card>

            {/* Payroll */}
            <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl opacity-60">
              <CardContent className="flex flex-col items-center justify-center h-full p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-500" />
                </div>
                <CardTitle className="text-xl font-bold text-center mb-2">
                  Payroll
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Process salaries, bonuses, and payroll management
                </CardDescription>
                <div className="mt-4">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl opacity-60">
              <CardContent className="flex flex-col items-center justify-center h-full p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-500" />
                </div>
                <CardTitle className="text-xl font-bold text-center mb-2">
                  Performance
                </CardTitle>
                <CardDescription className="text-center text-sm">
                  Performance reviews and goal tracking
                </CardDescription>
                <div className="mt-4">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
                </div>
              </CardContent>
            </Card>

            {/* Master Data */}
            <Link to="/hr/masterdata">
              <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Database className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mb-2">
                    Master Data
                  </CardTitle>
                  <CardDescription className="text-center text-sm">
                    Manage departments, positions, and employee categories
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;