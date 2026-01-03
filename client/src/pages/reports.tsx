import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, subDays } from "date-fns";
import { FileText, CheckCircle, DollarSign, TrendingUp, Lock, Download, CalendarIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRole } from "@/contexts/UserRoleContext";
import type { JobCard } from "@shared/schema";
import { SERVICE_TYPES, JOB_STATUSES, BIKE_MODELS } from "@shared/schema";

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
  
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);
  
  const { data: jobCards = [], isLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const { data: reportJobCards = [], isLoading: isLoadingReport, refetch: refetchReport } = useQuery<JobCard[]>({
    queryKey: ["/api/reports/job-cards", format(fromDate, "yyyy-MM-dd"), format(toDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/reports/job-cards?from=${format(fromDate, "yyyy-MM-dd")}&to=${format(toDate, "yyyy-MM-dd")}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch report');
      return res.json();
    },
    enabled: canViewRevenue,
  });

  const handleExport = async (exportType: "csv" | "pdf") => {
    setIsExporting(exportType);
    try {
      const token = localStorage.getItem("authToken");
      const fromStr = format(fromDate, "yyyy-MM-dd");
      const toStr = format(toDate, "yyyy-MM-dd");
      const res = await fetch(`/api/reports/job-cards.${exportType}?from=${fromStr}&to=${toStr}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-cards-report-${fromStr}-to-${toStr}.${exportType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

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
    topModels: BIKE_MODELS
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

      {canViewRevenue && (
        <Card className="border border-card-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-semibold">{t("reports.jobCardReport", "Job Card Report")}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-from-date">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(fromDate, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={(date) => date && setFromDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-to-date">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(toDate, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={(date) => date && setToDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  disabled={isExporting !== null || reportJobCards.length === 0}
                  data-testid="button-export-csv"
                >
                  {isExporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  disabled={isExporting !== null || reportJobCards.length === 0}
                  data-testid="button-export-pdf"
                >
                  {isExporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingReport ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : reportJobCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("reports.noJobCardsFound", "No job cards found for the selected date range")}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <Badge variant="secondary">{reportJobCards.length} Jobs</Badge>
                  <span className="text-muted-foreground">
                    Total: Rs. {reportJobCards.reduce((sum, j) => sum + (j.cost || 0) + (j.partsTotal || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Job ID</TableHead>
                        <TableHead className="w-[50px]">Tag</TableHead>
                        <TableHead className="w-[90px]">Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Bike</TableHead>
                        <TableHead>Reg No</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Parts</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportJobCards.map((job) => {
                        const partsTotal = job.partsTotal || 0;
                        const total = (job.cost || 0) + partsTotal;
                        return (
                          <TableRow key={job.id} data-testid={`report-row-${job.id}`}>
                            <TableCell className="font-medium">{job.id}</TableCell>
                            <TableCell>{job.tagNo || '-'}</TableCell>
                            <TableCell>{format(new Date(job.createdAt), "dd/MM/yy")}</TableCell>
                            <TableCell>{job.customerName}</TableCell>
                            <TableCell>{job.bikeModel}</TableCell>
                            <TableCell>{job.registration}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{job.serviceType}</TableCell>
                            <TableCell>
                              <Badge variant={job.status === "Completed" || job.status === "Delivered" ? "default" : "secondary"}>
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">Rs. {(job.cost || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">Rs. {partsTotal.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">Rs. {total.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
