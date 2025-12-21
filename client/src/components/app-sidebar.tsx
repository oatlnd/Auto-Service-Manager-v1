import { Link, useLocation } from "wouter";
import { Home, FileText, Wrench, BarChart3, Users, Calendar, Settings, UserCog } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  { titleKey: "sidebar.dashboard", url: "/", icon: Home, limitedRoleVisible: false },
  { titleKey: "sidebar.jobCards", url: "/job-cards", icon: FileText, limitedRoleVisible: true },
  { titleKey: "sidebar.serviceBays", url: "/service-bays", icon: Wrench, limitedRoleVisible: true },
  { titleKey: "sidebar.reports", url: "/reports", icon: BarChart3, limitedRoleVisible: false },
];

const adminNavItems = [
  { titleKey: "sidebar.staffManagement", url: "/staff", icon: Users },
  { titleKey: "sidebar.technicians", url: "/technicians", icon: UserCog },
  { titleKey: "sidebar.attendance", url: "/attendance", icon: Calendar },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { isAdmin, isManager, isLimitedRole } = useUserRole();
  const canAccessAdmin = isAdmin || isManager;
  
  const visibleNavItems = isLimitedRole 
    ? mainNavItems.filter(item => item.limitedRoleVisible)
    : mainNavItems;

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
          <SidebarGroupLabel>{t("sidebar.main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{t(item.titleKey)}</span>
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
              {t("sidebar.admin")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.replace("/", "")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{t(item.titleKey)}</span>
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
