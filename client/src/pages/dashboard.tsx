import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle, Clock, DollarSign, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import type { JobCard, DailyStatistics, BayStatus } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DailyStatistics>({
    queryKey: ["/api/statistics"],
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards/recent"],
  });

  const { data: bayStatus, isLoading: baysLoading } = useQuery<BayStatus[]>({
    queryKey: ["/api/bays/status"],
  });

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const occupiedBays = bayStatus?.filter(b => b.isOccupied).length || 0;
  const totalBays = 5;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's today's overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Jobs"
          value={stats?.today || 0}
          icon={Briefcase}
          iconColor="text-primary"
          isLoading={statsLoading}
          testId="stat-today-jobs"
        />
        <StatCard
          title="Completed"
          value={stats?.completed || 0}
          icon={CheckCircle}
          iconColor="text-green-600"
          isLoading={statsLoading}
          testId="stat-completed"
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgress || 0}
          icon={Clock}
          iconColor="text-blue-600"
          isLoading={statsLoading}
          testId="stat-in-progress"
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.revenue || 0)}
          icon={DollarSign}
          iconColor="text-green-600"
          isLoading={statsLoading}
          testId="stat-revenue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">Recent Job Cards</CardTitle>
            <Link href="/job-cards">
              <Button variant="outline" size="sm" data-testid="link-view-all-jobs">View All</Button>
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
            <CardTitle className="text-lg font-semibold">Service Bays</CardTitle>
            <Link href="/service-bays">
              <Button variant="outline" size="sm" data-testid="link-view-all-bays">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {baysLoading ? (
              Array(5).fill(0).map((_, i) => (
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
                      {bay.isOccupied ? "Occupied" : "Available"}
                    </span>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Utilization</span>
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
                    <span>{occupiedBays} Active</span>
                    <span>{totalBays - occupiedBays} Available</span>
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
