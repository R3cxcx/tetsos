import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Settings, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const FinanceDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finance Dashboard
          </h1>
          <p className="text-gray-600">
            Manage financial parameters and cost centers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Master Data */}
          <Link to="/finance/masterdata">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Master Data</CardTitle>
                    <CardDescription className="text-sm">
                      Manage cost centers and financial parameters
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure cost centers, budgets, and other financial master data
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Reports - Coming Soon */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Financial Reports</CardTitle>
                  <CardDescription className="text-sm">
                    View cost center reports and analytics
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Generate financial reports and budget analysis
              </p>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
            </CardContent>
          </Card>

          {/* Settings - Coming Soon */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Settings className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Finance Settings</CardTitle>
                  <CardDescription className="text-sm">
                    Configure financial system settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Manage currencies, fiscal periods, and accounting rules
              </p>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Coming Soon</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;