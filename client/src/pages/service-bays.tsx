import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wrench, Calendar, Car, Hash, Clock, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useUserRole } from "@/contexts/UserRoleContext";
import { WASH_BAYS, TECHNICIAN_BAYS, JOB_STATUSES, SERVICE_CATEGORIES, SERVICE_TYPE_DETAILS, getStatusesForCategory } from "@shared/schema";
import type { BayStatus, JobCard } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  onStatusChange: (jobId: string, status: string, serviceCategory: string) => void;
  isUpdating: boolean;
  updatingJobId: string | null;
}

function WashBayCard({ bay, t, onStatusChange, isUpdating, updatingJobId }: BayCardProps) {
  const jobs = bay.jobCards || (bay.jobCard ? [bay.jobCard] : []);
  
  const getStatusKey = (status: string) => {
    if (status === "Pending") return "pending";
    if (status === "In Progress") return "inProgress";
    if (status === "Oil Change") return "oilChange";
    if (status === "Quality Check") return "qualityCheck";
    if (status === "Completed") return "completed";
    return "delivered";
  };
  
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
              {jobs.length > 0 ? `${jobs.length} ${t("serviceBays.jobs")}` : t("serviceBays.available")}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-3">
              {jobs.map((job) => {
                const serviceCategory = SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS]?.category || "Paid Service";
                const statuses = getStatusesForCategory(serviceCategory);
                const isJobUpdating = isUpdating && updatingJobId === job.id;
                return (
                  <div 
                    key={job.id} 
                    className="p-3 rounded-md bg-muted/30 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{job.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{job.registration}</span>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(job.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{job.assignedTo}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Select
                        value={job.status}
                        onValueChange={(newStatus) => onStatusChange(job.id, newStatus, serviceCategory)}
                        disabled={isJobUpdating}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid={`select-status-${job.id}`}>
                          {isJobUpdating ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{t("common.updating")}</span>
                            </div>
                          ) : (
                            <SelectValue placeholder={t("jobCards.updateStatus")} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(`jobCards.${getStatusKey(status)}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
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

function TechnicianBayCard({ bay, t, onStatusChange, isUpdating, updatingJobId }: BayCardProps) {
  const daysDiff = bay.jobCard ? calculateDaysDiff(bay.jobCard.createdAt) : 0;
  const job = bay.jobCard;
  
  const getStatusKey = (status: string) => {
    if (status === "Pending") return "pending";
    if (status === "In Progress") return "inProgress";
    if (status === "Oil Change") return "oilChange";
    if (status === "Quality Check") return "qualityCheck";
    if (status === "Completed") return "completed";
    return "delivered";
  };
  
  const serviceCategory = job ? (SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS]?.category || "Paid Service") : "Paid Service";
  const statuses = job ? getStatusesForCategory(serviceCategory) : [];
  const isJobUpdating = job && isUpdating && updatingJobId === job.id;
  
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
        {bay.isOccupied && job ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">{job.id}</span>
              </div>
              <StatusBadge status={job.status} />
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{formatDate(job.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Car className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">{job.registration}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{t("serviceBays.started")}: {formatDate(job.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Wrench className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Badge variant={daysDiff > 2 ? "destructive" : daysDiff > 0 ? "secondary" : "outline"}>
                {daysDiff === 0 ? t("serviceBays.today") : `${daysDiff} ${daysDiff === 1 ? t("serviceBays.day") : t("serviceBays.days")}`}
              </Badge>
            </div>

            <div className="pt-2">
              <Select
                value={job.status}
                onValueChange={(newStatus) => onStatusChange(job.id, newStatus, serviceCategory)}
                disabled={isJobUpdating}
              >
                <SelectTrigger className="h-8 text-xs" data-testid={`select-status-${job.id}`}>
                  {isJobUpdating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{t("common.updating")}</span>
                    </div>
                  ) : (
                    <SelectValue placeholder={t("jobCards.updateStatus")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`jobCards.${getStatusKey(status)}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
  const { toast } = useToast();
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  
  const { data: bayStatus, isLoading } = useQuery<BayStatus[]>({
    queryKey: ["/api/bays/status"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/job-cards/${id}/status`, { status });
      return res.json();
    },
    onMutate: ({ id }) => {
      setUpdatingJobId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bays/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      toast({
        title: t("common.success"),
        description: t("jobCards.statusUpdated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingJobId(null);
    },
  });

  const handleStatusChange = (jobId: string, status: string, _serviceCategory: string) => {
    updateStatusMutation.mutate({ id: jobId, status });
  };

  const washBays = bayStatus?.filter(b => WASH_BAYS.includes(b.bay as typeof WASH_BAYS[number])) || [];
  const technicianBays = bayStatus?.filter(b => TECHNICIAN_BAYS.includes(b.bay as typeof TECHNICIAN_BAYS[number])) || [];
  
  const combinedWashBay = washBays.length > 0 ? {
    bay: t("serviceBays.washBay") as typeof WASH_BAYS[number],
    isOccupied: washBays.some(b => b.isOccupied),
    jobCards: washBays.flatMap(b => b.jobCards || (b.jobCard ? [b.jobCard] : [])),
  } as BayStatus : null;
  
  const filteredTechBays = isService ? [] : technicianBays;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("serviceBays.title")}</h1>
      </div>

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
          {combinedWashBay && (
            <div>
              <h2 className="text-lg font-semibold mb-4" data-testid="text-wash-bays-section">{t("serviceBays.washBay")}</h2>
              <div className="grid grid-cols-1 gap-6">
                <WashBayCard 
                  bay={combinedWashBay} 
                  t={t} 
                  onStatusChange={handleStatusChange}
                  isUpdating={updateStatusMutation.isPending}
                  updatingJobId={updatingJobId}
                />
              </div>
            </div>
          )}
          
          {filteredTechBays.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4" data-testid="text-technician-bays-section">{t("serviceBays.technicianBays")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTechBays.map((bay) => (
                  <TechnicianBayCard 
                    key={bay.bay} 
                    bay={bay} 
                    t={t}
                    onStatusChange={handleStatusChange}
                    isUpdating={updateStatusMutation.isPending}
                    updatingJobId={updatingJobId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
