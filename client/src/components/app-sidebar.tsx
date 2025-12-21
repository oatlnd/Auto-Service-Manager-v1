import { Link, useLocation } from "wouter";
import { Home, FileText, Wrench, BarChart3, Users, Calendar, Settings, UserCog } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/contexts/UserRoleContext";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Job Cards", url: "/job-cards", icon: FileText },
  { title: "Service Bays", url: "/service-bays", icon: Wrench },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const adminNavItems = [
  { title: "Staff Management", url: "/staff", icon: Users },
  { title: "Technicians", url: "/technicians", icon: UserCog },
  { title: "Attendance", url: "/attendance", icon: Calendar },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin, isManager } = useUserRole();
  const canAccessAdmin = isAdmin || isManager;

  const isActive = (url: string) => {
    return location === url || (url !== "/" && location.startsWith(url));
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg" data-testid="logo-text">H</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground text-sm" data-testid="brand-name">Honda Service</span>
            <span className="text-xs text-muted-foreground">Jaffna Center</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canAccessAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Settings className="w-3 h-3" />
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                    >
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
