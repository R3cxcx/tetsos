import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Download, Grid3X3, Table2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmployeesList } from "../components/EmployeesList";
import { useEmployees } from "@/hooks/useEmployees";
import { CreateEmployeeDialog } from "../components/CreateEmployeeDialog";
import { useRefresh } from "@/contexts/RefreshContext";
import { supabase } from "@/integrations/supabase/client";

const EmployeesIndex = () => {
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const { setRefreshFunction } = useRefresh();
  
  const { paginatedResult, fetchEmployees, fetchEmployeesPaginated, employees } = useEmployees();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoize the refresh function to prevent effect loops
  const stableRefreshEmployees = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    setRefreshFunction(() => stableRefreshEmployees);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction, stableRefreshEmployees]);

  // Accurate stats via RPC (not limited by client-side arrays)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_employee_stats');
      if (error) {
        console.error('Error fetching employee stats:', error);
        return;
      }
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (row) {
        setStats({
          total: Number(row.total_count) || 0,
          active: Number(row.active_count) || 0,
          pending: Number(row.pending_count) || 0,
          inactive: Number(row.inactive_count) || 0,
        });
      }
    };
    
    fetchStats();
  }, [employees]);

  const statusCounts = [
    { label: "All", count: stats.total, value: "all" },
    { label: "Active", count: stats.active, value: "active" },
    { label: "Pending", count: stats.pending, value: "pending" },
    { label: "Inactive", count: stats.inactive, value: "inactive" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
              <p className="text-gray-600">
                Manage employee records and information
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span><strong>{stats.total}</strong> Total</span>
              <span><strong>{stats.inactive}</strong> Inactive</span>
              <span><strong>{stats.pending}</strong> Pending</span>
              <span><strong>{stats.active}</strong> Active</span>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees by name, email, employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                {/* View Toggle */}
                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="h-8 px-3"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 px-3"
                  >
                    <Table2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowCreateEmployee(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Employee</span>
                </Button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {statusCounts.map((status) => (
                <Button
                  key={status.value}
                  variant={statusFilter === status.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status.value)}
                  className={`rounded-full ${
                    statusFilter === status.value 
                      ? "bg-black text-white hover:bg-gray-800" 
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {status.label} ({status.count})
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Employees Grid - Production data only */}
        <EmployeesList 
          searchQuery={debouncedSearch} 
          statusFilter={statusFilter} 
          viewMode={viewMode} 
          isStaging={false}
        />
      </div>

      {/* Dialogs */}
      <CreateEmployeeDialog 
        open={showCreateEmployee} 
        onOpenChange={setShowCreateEmployee} 
      />
    </div>
  );
};

export default EmployeesIndex;