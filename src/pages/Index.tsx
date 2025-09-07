import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Settings, Sliders, Shield, Calculator, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { hasRole, hasPermission, user } = useAuth();
  const [hasEmployeeRecord, setHasEmployeeRecord] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');
  const isRecruiter = hasRole('recruiter');
  const isFinanceRole = (hasRole('finance_manager') || hasRole('finance_staff') || hasRole('admin') || hasRole('super_admin')) && !isRecruiter;

  // Debug logging
  console.log('User roles and permissions:', {
    hasEmployeesRead: hasPermission('employees.read'),
    isRecruiter,
    isFinanceRole,
    hasEmployeeRecord,
    allRoles: { hasRole: { admin: hasRole('admin'), super_admin: hasRole('super_admin'), recruiter: hasRole('recruiter'), finance_manager: hasRole('finance_manager') } }
  });

  useEffect(() => {
    const checkEmployeeRecord = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setHasEmployeeRecord(!!data);
      } catch (error) {
        console.error('Error checking employee record:', error);
      } finally {
        setLoading(false);
      }
    };

    checkEmployeeRecord();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            IGCC Systemss
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select an application to get started
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl">
            {/* HR Application - Show to users with employees.read permission */}
            {hasPermission('employees.read') && (
              <Link to="/hr">
                <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mb-2">
                      Human Resources
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                      Manage employees, attendance, and HR operations
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Finance Application - Only show to finance roles, exclude recruiters */}
            {isFinanceRole && (
              <Link to="/finance">
                <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                      <Calculator className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mb-2">
                      Finance
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                      Manage cost centers and financial parameters
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Employee Self Service - Only show if user has employee record */}
            {hasEmployeeRecord && (
              <Link to="/employee/self-service">
                <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                      <User className="h-8 w-8 text-emerald-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mb-2">
                      Employee Self Service
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                      View your personal information and employee data
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Parameters - Admin Only */}
            {isAdmin && (
              <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl opacity-60">
                <CardContent className="flex flex-col items-center justify-center h-full p-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Sliders className="h-8 w-8 text-gray-500" />
                  </div>
                  <CardTitle className="text-xl font-bold text-center mb-2">
                    Parameters
                  </CardTitle>
                  <CardDescription className="text-center text-sm">
                    Additional business rules and system parameters
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings - Super Admin Only */}
            {isSuperAdmin && (
              <Link to="/settings">
                <Card className="w-64 h-64 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/20 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                      <Shield className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-center mb-2">
                      Admin Settings
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                      Manage users, roles and system settings
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;