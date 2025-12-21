import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserRoleProvider, useUserRole } from "@/contexts/UserRoleContext";
import { RoleSelector } from "@/components/role-selector";
import Dashboard from "@/pages/dashboard";
import JobCards from "@/pages/job-cards";
import ServiceBays from "@/pages/service-bays";
import Reports from "@/pages/reports";
import StaffManagement from "@/pages/staff-management";
import Technicians from "@/pages/technicians";
import Attendance from "@/pages/attendance";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAdmin, isManager } = useUserRole();
  const canAccessAdmin = isAdmin || isManager;

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/job-cards" component={JobCards} />
      <Route path="/service-bays" component={ServiceBays} />
      <Route path="/reports" component={Reports} />
      {canAccessAdmin && <Route path="/staff" component={StaffManagement} />}
      {canAccessAdmin && <Route path="/technicians" component={Technicians} />}
      {canAccessAdmin && <Route path="/attendance" component={Attendance} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 h-14 px-4 border-b border-border shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            <RoleSelector />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserRoleProvider>
          <AppContent />
          <Toaster />
        </UserRoleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
