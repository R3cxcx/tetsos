import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RefreshProvider } from "@/contexts/RefreshContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HRDashboard from "./pages/HRDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import EmployeesIndex from "./apps/hr/employees/pages/EmployeesIndex";
import EmployeeProfilePage from "./apps/hr/employees/pages/EmployeeProfilePage";
import DataUploadIndex from "./apps/hr/employees/pages/DataUploadIndex";
import RecruitmentIndex from "./apps/hr/recruitment/pages/RecruitmentIndex";
import RequestsIndex from "./apps/hr/recruitment/pages/RequestsIndex";
import RequestDetailsPage from "./apps/hr/recruitment/pages/RequestDetailsPage";
import CandidatesIndex from "./apps/hr/recruitment/pages/CandidatesIndex";
import TrackerIndex from "./apps/hr/recruitment/pages/TrackerIndex";
import AttendanceIndex from "./apps/hr/attendance/pages/AttendanceIndex";
import AttendanceDataIndex from "./apps/hr/attendance/pages/AttendanceDataIndex";
import TerminalsIndex from "./apps/hr/attendance/pages/TerminalsIndex";
import AttendanceRulesIndex from "./apps/hr/attendance/pages/AttendanceRulesIndex";
import AttendanceCalendarView from "./apps/hr/attendance/pages/AttendanceCalendarView";
import DailyOverview from "./apps/hr/attendance/pages/DailyOverview";
import ClockInOut from "./apps/hr/attendance/pages/ClockInOut";
import Reports from "./apps/hr/attendance/pages/Reports";
import RawAttendanceRecords from "./apps/hr/attendance/pages/RawAttendanceRecords";
import AttendanceReview from "./apps/hr/attendance/pages/AttendanceReview";
import { MasterDataIndex } from "./apps/hr/masterdata/pages/MasterDataIndex";
import { FinanceMasterDataIndex } from "./apps/finance/masterdata/pages/FinanceMasterDataIndex";
import EmployeeSelfService from "./pages/EmployeeSelfService";
import UserEmployeeLink from "./pages/UserEmployeeLink";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RefreshProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/hr" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <HRDashboard />
                </ProtectedRoute>
              } />
               <Route path="/finance" element={
                <ProtectedRoute requiredRole="finance_manager">
                  <FinanceDashboard />
                </ProtectedRoute>
              } />
               <Route path="/finance/masterdata" element={
                <ProtectedRoute requiredRole="finance_manager">
                  <FinanceMasterDataIndex />
                </ProtectedRoute>
              } />
              <Route path="/employee/self-service" element={
                <ProtectedRoute requiredRole="employee">
                  <EmployeeSelfService />
                </ProtectedRoute>
              } />
              <Route path="/hr/employees" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <EmployeesIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/employees/data-upload" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <DataUploadIndex />
                </ProtectedRoute>
              } />
               <Route path="/hr/employees/:id/profile" element={
                 <ProtectedRoute requiredPermission="employees.read">
                   <EmployeeProfilePage />
                 </ProtectedRoute>
               } />
               <Route path="/hr/recruitment" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <RecruitmentIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/recruitment/requests" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <RequestsIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/recruitment/requests/:id" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <RequestDetailsPage />
                </ProtectedRoute>
              } />
              <Route path="/hr/recruitment/candidates" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <CandidatesIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/recruitment/tracker" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <TrackerIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <AttendanceIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/data" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <AttendanceDataIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/terminals" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <TerminalsIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/rules" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <AttendanceRulesIndex />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/calendar" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <AttendanceCalendarView />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/overview" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <DailyOverview />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/clock-in-out" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <ClockInOut />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/reports" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/raw-records" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <RawAttendanceRecords />
                </ProtectedRoute>
              } />
              <Route path="/hr/attendance/review" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <AttendanceReview />
                </ProtectedRoute>
              } />
              <Route path="/hr/masterdata" element={
                <ProtectedRoute requiredPermission="employees.read">
                  <MasterDataIndex />
                </ProtectedRoute>
              } />
              <Route path="/settings/*" element={
                <ProtectedRoute requiredRole="super_admin">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/settings/user-employee-link" element={
                <ProtectedRoute requiredRole="super_admin">
                  <UserEmployeeLink />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RefreshProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
