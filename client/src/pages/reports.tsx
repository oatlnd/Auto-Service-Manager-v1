import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, CheckCircle, DollarSign, TrendingUp, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { useUserRole } from "@/contexts/UserRoleContext";
import type { JobCard } from "@shared/schema";
import { SERVICE_TYPES, JOB_STATUSES, HONDA_MODELS } from "@shared/schema";

interface ReportData {
  totalJobs: number;
  completedJobs: number;
  totalRevenue: number;
  averageJobValue: number;
  serviceTypeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  topModels: { model: string; count: number }[];
  technicianPerformance: { technician: string; count: number }[];
}

export default function Reports() {
  const { t } = useTranslation();
  const { canViewRevenue } = useUserRole();
  
  const { data: jobCards = [], isLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const reportData: ReportData = {
    totalJobs: jobCards.length,
    completedJobs: jobCards.filter(j => j.status === "Completed").length,
    totalRevenue: jobCards.filter(j => j.status === "Completed").reduce((sum, j) => sum + (j.cost || 0), 0),
    averageJobValue: jobCards.length > 0 
      ? Math.round(jobCards.reduce((sum, j) => sum + (j.cost || 0), 0) / jobCards.length) 
      : 0,
    serviceTypeDistribution: SERVICE_TYPES.reduce((acc, type) => {
      acc[type] = jobCards.filter(j => j.serviceType === type).length;
      return acc;
    }, {} as Record<string, number>),
    statusDistribution: JOB_STATUSES.reduce((acc, status) => {
      acc[status] = jobCards.filter(j => j.status === status).length;
      return acc;
    }, {} as Record<string, number>),
    topModels: HONDA_MODELS
      .map(model => ({ model, count: jobCards.filter(j => j.bikeModel === model).length }))
      .filter(m => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    technicianPerformance: Array.from(
      jobCards.reduce((acc, j) => {
        if (j.assignedTo) {
          acc.set(j.assignedTo, (acc.get(j.assignedTo) || 0) + 1);
        }
        return acc;
      }, new Map<string, number>())
    ).map(([technician, count]) => ({ technician, count }))
      .sort((a, b) => b.count - a.count),
  };

  const formatCurrency = (amount: number) => `LKR ${amount.toLocaleString()}`;

  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const statusColors: Record<string, string> = {
    "Pending": "bg-yellow-500",
    "In Progress": "bg-blue-500",
    "Quality Check": "bg-purple-500",
    "Completed": "bg-green-500",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("reports.title")}</h1>
        <p className="text-muted-foreground">{t("reports.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("reports.totalJobs")}
          value={reportData.totalJobs}
          icon={FileText}
          iconColor="text-primary"
          isLoading={isLoading}
          testId="stat-total-jobs"
        />
        <StatCard
          title={t("reports.completedJobs")}
          value={reportData.completedJobs}
          icon={CheckCircle}
          iconColor="text-green-600"
          isLoading={isLoading}
          testId="stat-completed-jobs"
        />
        {canViewRevenue ? (
          <StatCard
            title={t("reports.totalRevenue")}
            value={formatCurrency(reportData.totalRevenue)}
            icon={DollarSign}
            iconColor="text-green-600"
            isLoading={isLoading}
            testId="stat-total-revenue"
          />
        ) : (
          <Card className="border border-card-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reports.totalRevenue")}</p>
                  <p className="text-xs text-muted-foreground">{t("roles.admin")}/{t("roles.manager")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {canViewRevenue ? (
          <StatCard
            title={t("reports.avgJobValue")}
            value={formatCurrency(reportData.averageJobValue)}
            icon={TrendingUp}
            iconColor="text-blue-600"
            isLoading={isLoading}
            testId="stat-avg-job-value"
          />
        ) : (
          <Card className="border border-card-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reports.avgJobValue")}</p>
                  <p className="text-xs text-muted-foreground">{t("roles.admin")}/{t("roles.manager")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t("reports.serviceTypeDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : (
              SERVICE_TYPES.map((type) => {
                const count = reportData.serviceTypeDistribution[type];
                const percentage = getPercentage(count, reportData.totalJobs);
                return (
                  <div key={type} className="space-y-2" data-testid={`chart-service-${type.toLowerCase().replace(" ", "-")}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{type}</span>
                      <span className="text-sm text-muted-foreground">{count} jobs ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : (
              JOB_STATUSES.map((status) => {
                const count = reportData.statusDistribution[status];
                const percentage = getPercentage(count, reportData.totalJobs);
                return (
                  <div key={status} className="space-y-2" data-testid={`chart-status-${status.toLowerCase().replace(" ", "-")}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                        <span className="text-sm font-medium">{status}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count} jobs</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${statusColors[status]} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Bike Models</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            ) : reportData.topModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportData.topModels.map((item, index) => (
                  <div 
                    key={item.model} 
                    className="flex items-center justify-between p-2 rounded-md hover-elevate"
                    data-testid={`model-row-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm">{item.model}</span>
                    </div>
                    <Badge variant="secondary">{item.count} jobs</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Technician Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {reportData.technicianPerformance.map((tech) => (
                  <div 
                    key={tech.technician} 
                    className="flex items-center justify-between p-2 rounded-md hover-elevate"
                    data-testid={`tech-row-${tech.technician.toLowerCase().replace(" ", "-")}`}
                  >
                    <span className="font-medium text-sm">{tech.technician}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ 
                            width: `${getPercentage(tech.count, Math.max(...reportData.technicianPerformance.map(t => t.count), 1))}%` 
                          }}
                        />
                      </div>
                      <Badge variant="outline" className="min-w-12 justify-center">{tech.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
