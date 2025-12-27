import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { JOB_STATUSES } from "@shared/schema";

interface StatusBadgeProps {
  status: typeof JOB_STATUSES[number];
  className?: string;
}

const statusStyles: Record<typeof JOB_STATUSES[number], string> = {
  "Pending": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Oil Change": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Quality Check": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "Completed": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Delivered": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const statusTranslationKeys: Record<typeof JOB_STATUSES[number], string> = {
  "Pending": "jobCards.pending",
  "In Progress": "jobCards.inProgress",
  "Oil Change": "jobCards.oilChange",
  "Quality Check": "jobCards.qualityCheck",
  "Completed": "jobCards.completed",
  "Delivered": "jobCards.delivered",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("font-medium border-0", statusStyles[status], className)}
      data-testid={`badge-status-${status.toLowerCase().replace(" ", "-")}`}
    >
      {t(statusTranslationKeys[status])}
    </Badge>
  );
}
