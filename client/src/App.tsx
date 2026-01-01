import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserRoleProvider, useUserRole } from "@/contexts/UserRoleContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Dashboard from "@/pages/dashboard";
import JobCards from "@/pages/job-cards";
import ServiceBays from "@/pages/service-bays";
import Reports from "@/pages/reports";
import StaffManagement from "@/pages/staff-management";
import Attendance from "@/pages/attendance";
import LoyaltyProgram from "@/pages/loyalty-program";
import PartsCatalog from "@/pages/parts-catalog";
import Login from "@/pages/login";
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
      {canAccessAdmin && <Route path="/attendance" component={Attendance} />}
      {canAccessAdmin && <Route path="/loyalty" component={LoyaltyProgram} />}
      {canAccessAdmin && <Route path="/parts-catalog" component={PartsCatalog} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 h-14 px-4 border-b border-border shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name} ({user.role})
              </span>
            )}
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title={t("auth.logout")}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && location !== "/login") {
    return <Redirect to="/login" />;
  }

  if (isAuthenticated && location === "/login") {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <UserRoleProvider>
          <AppContent />
        </UserRoleProvider>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthenticatedApp />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
