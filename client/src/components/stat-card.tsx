import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
  testId?: string;
}

export function StatCard({ title, value, icon: Icon, iconColor = "text-primary", isLoading, testId }: StatCardProps) {
  return (
    <Card className="border border-card-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground font-medium">{title}</span>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-semibold tabular-nums" data-testid={testId}>{value}</span>
            )}
          </div>
          <div className={cn("p-3 rounded-md bg-muted/50", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
