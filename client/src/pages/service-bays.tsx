import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wrench, Clock, User, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import type { BayStatus } from "@shared/schema";

export default function ServiceBays() {
  const { t } = useTranslation();
  const { data: bayStatus, isLoading } = useQuery<BayStatus[]>({
    queryKey: ["/api/bays/status"],
  });

  const occupiedBays = bayStatus?.filter(b => b.isOccupied).length || 0;
  const availableBays = (bayStatus?.length || 5) - occupiedBays;
  const utilization = bayStatus?.length ? Math.round((occupiedBays / bayStatus.length) * 100) : 0;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i} className="border border-card-border overflow-hidden">
              <div className="h-2 bg-muted" />
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-20 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : (
          bayStatus?.map((bay) => (
            <Card 
              key={bay.bay} 
              className="border border-card-border overflow-hidden"
              data-testid={`bay-card-${bay.bay.replace(" ", "-").toLowerCase()}`}
            >
              <div className={`h-2 ${bay.isOccupied ? "bg-red-500" : "bg-green-500"}`} />
              <CardHeader className="pb-3">
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{bay.jobCard.id}</Badge>
                      <StatusBadge status={bay.jobCard.status} />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{bay.jobCard.customerName}</p>
                          <p className="text-xs text-muted-foreground">{bay.jobCard.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Car className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{bay.jobCard.bikeModel}</p>
                          <p className="text-xs text-muted-foreground">{bay.jobCard.registration}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{bay.jobCard.assignedTo}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{bay.jobCard.estimatedTime}</p>
                      </div>
                    </div>

                    <Link href="/job-cards">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-details-${bay.bay.replace(" ", "-").toLowerCase()}`}>
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
          ))
        )}
      </div>
    </div>
  );
}
