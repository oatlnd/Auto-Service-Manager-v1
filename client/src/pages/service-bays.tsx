import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wrench, Calendar, Car, Hash, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useUserRole } from "@/contexts/UserRoleContext";
import { WASH_BAYS, TECHNICIAN_BAYS } from "@shared/schema";
import type { BayStatus } from "@shared/schema";

function calculateDaysDiff(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface BayCardProps {
  bay: BayStatus;
  t: (key: string) => string;
}

function WashBayCard({ bay, t }: BayCardProps) {
  return (
    <Card 
      className="border border-card-border overflow-hidden"
      data-testid={`bay-card-${bay.bay.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className={`h-2 ${bay.isOccupied ? "bg-red-500" : "bg-green-500"}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">{bay.bay}</CardTitle>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                bay.isOccupied 
                  ? "bg-red-500 animate-pulse-dot" 
                  : "bg-green-500"
              }`}
            />
            <span className={`text-sm font-medium ${
              bay.isOccupied 
                ? "text-red-600 dark:text-red-400" 
                : "text-green-600 dark:text-green-400"
            }`}>
              {bay.isOccupied ? t("serviceBays.occupied") : t("serviceBays.available")}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bay.isOccupied && bay.jobCard ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{bay.jobCard.id}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{formatDate(bay.jobCard.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{bay.jobCard.registration}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{bay.jobCard.assignedTo}</span>
              </div>
            </div>
            <Link href="/job-cards" className="block">
              <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-details-${bay.bay.replace(/\s+/g, "-").toLowerCase()}`}>
                {t("dashboard.viewAll")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Wrench className="w-5 h-5 text-muted-foreground opacity-50" />
            </div>
            <p className="text-muted-foreground text-sm">{t("serviceBays.noActiveService")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TechnicianBayCard({ bay, t }: BayCardProps) {
  const daysDiff = bay.jobCard ? calculateDaysDiff(bay.jobCard.createdAt) : 0;
  
  return (
    <Card 
      className="border border-card-border overflow-hidden"
      data-testid={`bay-card-${bay.bay.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className={`h-2 ${bay.isOccupied ? "bg-red-500" : "bg-green-500"}`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">{bay.bay}</CardTitle>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                bay.isOccupied 
                  ? "bg-red-500 animate-pulse-dot" 
                  : "bg-green-500"
              }`}
            />
            <span className={`text-sm font-medium ${
              bay.isOccupied 
                ? "text-red-600 dark:text-red-400" 
                : "text-green-600 dark:text-green-400"
            }`}>
              {bay.isOccupied ? t("serviceBays.occupied") : t("serviceBays.available")}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bay.isOccupied && bay.jobCard ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">{bay.jobCard.id}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{formatDate(bay.jobCard.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Car className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">{bay.jobCard.registration}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{t("serviceBays.started")}: {formatDate(bay.jobCard.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Badge variant={daysDiff > 2 ? "destructive" : daysDiff > 0 ? "secondary" : "outline"}>
                {daysDiff === 0 ? t("serviceBays.today") : `${daysDiff} ${daysDiff === 1 ? t("serviceBays.day") : t("serviceBays.days")}`}
              </Badge>
            </div>

            <Link href="/job-cards" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-details-${bay.bay.replace(/\s+/g, "-").toLowerCase()}`}>
                {t("dashboard.viewAll")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Wrench className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-muted-foreground text-sm">{t("serviceBays.noActiveService")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("serviceBays.bayReady")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ServiceBays() {
  const { t } = useTranslation();
  const { isService } = useUserRole();
  
  const { data: bayStatus, isLoading } = useQuery<BayStatus[]>({
    queryKey: ["/api/bays/status"],
  });

  const washBays = bayStatus?.filter(b => WASH_BAYS.includes(b.bay as typeof WASH_BAYS[number])) || [];
  const technicianBays = bayStatus?.filter(b => TECHNICIAN_BAYS.includes(b.bay as typeof TECHNICIAN_BAYS[number])) || [];
  
  const filteredWashBays = washBays;
  const filteredTechBays = isService ? [] : technicianBays;
  
  const allFilteredBays = [...filteredWashBays, ...filteredTechBays];
  const occupiedBays = allFilteredBays.filter(b => b.isOccupied).length;
  const totalBays = allFilteredBays.length || (isService ? 2 : 8);
  const availableBays = totalBays - occupiedBays;
  const utilization = totalBays ? Math.round((occupiedBays / totalBays) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("serviceBays.title")}</h1>
        <p className="text-muted-foreground">{t("serviceBays.subtitle")}</p>
      </div>

      <Card className="border border-card-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary" data-testid="stat-active-bays">{occupiedBays}</p>
              <p className="text-sm text-muted-foreground">{t("serviceBays.activeBays")}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-available-bays">{availableBays}</p>
              <p className="text-sm text-muted-foreground">{t("serviceBays.availableBays")}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" data-testid="stat-utilization">{utilization}%</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.utilization")}</p>
            </div>
          </div>
          <div className="mt-6 h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
              style={{ width: `${utilization}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array(2).fill(0).map((_, i) => (
              <Card key={i} className="border border-card-border overflow-hidden">
                <div className="h-2 bg-muted" />
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-20 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="border border-card-border overflow-hidden">
                <div className="h-2 bg-muted" />
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-20 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredWashBays.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4" data-testid="text-wash-bays-section">{t("serviceBays.washBays")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredWashBays.map((bay) => (
                  <WashBayCard key={bay.bay} bay={bay} t={t} />
                ))}
              </div>
            </div>
          )}
          
          {filteredTechBays.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4" data-testid="text-technician-bays-section">{t("serviceBays.technicianBays")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTechBays.map((bay) => (
                  <TechnicianBayCard key={bay.bay} bay={bay} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
