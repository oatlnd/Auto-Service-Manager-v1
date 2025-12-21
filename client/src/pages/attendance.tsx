import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Clock, Calendar, Users, AlertCircle, Loader2, CheckCircle, XCircle, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/UserRoleContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, Attendance } from "@shared/schema";
import { ATTENDANCE_STATUSES } from "@shared/schema";

export default function AttendancePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin, isManager } = useUserRole();
  const canManageToday = isAdmin || isManager;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editRecord, setEditRecord] = useState<Attendance | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: todayAttendance = [], isLoading: loadingToday } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: historicalAttendance = [], isLoading: loadingHistory } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/attendance?date=${selectedDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: { staffId: string; status: typeof ATTENDANCE_STATUSES[number]; checkInTime?: string }) => {
      return apiRequest("POST", "/api/attendance", {
        ...data,
        date: today,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: t("common.success"), description: t("messages.addedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: string; checkInTime?: string; checkOutTime?: string; notes?: string } }) => {
      return apiRequest("PATCH", `/api/attendance/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setEditRecord(null);
      toast({ title: t("common.success"), description: t("messages.updatedSuccess") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message || t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const getAttendanceForStaff = (staffId: string) => {
    return todayAttendance.find((a) => a.staffId === staffId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
      case "Absent":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
      case "Late":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"><AlertTriangle className="w-3 h-3 mr-1" />Late</Badge>;
      case "Leave":
        return <Badge variant="secondary">Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const presentCount = todayAttendance.filter((a) => a.status === "Present" || a.status === "Late").length;
  const absentCount = todayAttendance.filter((a) => a.status === "Absent").length;
  const onLeaveCount = todayAttendance.filter((a) => a.status === "Leave").length;
  const activeStaff = staffList.filter((s) => s.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("attendance.title")}</h1>
          <p className="text-muted-foreground">{t("attendance.subtitle")}</p>
        </div>
        <Card className="border border-card-border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div className="text-right">
                <p className="text-lg font-bold" data-testid="text-current-time">
                  {format(currentTime, "hh:mm:ss a")}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-current-date">
                  {format(currentTime, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-present-count">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-absent-count">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-leave-count">{onLeaveCount}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-active">{activeStaff.length}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <Card className="border border-card-border">
            <CardHeader>
              <CardTitle className="text-lg">Mark Attendance - {format(new Date(), "MMMM d, yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingToday ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                        </TableRow>
                      ))
                    ) : activeStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">No active staff members</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeStaff.map((staff) => {
                        const attendance = getAttendanceForStaff(staff.id);
                        return (
                          <TableRow key={staff.id} data-testid={`row-attendance-${staff.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{staff.name}</p>
                                <p className="text-xs text-muted-foreground">{staff.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{staff.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {attendance ? getStatusBadge(attendance.status) : <Badge variant="outline">Not Marked</Badge>}
                            </TableCell>
                            <TableCell>
                              {attendance?.checkInTime || "-"}
                            </TableCell>
                            <TableCell>
                              {attendance ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditRecord(attendance)}
                                  data-testid={`button-edit-attendance-${staff.id}`}
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => markAttendanceMutation.mutate({
                                      staffId: staff.id,
                                      status: "Present",
                                      checkInTime: format(new Date(), "HH:mm"),
                                    })}
                                    disabled={markAttendanceMutation.isPending}
                                    data-testid={`button-mark-present-${staff.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t("attendance.present")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAttendanceMutation.mutate({
                                      staffId: staff.id,
                                      status: "Late",
                                      checkInTime: format(new Date(), "HH:mm"),
                                    })}
                                    disabled={markAttendanceMutation.isPending}
                                    data-testid={`button-mark-late-${staff.id}`}
                                  >
                                    {t("attendance.late")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAttendanceMutation.mutate({
                                      staffId: staff.id,
                                      status: "Leave",
                                    })}
                                    disabled={markAttendanceMutation.isPending}
                                    data-testid={`button-mark-leave-${staff.id}`}
                                  >
                                    {t("attendance.leave")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => markAttendanceMutation.mutate({
                                      staffId: staff.id,
                                      status: "Absent",
                                    })}
                                    disabled={markAttendanceMutation.isPending}
                                    data-testid={`button-mark-absent-${staff.id}`}
                                  >
                                    {t("attendance.absent")}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="border border-card-border">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg">Attendance History</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="date-select" className="sr-only">Select Date</Label>
                <Input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                  data-testid="input-date-select"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Notes</TableHead>
                      {isAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingHistory ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          {isAdmin && <TableCell><Skeleton className="h-8 w-16" /></TableCell>}
                        </TableRow>
                      ))
                    ) : historicalAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">No attendance records for this date</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historicalAttendance.map((record) => (
                        <TableRow key={record.id} data-testid={`row-history-${record.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.staffName}</p>
                              <p className="text-xs text-muted-foreground">{record.staffId}</p>
                            </div>
                          </TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>{record.checkInTime || "-"}</TableCell>
                          <TableCell>{record.checkOutTime || "-"}</TableCell>
                          <TableCell className="max-w-32 truncate">{record.notes || "-"}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditRecord(record)}
                                data-testid={`button-edit-history-${record.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditAttendanceDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        record={editRecord}
        onSubmit={(data) => {
          if (editRecord) {
            updateAttendanceMutation.mutate({ id: editRecord.id, data });
          }
        }}
        isPending={updateAttendanceMutation.isPending}
        isAdmin={isAdmin}
      />
    </div>
  );
}

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Attendance | null;
  onSubmit: (data: { status?: string; checkInTime?: string; checkOutTime?: string; notes?: string }) => void;
  isPending: boolean;
  isAdmin: boolean;
}

function EditAttendanceDialog({ open, onOpenChange, record, onSubmit, isPending, isAdmin }: EditAttendanceDialogProps) {
  const [formData, setFormData] = useState<{
    status: typeof ATTENDANCE_STATUSES[number];
    checkInTime: string;
    checkOutTime: string;
    notes: string;
  }>({
    status: "Present",
    checkInTime: "",
    checkOutTime: "",
    notes: "",
  });

  useEffect(() => {
    if (open && record) {
      setFormData({
        status: record.status,
        checkInTime: record.checkInTime || "",
        checkOutTime: record.checkOutTime || "",
        notes: record.notes || "",
      });
    }
  }, [open, record]);

  if (!record) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const isHistorical = record.date !== today;
  const canEdit = !isHistorical || isAdmin;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <DialogDescription>
            {record.staffName} - {record.date}
            {isHistorical && !isAdmin && (
              <span className="text-destructive block mt-1">
                Only Admin can modify previous day records
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as typeof ATTENDANCE_STATUSES[number] }))}
              disabled={!canEdit}
            >
              <SelectTrigger data-testid="select-edit-attendance-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-checkIn">Check In</Label>
              <Input
                id="edit-checkIn"
                type="time"
                value={formData.checkInTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, checkInTime: e.target.value }))}
                disabled={!canEdit}
                data-testid="input-edit-checkin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-checkOut">Check Out</Label>
              <Input
                id="edit-checkOut"
                type="time"
                value={formData.checkOutTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                disabled={!canEdit}
                data-testid="input-edit-checkout"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes..."
              disabled={!canEdit}
              data-testid="input-edit-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !canEdit} data-testid="button-save-attendance">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
