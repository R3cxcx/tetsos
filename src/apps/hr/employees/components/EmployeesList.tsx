import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Mail, Phone, MapPin, Calendar, ChevronUp, ChevronDown, Loader2, ChevronLeft, ChevronRight, Eye, UserCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useEmployees, Employee, PaginationParams } from "@/hooks/useEmployees";
import { useEmployeesStaging, EmployeeStaging } from "@/hooks/useEmployeesStaging";
import { StagingEmployeeDialog } from "./StagingEmployeeDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { EmployeeProfileDialog } from "./EmployeeProfileDialog";
import { QuickEmployeeProfileDialog } from "./QuickEmployeeProfileDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface EmployeesListProps {
  searchQuery: string;
  statusFilter: string;
  viewMode: "cards" | "table";
  isStaging: boolean;
}

export const EmployeesList = ({ searchQuery, statusFilter, viewMode, isStaging }: EmployeesListProps) => {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const { paginatedResult, loading, deleteEmployee, updateEmployee, fetchEmployeesPaginated, employees } = useEmployees();
  const { employees: stagingEmployees, loading: stagingLoading, deleteStagingEmployee } = useEmployeesStaging();
  const [sortField, setSortField] = useState<string>('english_name');
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedStagingEmployee, setSelectedStagingEmployee] = useState<EmployeeStaging | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showQuickProfileDialog, setShowQuickProfileDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Use staging or production data based on toggle
  const currentEmployees = isStaging ? stagingEmployees : paginatedResult.employees;
  const currentLoading = isStaging ? stagingLoading : loading;

  // For staging, use client-side filtering (backward compatibility)
  const filteredAndSortedEmployees = useMemo(() => {
    if (!isStaging) {
      // For production, use server-side filtered data
      return currentEmployees;
    }

    // For staging, filter client-side
    let filtered = currentEmployees.filter(employee => {
      const matchesSearch = `${employee.english_name} ${employee.arabic_name || ''} ${('personal_email' in employee ? employee.personal_email : '') || ''} ${('position_title' in employee ? employee.position_title : '') || ('position' in employee ? employee.position : '') || ''} ${employee.employee_id}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting for staging
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        
        if (aValue < bValue) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [currentEmployees, searchQuery, statusFilter, sortField, sortDirection, isStaging]);

  // Calculate pagination for staging (production uses server-side pagination)
  const totalPages = isStaging 
    ? Math.ceil(filteredAndSortedEmployees.length / pageSize)
    : paginatedResult.totalPages;
  
  const startIndex = isStaging 
    ? (currentPage - 1) * pageSize
    : (paginatedResult.currentPage - 1) * pageSize;
  
  const endIndex = isStaging 
    ? startIndex + pageSize
    : startIndex + currentEmployees.length;
  
  const paginatedEmployees = isStaging 
    ? filteredAndSortedEmployees.slice(startIndex, endIndex)
    : currentEmployees;

  const totalCount = isStaging 
    ? filteredAndSortedEmployees.length 
    : paginatedResult.totalCount;

  // Fetch data when filters change (production only)
  useEffect(() => {
    if (!isStaging) {
      const params: PaginationParams = {
        page: currentPage,
        pageSize,
        search: searchQuery,
        statusFilter,
        sortField,
        sortDirection
      };
      fetchEmployeesPaginated(params);
    } else {
      setCurrentPage(1);
    }
  }, [searchQuery, statusFilter, pageSize, sortField, sortDirection, currentPage, isStaging]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'pending':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
      if (isStaging) {
        await deleteStagingEmployee(employeeToDelete.id);
      } else {
        await deleteEmployee(employeeToDelete.id);
      }
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleCardClick = (employee: Employee | EmployeeStaging) => {
    if (isStaging) {
      setSelectedStagingEmployee(employee as EmployeeStaging);
    } else {
      setSelectedEmployee(employee as Employee);
      setShowQuickProfileDialog(true);
    }
  };

  const handleViewProfile = (employee: Employee) => {
    navigate(`/hr/employees/${employee.id}/profile`);
  };

  const handleChangeStatus = async (employee: Employee, newStatus: 'active' | 'inactive' | 'pending') => {
    try {
      const { error } = await updateEmployee(employee.id, { status: newStatus });
      if (!error) {
        toast({
          title: "Status Updated",
          description: `Employee status changed to ${newStatus}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee status",
        variant: "destructive",
      });
    }
  };

  if (currentLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading employees...</span>
      </div>
    );
  }

  const getInitials = (englishName: string | undefined | null) => {
    if (!englishName || englishName.trim() === '') {
      return '??';
    }
    
    const name = englishName.trim();
    const names = name.split(' ').filter(n => n.length > 0);
    
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    } else if (names.length === 1 && names[0].length >= 2) {
      return names[0].slice(0, 2).toUpperCase();
    } else if (names.length === 1 && names[0].length === 1) {
      return names[0].toUpperCase() + '?';
    }
    
    return '??';
  };

  const renderPaginationControls = () => (
    <div className="flex items-center justify-between mt-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-gray-700">
          Showing {startIndex + 1}-{Math.min(endIndex, totalCount)} of {totalCount} employees
        </span>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
  const renderCardsView = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEmployees.map((employee) => (
        <Card 
          key={employee.id} 
          className={`p-6 transition-shadow border border-gray-200 rounded-lg hover:shadow-lg cursor-pointer ${
            isStaging 
              ? "hover:border-orange-300 bg-orange-50/30" 
              : "hover:border-primary/20"
          }`}
          onClick={() => handleCardClick(employee)}
        >
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-700">
                    {getInitials(employee.english_name)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {employee.english_name}
                  </h3>
                  <p className="text-sm text-gray-500">{employee.employee_id}</p>
                  {employee.arabic_name && (
                    <p className="text-sm text-gray-600" dir="rtl">{employee.arabic_name}</p>
                  )}
                  {isStaging && (
                    <Badge variant="outline" className="mt-1 bg-orange-100 text-orange-700 border-orange-300 text-xs">
                      Click to edit/promote
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline"
                  className={`${getStatusColor(employee.status)} text-xs capitalize rounded-full px-2 py-1`}
                >
                  {employee.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="bg-background border shadow-md">
                     {!isStaging && (
                       <>
                         <DropdownMenuItem 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleViewProfile(employee as Employee);
                           }}
                           className="hover:bg-accent"
                         >
                           <Eye className="h-4 w-4 mr-2" />
                           View Profile
                         </DropdownMenuItem>
                         
                         {(hasRole('admin') || hasRole('hr_manager')) && (
                           <>
                             <DropdownMenuItem asChild>
                               <div className="relative">
                                 <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                     <button className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                                       <UserCheck className="h-4 w-4 mr-2" />
                                       Change Status
                                     </button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent side="right" className="bg-background border shadow-md">
                                     <DropdownMenuItem 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleChangeStatus(employee as Employee, 'active');
                                       }}
                                       className="text-green-600"
                                     >
                                       Set Active
                                     </DropdownMenuItem>
                                     <DropdownMenuItem 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleChangeStatus(employee as Employee, 'inactive');
                                       }}
                                       className="text-red-600"
                                     >
                                       Set Inactive
                                     </DropdownMenuItem>
                                     <DropdownMenuItem 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleChangeStatus(employee as Employee, 'pending');
                                       }}
                                       className="text-yellow-600"
                                     >
                                       Set Pending
                                     </DropdownMenuItem>
                                   </DropdownMenuContent>
                                 </DropdownMenu>
                               </div>
                             </DropdownMenuItem>
                             
                             {('is_deletable' in employee && employee.is_deletable) && (
                               <DropdownMenuItem 
                                 className="text-destructive hover:bg-destructive/10"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDeleteEmployee(employee as Employee);
                                 }}
                               >
                                 <Trash2 className="h-4 w-4 mr-2" />
                                 Delete
                               </DropdownMenuItem>
                             )}
                           </>
                         )}
                       </>
                     )}
                     
                     {isStaging && (
                       <DropdownMenuItem onClick={() => handleCardClick(employee)}>
                         Edit/Promote
                       </DropdownMenuItem>
                     )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-2">
                          {('personal_email' in employee ? employee.personal_email : null) && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{('personal_email' in employee ? employee.personal_email : '')}</span>
              </div>
            )}
              
              {employee.work_phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{employee.work_phone}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="w-4 h-4 flex items-center justify-center">
                  👤
                </span>
                <span>{employee.position || '—'}</span>
                {employee.category && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {employee.category}
                  </span>
                )}
              </div>
              
              {employee.date_of_joining && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {isStaging ? employee.date_of_joining : new Date(employee.date_of_joining).toLocaleDateString('en-US', { 
                    month: 'numeric', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</span>
                </div>
              )}

              {employee.nationality && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="w-4 h-4 flex items-center justify-center">🌍</span>
                  <span>{employee.nationality}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        ))}
        
        {paginatedEmployees.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12 text-center">
              <CardContent className="p-0">
                <p className="text-gray-500">
                  No employees found matching your search criteria.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );

  const renderTableView = () => (
    <>
      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/50">
            <TableHead className="w-[280px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('english_name')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Employee Name
                {getSortIcon('english_name')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('employee_id')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Employee ID
                {getSortIcon('employee_id')}
              </Button>
            </TableHead>
            <TableHead className="w-[180px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('position_title')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Position
                {getSortIcon('position_title')}
              </Button>
            </TableHead>
            <TableHead className="w-[140px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('nationality')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Nationality
                {getSortIcon('nationality')}
              </Button>
            </TableHead>
            <TableHead className="w-[140px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('work_phone')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Phone
                {getSortIcon('work_phone')}
              </Button>
            </TableHead>
            <TableHead className="w-[100px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('status')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Status
                {getSortIcon('status')}
              </Button>
            </TableHead>
            <TableHead className="w-[120px] font-semibold text-foreground">
              <Button
                variant="ghost"
                onClick={() => handleSort('date_of_joining')}
                className="h-auto p-0 font-semibold hover:bg-transparent text-foreground"
              >
                Join Date
                {getSortIcon('date_of_joining')}
              </Button>
            </TableHead>
            <TableHead className="w-[80px] font-semibold text-foreground text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedEmployees.map((employee, index) => (
            <TableRow 
              key={employee.id} 
              className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
            >
              <TableCell className="py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(employee.english_name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">
                      {employee.english_name}
                    </div>
                    {employee.arabic_name && (
                      <div className="text-sm text-muted-foreground truncate" dir="rtl">
                        {employee.arabic_name}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-foreground">
                  {employee.employee_id}
                </code>
              </TableCell>
              <TableCell className="py-4">
                <span className="text-sm text-foreground truncate">
                   {employee.position || '—'}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <span className="text-sm text-foreground">
                  {employee.nationality || '—'}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <span className="text-sm text-foreground font-mono">
                  {employee.work_phone || '—'}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <Badge 
                  variant="outline"
                  className={`${getStatusColor(employee.status)} text-xs capitalize font-medium border`}
                >
                  {employee.status}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <span className="text-sm text-foreground">
                  {employee.date_of_joining ? (
                    isStaging ? employee.date_of_joining : new Date(employee.date_of_joining).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  ) : '—'}
                </span>
              </TableCell>
              <TableCell className="py-4 text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border shadow-md">
                     {!isStaging && (
                       <>
                         <DropdownMenuItem 
                           onClick={() => handleViewProfile(employee as Employee)}
                           className="hover:bg-accent"
                         >
                           <Eye className="h-4 w-4 mr-2" />
                           View Profile
                         </DropdownMenuItem>
                         
                         {(hasRole('admin') || hasRole('hr_manager')) && (
                           <>
                             <DropdownMenuItem asChild>
                               <div className="relative">
                                 <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                     <button className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                                       <UserCheck className="h-4 w-4 mr-2" />
                                       Change Status
                                     </button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent side="right" className="bg-background border shadow-md">
                                     <DropdownMenuItem 
                                       onClick={() => handleChangeStatus(employee as Employee, 'active')}
                                       className="text-green-600"
                                     >
                                       Set Active
                                     </DropdownMenuItem>
                                     <DropdownMenuItem 
                                       onClick={() => handleChangeStatus(employee as Employee, 'inactive')}
                                       className="text-red-600"
                                     >
                                       Set Inactive
                                     </DropdownMenuItem>
                                     <DropdownMenuItem 
                                       onClick={() => handleChangeStatus(employee as Employee, 'pending')}
                                       className="text-yellow-600"
                                     >
                                       Set Pending
                                     </DropdownMenuItem>
                                   </DropdownMenuContent>
                                 </DropdownMenu>
                               </div>
                             </DropdownMenuItem>
                             
                             {('is_deletable' in employee && employee.is_deletable) && (
                               <DropdownMenuItem 
                                 className="text-destructive hover:bg-destructive/10"
                                 onClick={() => handleDeleteEmployee(employee as Employee)}
                               >
                                 <Trash2 className="h-4 w-4 mr-2" />
                                 Delete
                               </DropdownMenuItem>
                             )}
                           </>
                         )}
                       </>
                     )}
                     
                     {isStaging && (
                       <DropdownMenuItem onClick={() => handleCardClick(employee)}>
                         Edit/Promote
                       </DropdownMenuItem>
                     )}
                   </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {paginatedEmployees.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-500">
            No employees found matching your search criteria.
          </p>
        </div>
      )}
    </div>
    </>
  );

  return (
    <>
      {/* Pagination Controls at Top */}
      {renderPaginationControls()}
      
      {/* Employee List */}
      {viewMode === "cards" ? renderCardsView() : renderTableView()}
      
      {/* Staging Employee Dialog */}
      <StagingEmployeeDialog
        open={!!selectedStagingEmployee}
        onOpenChange={(open) => !open && setSelectedStagingEmployee(null)}
        stagingEmployee={selectedStagingEmployee}
        productionEmployee={selectedStagingEmployee ? employees.find(emp => emp.employee_id === selectedStagingEmployee.employee_id) : null}
      />
      
      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        employee={selectedEmployee}
      />
      
      {/* Employee Profile Dialog */}
      <EmployeeProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        employee={selectedEmployee}
      />

      {/* Quick Employee Profile Dialog */}
      <QuickEmployeeProfileDialog
        employee={selectedEmployee}
        open={showQuickProfileDialog}
        onOpenChange={setShowQuickProfileDialog}
        onEdit={(employee) => {
          setSelectedEmployee(employee);
          setShowEditDialog(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{employeeToDelete?.english_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};