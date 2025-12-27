import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Briefcase, CheckCircle, Clock, CalendarIcon, Pause, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import type { JobCard, DailyStatistics, BayStatus, ServiceCategoryStats } from "@shared/schema";

export default function Dashboard() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const dateParam = format(selectedDate, "yyyy-MM-dd");
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  
  const { data: stats, isLoading: statsLoading } = useQuery<DailyStatistics>({
    queryKey: ["/api/statistics", dateParam],
    queryFn: async () => {
      const res = await fetch(`/api/statistics?date=${dateParam}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (!res.ok) throw new Error("Failed to fetch statistics");
      return res.json();
    },
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards/recent"],
  });

  const { data: bayStatus, isLoading: baysLoading } = useQuery<BayStatus[]>({
    queryKey: ["/api/bays/status"],
  });

  const { data: categoryStats, isLoading: categoryLoading } = useQuery<ServiceCategoryStats[]>({
    queryKey: ["/api/statistics/by-category", dateParam],
    queryFn: async () => {
      const res = await fetch(`/api/statistics/by-category?date=${dateParam}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (!res.ok) throw new Error("Failed to fetch category statistics");
      return res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const occupiedBays = bayStatus?.filter(b => b.isOccupied).length || 0;
  const totalBays = 6;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-date-picker">
                <CalendarIcon className="w-4 h-4" />
                {isToday ? t("dashboard.today") : format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {!isToday && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedDate(new Date())}
              data-testid="button-reset-to-today"
            >
              {t("dashboard.today")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-card-border" data-testid="stat-today-jobs">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isToday ? t("dashboard.todaysJobs") : `${t("dashboard.jobs")} (${format(selectedDate, "dd/MM")})`}
                </p>
                <p className="text-2xl font-bold">{stats?.today || 0}</p>
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1">{t("jobCards.paidService")}: {stats?.todayByCategory?.paidService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.freeService")}: {stats?.todayByCategory?.freeService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.repair")}: {stats?.todayByCategory?.repair || 0}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border" data-testid="stat-completed">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.completed")}</p>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1">{t("jobCards.paidService")}: {stats?.completedByCategory?.paidService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.freeService")}: {stats?.completedByCategory?.freeService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.repair")}: {stats?.completedByCategory?.repair || 0}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border" data-testid="stat-in-progress">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.inProgress")}</p>
                <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1">{t("jobCards.paidService")}: {stats?.inProgressByCategory?.paidService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.freeService")}: {stats?.inProgressByCategory?.freeService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.repair")}: {stats?.inProgressByCategory?.repair || 0}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border" data-testid="stat-pending">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Pause className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.pending")}</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
            </div>
            {statsLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1">{t("jobCards.paidService")}: {stats?.pendingByCategory?.paidService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.freeService")}: {stats?.pendingByCategory?.freeService || 0}</Badge>
                <Badge variant="outline" className="gap-1">{t("jobCards.repair")}: {stats?.pendingByCategory?.repair || 0}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            {isToday ? t("dashboard.todaysJobsByType") : `${t("dashboard.jobsByTypeForDate")} ${format(selectedDate, "dd/MM/yyyy")}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4 rounded-md bg-muted/30">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <Skeleton className="h-8 w-12 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categoryStats?.map((stat) => (
                <div 
                  key={stat.category} 
                  className="p-4 rounded-md bg-muted/30"
                  data-testid={`category-stat-${stat.category.toLowerCase().replace(" ", "-")}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">
                      {t(`jobCards.${stat.category === "Paid Service" ? "paidService" : stat.category === "Company Free Service" ? "freeService" : "repair"}`)}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold mb-1">{stat.total}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      {stat.completed} {t("dashboard.completed")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      {stat.inProgress} {t("dashboard.inProgress")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">{t("dashboard.recentJobCards")}</CardTitle>
            <Link href="/job-cards">
              <Button variant="outline" size="sm" data-testid="link-view-all-jobs">{t("dashboard.viewAll")}</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-md bg-muted/30">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : recentJobs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No job cards yet</p>
              </div>
            ) : (
              recentJobs?.map((job) => (
                <div 
                  key={job.id} 
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/30 hover-elevate"
                  data-testid={`job-card-${job.id}`}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{job.customerName}</span>
                      <Badge variant="outline" className="text-xs">{job.id}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {job.bikeModel} - {job.registration}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">{t("serviceBays.title")}</CardTitle>
            <Link href="/service-bays">
              <Button variant="outline" size="sm" data-testid="link-view-all-bays">{t("dashboard.viewAll")}</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {baysLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))
            ) : (
              <>
                {bayStatus?.map((bay) => (
                  <div 
                    key={bay.bay} 
                    className="flex items-center gap-3 p-2 rounded-md"
                    data-testid={`bay-status-${bay.bay.replace(" ", "-").toLowerCase()}`}
                  >
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        bay.isOccupied 
                          ? "bg-red-500 animate-pulse-dot" 
                          : "bg-green-500"
                      }`}
                    />
                    <span className="font-medium text-sm flex-1">{bay.bay}</span>
                    <span className={`text-xs ${bay.isOccupied ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {bay.isOccupied ? t("serviceBays.occupied") : t("serviceBays.available")}
                    </span>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("dashboard.utilization")}</span>
                    <span className="font-semibold" data-testid="bay-utilization">
                      {Math.round((occupiedBays / totalBays) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(occupiedBays / totalBays) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{occupiedBays} {t("serviceBays.activeBays")}</span>
                    <span>{totalBays - occupiedBays} {t("serviceBays.available")}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
