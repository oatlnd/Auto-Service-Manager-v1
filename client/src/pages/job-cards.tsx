import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Search, Eye, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/UserRoleContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JobCard, JOB_STATUSES } from "@shared/schema";
import { HONDA_MODELS, BAYS, TECHNICIANS, SERVICE_TYPES } from "@shared/schema";

interface FormData {
  customerName: string;
  phone: string;
  bikeModel: typeof HONDA_MODELS[number];
  registration: string;
  odometer: number;
  serviceType: typeof SERVICE_TYPES[number];
  status: typeof JOB_STATUSES[number];
  bay: typeof BAYS[number];
  assignedTo: typeof TECHNICIANS[number];
  cost: number;
  estimatedTime: string;
  repairDetails: string;
}

const initialFormData: FormData = {
  customerName: "",
  phone: "",
  bikeModel: "Shine",
  registration: "",
  odometer: 0,
  serviceType: "Regular Service",
  status: "Pending",
  bay: "Bay 1",
  assignedTo: "Technician 1",
  cost: 0,
  estimatedTime: "",
  repairDetails: "",
};

export default function JobCards() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canViewRevenue, isLimitedRole, isService } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const { data: jobCards = [], isLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/job-cards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bays/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards/recent"] });
      setIsCreateOpen(false);
      toast({ title: t("common.success"), description: t("messages.addedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      return apiRequest("PATCH", `/api/job-cards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bays/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards/recent"] });
      setIsEditOpen(false);
      setSelectedJob(null);
      toast({ title: t("common.success"), description: t("messages.updatedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/job-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bays/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards/recent"] });
      setDeleteJobId(null);
      toast({ title: t("common.success"), description: t("messages.deletedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: typeof JOB_STATUSES[number] }) => {
      return apiRequest("PATCH", `/api/job-cards/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bays/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards/recent"] });
      if (selectedJob) {
        setSelectedJob({ ...selectedJob, status: variables.status });
      }
      toast({ title: t("common.success"), description: t("messages.updatedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const filteredJobs = jobCards.filter((job) => {
    const matchesSearch = 
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    
    const limitedRoleStatuses = ["Pending", "In Progress"];
    const matchesLimitedRole = !isLimitedRole || limitedRoleStatuses.includes(job.status);
    
    const matchesServiceBay = !isService || job.bay === "Wash Bay";
    
    return matchesSearch && matchesStatus && matchesLimitedRole && matchesServiceBay;
  });

  const formatCurrency = (amount: number) => `LKR ${amount.toLocaleString()}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("jobCards.title")}</h1>
          <p className="text-muted-foreground">{t("jobCards.subtitle")}</p>
        </div>
        {!isLimitedRole && (
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-new-job-card">
            <Plus className="w-4 h-4 mr-2" />
            {t("jobCards.addJobCard")}
          </Button>
        )}
      </div>

      <Card className="border border-card-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("jobCards.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                {!isLimitedRole && (
                  <>
                    <SelectItem value="Quality Check">Quality Check</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Bike Details</TableHead>
                  <TableHead className="hidden sm:table-cell">Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Bay</TableHead>
                  {canViewRevenue && <TableHead className="hidden md:table-cell">Cost</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      {canViewRevenue && <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>}
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canViewRevenue ? 8 : 7} className="text-center py-12">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        {searchQuery || statusFilter !== "all" 
                          ? "No job cards match your search" 
                          : "No job cards yet. Create your first one!"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id} className="hover-elevate" data-testid={`row-job-${job.id}`}>
                      <TableCell className="font-medium">{job.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.customerName}</p>
                          <p className="text-xs text-muted-foreground">{job.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p>{job.bikeModel}</p>
                          <p className="text-xs text-muted-foreground">{job.registration}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{job.serviceType}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{job.bay}</TableCell>
                      {canViewRevenue && (
                        <TableCell className="hidden md:table-cell font-medium">
                          {formatCurrency(job.cost || 0)}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedJob(job);
                              setIsViewOpen(true);
                            }}
                            data-testid={`button-view-${job.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!isLimitedRole && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedJob(job);
                                  setIsEditOpen(true);
                                }}
                                data-testid={`button-edit-${job.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteJobId(job.id)}
                                data-testid={`button-delete-${job.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateJobCardDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <ViewJobCardDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        job={selectedJob}
        onStatusChange={(status) => {
          if (selectedJob) {
            updateStatusMutation.mutate({ id: selectedJob.id, status });
          }
        }}
        isUpdating={updateStatusMutation.isPending}
        isLimitedRole={isLimitedRole}
        canViewRevenue={canViewRevenue}
      />

      <EditJobCardDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedJob(null);
        }}
        job={selectedJob}
        onSubmit={(data) => {
          if (selectedJob) {
            updateMutation.mutate({ id: selectedJob.id, data });
          }
        }}
        isPending={updateMutation.isPending}
      />

      <AlertDialog open={!!deleteJobId} onOpenChange={() => setDeleteJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJobId && deleteMutation.mutate(deleteJobId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CreateJobCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  isPending: boolean;
}

function CreateJobCardDialog({ open, onOpenChange, onSubmit, isPending }: CreateJobCardDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const calculatePayment = () => {
    const cost = formData.cost || 0;
    if (formData.serviceType === "Repair") {
      return {
        advance: cost * 0.5,
        remaining: cost * 0.5,
        status: "Advance Paid (50%)",
      };
    }
    return {
      advance: cost,
      remaining: 0,
      status: "Full Payment Required",
    };
  };

  const payment = calculatePayment();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      newErrors.phone = "Valid phone number is required";
    }
    if (!formData.registration.trim()) {
      newErrors.registration = "Registration number is required";
    }
    if (formData.odometer < 0) {
      newErrors.odometer = "Odometer must be positive";
    }
    if (formData.cost <= 0) {
      newErrors.cost = "Cost must be greater than 0";
    }
    if (!formData.estimatedTime.trim()) {
      newErrors.estimatedTime = "Estimated time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job Card</DialogTitle>
          <DialogDescription>Fill in the details to create a new service job card.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                placeholder="Enter customer name"
                className={errors.customerName ? "border-destructive" : ""}
                data-testid="input-customer-name"
              />
              {errors.customerName && <p className="text-xs text-destructive">{errors.customerName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Enter phone number"
                className={errors.phone ? "border-destructive" : ""}
                data-testid="input-phone"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bikeModel">Bike Model *</Label>
              <Select
                value={formData.bikeModel}
                onValueChange={(value) => updateField("bikeModel", value as typeof HONDA_MODELS[number])}
              >
                <SelectTrigger data-testid="select-bike-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {HONDA_MODELS.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number *</Label>
              <Input
                id="registration"
                value={formData.registration}
                onChange={(e) => updateField("registration", e.target.value.toUpperCase())}
                placeholder="e.g., NP-1234"
                className={errors.registration ? "border-destructive" : ""}
                data-testid="input-registration"
              />
              {errors.registration && <p className="text-xs text-destructive">{errors.registration}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odometer">Odometer Reading (km) *</Label>
              <Input
                id="odometer"
                type="number"
                value={formData.odometer || ""}
                onChange={(e) => updateField("odometer", parseInt(e.target.value) || 0)}
                placeholder="Enter odometer reading"
                className={errors.odometer ? "border-destructive" : ""}
                data-testid="input-odometer"
              />
              {errors.odometer && <p className="text-xs text-destructive">{errors.odometer}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => updateField("serviceType", value as typeof SERVICE_TYPES[number])}
              >
                <SelectTrigger data-testid="select-service-type">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bay">Assign Bay *</Label>
              <Select
                value={formData.bay}
                onValueChange={(value) => updateField("bay", value as typeof BAYS[number])}
              >
                <SelectTrigger data-testid="select-bay">
                  <SelectValue placeholder="Select bay" />
                </SelectTrigger>
                <SelectContent>
                  {BAYS.map((bay) => (
                    <SelectItem key={bay} value={bay}>{bay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="technician">Assign Technician *</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => updateField("assignedTo", value as typeof TECHNICIANS[number])}
              >
                <SelectTrigger data-testid="select-technician">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {TECHNICIANS.map((tech) => (
                    <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost (LKR) *</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost || ""}
                onChange={(e) => updateField("cost", parseInt(e.target.value) || 0)}
                placeholder="Enter estimated cost"
                className={errors.cost ? "border-destructive" : ""}
                data-testid="input-cost"
              />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedTime">Estimated Time *</Label>
              <Input
                id="estimatedTime"
                value={formData.estimatedTime}
                onChange={(e) => updateField("estimatedTime", e.target.value)}
                placeholder="e.g., 2 hours"
                className={errors.estimatedTime ? "border-destructive" : ""}
                data-testid="input-estimated-time"
              />
              {errors.estimatedTime && <p className="text-xs text-destructive">{errors.estimatedTime}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repairDetails">Notes / Repair Details</Label>
            <Textarea
              id="repairDetails"
              value={formData.repairDetails}
              onChange={(e) => updateField("repairDetails", e.target.value)}
              placeholder="Enter any additional notes or repair details..."
              className="min-h-24"
              data-testid="textarea-repair-details"
            />
          </div>

          {formData.cost > 0 && (
            <Card className="bg-muted/50 border border-card-border">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Payment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-medium">LKR {formData.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Payment:</span>
                    <span className="font-medium text-primary">LKR {payment.advance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span>LKR {payment.remaining.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="mt-2">{payment.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-create">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Job Card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ViewJobCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobCard | null;
  onStatusChange: (status: typeof JOB_STATUSES[number]) => void;
  isUpdating: boolean;
  isLimitedRole?: boolean;
  canViewRevenue?: boolean;
}

function ViewJobCardDialog({ open, onOpenChange, job, onStatusChange, isUpdating, isLimitedRole = false, canViewRevenue = true }: ViewJobCardDialogProps) {
  if (!job) return null;

  const allStatuses: (typeof JOB_STATUSES[number])[] = ["Pending", "In Progress", "Quality Check", "Completed"];
  const statuses = isLimitedRole 
    ? allStatuses.filter(s => s === "In Progress" || s === "Completed")
    : allStatuses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle>Job Card Details</DialogTitle>
            <Badge variant="outline">{job.id}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Customer</h4>
              <p className="font-medium" data-testid="text-customer-name">{job.customerName}</p>
              <p className="text-sm text-muted-foreground">{job.phone}</p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Bike</h4>
              <p className="font-medium">{job.bikeModel}</p>
              <p className="text-sm text-muted-foreground">{job.registration}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Service Type</h4>
              <Badge variant="outline">{job.serviceType}</Badge>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Bay</h4>
              <p className="font-medium">{job.bay}</p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Technician</h4>
              <p className="font-medium">{job.assignedTo}</p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Est. Time</h4>
              <p className="font-medium">{job.estimatedTime}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Odometer</h4>
              <p className="font-medium">{job.odometer.toLocaleString()} km</p>
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Created</h4>
              <p className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {canViewRevenue && (
            <Card className="bg-muted/50 border border-card-border">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Payment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold">LKR {job.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Advance Paid:</span>
                    <span className="text-green-600 dark:text-green-400">LKR {job.advancePayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={job.remainingPayment > 0 ? "text-orange-600 dark:text-orange-400" : ""}>
                      LKR {job.remainingPayment.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Badge variant={job.paymentStatus === "Paid in Full" ? "default" : "secondary"}>
                      {job.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {job.repairDetails && (
            <div>
              <h4 className="text-sm text-muted-foreground mb-1">Repair Details / Notes</h4>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{job.repairDetails}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm text-muted-foreground mb-3">Update Status</h4>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={job.status === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStatusChange(status)}
                  disabled={isUpdating}
                  data-testid={`button-status-${status.toLowerCase().replace(" ", "-")}`}
                >
                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditJobCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobCard | null;
  onSubmit: (data: Partial<FormData>) => void;
  isPending: boolean;
}

function EditJobCardDialog({ open, onOpenChange, job, onSubmit, isPending }: EditJobCardDialogProps) {
  const [formData, setFormData] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (open && job) {
      setFormData({
        customerName: job.customerName,
        phone: job.phone,
        bikeModel: job.bikeModel,
        registration: job.registration,
        odometer: job.odometer,
        serviceType: job.serviceType,
        status: job.status,
        bay: job.bay,
        assignedTo: job.assignedTo,
        cost: job.cost,
        estimatedTime: job.estimatedTime,
        repairDetails: job.repairDetails || "",
      });
    }
  }, [open, job]);

  if (!job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle>Edit Job Card</DialogTitle>
            <Badge variant="outline">{job.id}</Badge>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customerName">Customer Name</Label>
              <Input
                id="edit-customerName"
                value={formData.customerName ?? ""}
                onChange={(e) => updateField("customerName", e.target.value)}
                data-testid="input-edit-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phone ?? ""}
                onChange={(e) => updateField("phone", e.target.value)}
                data-testid="input-edit-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-bikeModel">Bike Model</Label>
              <Select
                value={formData.bikeModel}
                onValueChange={(value) => updateField("bikeModel", value as typeof HONDA_MODELS[number])}
              >
                <SelectTrigger data-testid="select-edit-bike-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HONDA_MODELS.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-registration">Registration Number</Label>
              <Input
                id="edit-registration"
                value={formData.registration ?? ""}
                onChange={(e) => updateField("registration", e.target.value.toUpperCase())}
                data-testid="input-edit-registration"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-bay">Assign Bay</Label>
              <Select
                value={formData.bay}
                onValueChange={(value) => updateField("bay", value as typeof BAYS[number])}
              >
                <SelectTrigger data-testid="select-edit-bay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAYS.map((bay) => (
                    <SelectItem key={bay} value={bay}>{bay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-technician">Assign Technician</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => updateField("assignedTo", value as typeof TECHNICIANS[number])}
              >
                <SelectTrigger data-testid="select-edit-technician">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TECHNICIANS.map((tech) => (
                    <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Estimated Cost (LKR)</Label>
              <Input
                id="edit-cost"
                type="number"
                value={formData.cost ?? ""}
                onChange={(e) => updateField("cost", parseInt(e.target.value) || 0)}
                data-testid="input-edit-cost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-estimatedTime">Estimated Time</Label>
              <Input
                id="edit-estimatedTime"
                value={formData.estimatedTime ?? ""}
                onChange={(e) => updateField("estimatedTime", e.target.value)}
                data-testid="input-edit-estimated-time"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-repairDetails">Notes / Repair Details</Label>
            <Textarea
              id="edit-repairDetails"
              value={formData.repairDetails ?? ""}
              onChange={(e) => updateField("repairDetails", e.target.value)}
              className="min-h-24"
              data-testid="textarea-edit-repair-details"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-edit">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
