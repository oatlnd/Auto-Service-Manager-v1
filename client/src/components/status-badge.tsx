import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JOB_STATUSES } from "@shared/schema";

interface StatusBadgeProps {
  status: typeof JOB_STATUSES[number];
  className?: string;
}

const statusStyles: Record<typeof JOB_STATUSES[number], string> = {
  "Pending": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Quality Check": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Completed": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("font-medium border-0", statusStyles[status], className)}
      data-testid={`badge-status-${status.toLowerCase().replace(" ", "-")}`}
    >
      {status}
    </Badge>
  );
}
