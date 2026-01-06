import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SystemLog } from "@shared/schema";
import { 
  Search, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Trash2, 
  Eye,
  AlertTriangle,
  AlertCircle,
  Info,
  Server,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const SRI_LANKA_TZ = "Asia/Colombo";

export default function SystemLogs() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const pageSize = 25;

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (levelFilter !== "all") params.append("level", levelFilter);
    if (sourceFilter !== "all") params.append("source", sourceFilter);
    if (fromDate) params.append("fromDate", format(fromDate, "yyyy-MM-dd"));
    if (toDate) params.append("toDate", format(toDate, "yyyy-MM-dd"));
    if (search.trim()) params.append("search", search.trim());
    params.append("limit", pageSize.toString());
    params.append("offset", (page * pageSize).toString());
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<{ logs: SystemLog[]; total: number }>({
    queryKey: ["/api/system-logs", levelFilter, sourceFilter, fromDate, toDate, search, page],
    queryFn: async () => {
      const response = await fetch(`/api/system-logs?${buildQueryParams()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
  });

  const clearOldLogsMutation = useMutation({
    mutationFn: async (daysOld: number) => {
      const response = await apiRequest("POST", "/api/system-logs/clear-old", { daysOld });
      return response.json();
    },
    onSuccess: (data: { deletedCount: number }) => {
      toast({
        title: t("systemLogs.logsCleared"),
        description: t("systemLogs.logsClearedDesc", { count: data.deletedCount }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-logs"] });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("systemLogs.clearError"),
        variant: "destructive",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/system-logs/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t("systemLogs.logDeleted"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system-logs"] });
      setSelectedLog(null);
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {t("systemLogs.levels.error")}
          </Badge>
        );
      case "warn":
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3" />
            {t("systemLogs.levels.warn")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            {t("systemLogs.levels.info")}
          </Badge>
        );
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "api":
        return <Server className="h-4 w-4" />;
      case "frontend":
        return <Globe className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const formatTime = (dateStr: string) => {
    return formatInTimeZone(new Date(dateStr), SRI_LANKA_TZ, "yyyy-MM-dd HH:mm:ss");
  };

  const resetFilters = () => {
    setSearch("");
    setLevelFilter("all");
    setSourceFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(0);
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("systemLogs.title")}</h1>
        <p className="text-muted-foreground">{t("systemLogs.subtitle")}</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("systemLogs.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("common.search")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("systemLogs.searchPlaceholder")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9"
                  data-testid="input-search-logs"
                />
              </div>
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("systemLogs.level")}</label>
              <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(0); }}>
                <SelectTrigger data-testid="select-level-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="info">{t("systemLogs.levels.info")}</SelectItem>
                  <SelectItem value="warn">{t("systemLogs.levels.warn")}</SelectItem>
                  <SelectItem value="error">{t("systemLogs.levels.error")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("systemLogs.source")}</label>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="api">{t("systemLogs.sources.api")}</SelectItem>
                  <SelectItem value="frontend">{t("systemLogs.sources.frontend")}</SelectItem>
                  <SelectItem value="system">{t("systemLogs.sources.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("reports.fromDate")}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-from-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd/MM/yy") : t("common.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => { setFromDate(d); setPage(0); }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("reports.toDate")}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-to-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd/MM/yy") : t("common.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => { setToDate(d); setPage(0); }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="outline" onClick={resetFilters} data-testid="button-reset-filters">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.reset")}
            </Button>

            <Button 
              variant="destructive" 
              onClick={() => clearOldLogsMutation.mutate(90)}
              disabled={clearOldLogsMutation.isPending}
              data-testid="button-clear-old-logs"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("systemLogs.clearOld")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-lg">
            {t("systemLogs.logEntries")} ({total})
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()} data-testid="button-refresh-logs">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("systemLogs.noLogs")}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-[180px]">
                      {getSourceIcon(log.source)}
                      {getLevelBadge(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.message}</p>
                      {log.endpoint && (
                        <p className="text-sm text-muted-foreground truncate">
                          {log.method} {log.endpoint}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      <div>{formatTime(log.createdAt)}</div>
                      {log.userName && <div className="text-xs">{log.userName}</div>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                      data-testid={`button-view-log-${log.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t("common.page")} {page + 1} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getLevelBadge(selectedLog.level)}
              {t("systemLogs.logDetails")}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("systemLogs.logId")}</label>
                    <p className="font-mono text-sm">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("systemLogs.timestamp")}</label>
                    <p className="text-sm">{formatTime(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">{t("systemLogs.source")}</label>
                    <p className="text-sm flex items-center gap-2">
                      {getSourceIcon(selectedLog.source)}
                      {t(`systemLogs.sources.${selectedLog.source}`)}
                    </p>
                  </div>
                  {selectedLog.userName && (
                    <div>
                      <label className="text-sm text-muted-foreground">{t("systemLogs.user")}</label>
                      <p className="text-sm">{selectedLog.userName}</p>
                    </div>
                  )}
                  {selectedLog.endpoint && (
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground">{t("systemLogs.endpoint")}</label>
                      <p className="font-mono text-sm">
                        {selectedLog.method} {selectedLog.endpoint}
                        {selectedLog.statusCode && ` (${selectedLog.statusCode})`}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">{t("systemLogs.message")}</label>
                  <p className="mt-1">{selectedLog.message}</p>
                </div>

                {selectedLog.stack && (
                  <div>
                    <label className="text-sm text-muted-foreground">{t("systemLogs.stackTrace")}</label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.stack}
                    </pre>
                  </div>
                )}

                {selectedLog.context && (
                  <div>
                    <label className="text-sm text-muted-foreground">{t("systemLogs.context")}</label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                      {JSON.stringify(selectedLog.context, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => deleteLogMutation.mutate(selectedLog.id)}
                    disabled={deleteLogMutation.isPending}
                    data-testid="button-delete-log"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("common.delete")}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedLog(null)} data-testid="button-close-dialog">
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
