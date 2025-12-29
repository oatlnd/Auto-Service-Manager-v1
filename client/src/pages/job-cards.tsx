import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Plus, Search, Eye, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import type { JobCard, JOB_STATUSES, Staff } from "@shared/schema";
import { BIKE_MODELS, BAYS, SERVICE_TYPES, SERVICE_TYPE_DETAILS, SERVICE_CATEGORIES, CUSTOMER_REQUESTS, getStatusesForCategory } from "@shared/schema";

interface FormData {
  tagNo: string;
  customerName: string;
  phone: string;
  bikeModel: typeof BIKE_MODELS[number];
  registration: string;
  odometer: number;
  serviceType: typeof SERVICE_TYPES[number];
  customerRequests: string[];
  status: typeof JOB_STATUSES[number];
  bay: typeof BAYS[number];
  assignedTo: string;
  cost: number;
  estimatedTime: string;
  repairDetails: string;
  parts: string[];
}

const initialFormData: FormData = {
  tagNo: "",
  customerName: "",
  phone: "",
  bikeModel: "Shine",
  registration: "",
  odometer: 0,
  serviceType: "Service with Oil Spray (Oil Change)",
  customerRequests: [],
  status: "Pending",
  bay: "Sudershan",
  assignedTo: "",
  cost: 1000,
  estimatedTime: "",
  repairDetails: "",
  parts: [],
};

const getServiceTypesByCategory = (category: typeof SERVICE_CATEGORIES[number]) => {
  return SERVICE_TYPES.filter(st => SERVICE_TYPE_DETAILS[st].category === category);
};

export default function JobCards() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canViewRevenue, isLimitedRole, isService } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("non-completed");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<typeof SERVICE_CATEGORIES[number] | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const { data: jobCards = [], isLoading } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const { data: mechanics = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff/by-skill/Mechanic"],
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

  const filteredJobs = jobCards
    .filter((job) => {
      const matchesSearch = 
        job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ? true : 
        statusFilter === "non-completed" ? (job.status !== "Completed" && job.status !== "Delivered") :
        job.status === statusFilter;
      
      const matchesServiceType = 
        serviceTypeFilter === null ? true :
        SERVICE_TYPE_DETAILS[job.serviceType]?.category === serviceTypeFilter;
      
      const limitedRoleStatuses = ["Pending", "In Progress"];
      const matchesLimitedRole = !isLimitedRole || limitedRoleStatuses.includes(job.status);
      
      const matchesServiceBay = !isService || job.bay === "Wash Bay 1" || job.bay === "Wash Bay 2";
      
      return matchesSearch && matchesStatus && matchesServiceType && matchesLimitedRole && matchesServiceBay;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

      <div className="flex flex-wrap gap-2">
        {SERVICE_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={serviceTypeFilter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setServiceTypeFilter(serviceTypeFilter === category ? null : category)}
            data-testid={`button-filter-${category.toLowerCase().replace(" ", "-")}`}
          >
            {t(`jobCards.${category === "Paid Service" ? "paidService" : category === "Company Free Service" ? "freeService" : "repair"}`)}
          </Button>
        ))}
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
                <SelectItem value="non-completed">{t("jobCards.nonCompleted")}</SelectItem>
                <SelectItem value="all">{t("jobCards.allStatus")}</SelectItem>
                <SelectItem value="Pending">{t("jobCards.pending")}</SelectItem>
                <SelectItem value="In Progress">{t("jobCards.inProgress")}</SelectItem>
                <SelectItem value="Oil Change">{t("jobCards.oilChange")}</SelectItem>
                {!isLimitedRole && (
                  <>
                    <SelectItem value="Quality Check">{t("jobCards.qualityCheck")}</SelectItem>
                    <SelectItem value="Completed">{t("jobCards.completed")}</SelectItem>
                    <SelectItem value="Delivered">{t("jobCards.delivered")}</SelectItem>
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
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead className="hidden sm:table-cell">Tag No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">{t("jobCards.registration")}</TableHead>
                  <TableHead className="hidden sm:table-cell">Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Bay</TableHead>
                  <TableHead className="hidden md:table-cell">{t("jobCards.created")}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
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
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="font-medium">{job.id}</TableCell>
                      <TableCell className="hidden sm:table-cell">{job.tagNo || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.customerName}</p>
                          <p className="text-xs text-muted-foreground">{job.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-medium">
                        {job.registration}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{job.serviceType}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{job.bay}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {format(new Date(job.createdAt), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
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
        onAssignmentChange={(bay, technician) => {
          if (selectedJob) {
            updateMutation.mutate({ id: selectedJob.id, data: { bay, assignedTo: technician } });
          }
        }}
        onPartsChange={(parts) => {
          if (selectedJob) {
            updateMutation.mutate({ id: selectedJob.id, data: { parts } });
          }
        }}
        isUpdating={updateStatusMutation.isPending || updateMutation.isPending}
        isLimitedRole={isLimitedRole}
        canViewRevenue={canViewRevenue}
        mechanics={mechanics}
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
        mechanics={mechanics}
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

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  "Paid Service": "Paid Service",
  "Company Free Service": "Free Service",
  "Repair": "Repair",
};

function CreateJobCardDialog({ open, onOpenChange, onSubmit, isPending }: CreateJobCardDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<typeof SERVICE_CATEGORIES[number]>("Paid Service");

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setErrors({});
      setSelectedCategory("Paid Service");
    }
  }, [open]);

  const getFilteredServiceTypes = () => {
    return SERVICE_TYPES.filter(st => SERVICE_TYPE_DETAILS[st].category === selectedCategory);
  };

  const calculatePayment = () => {
    const cost = formData.cost || 0;
    const category = SERVICE_TYPE_DETAILS[formData.serviceType]?.category;
    if (category === "Repair") {
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
    if (!formData.bikeModel) {
      newErrors.bikeModel = "Bike model is required";
    }
    if (!formData.registration.trim()) {
      newErrors.registration = "Registration number is required";
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
    if (field === "serviceType") {
      const serviceType = value as typeof SERVICE_TYPES[number];
      const price = SERVICE_TYPE_DETAILS[serviceType].price;
      setFormData((prev) => ({ ...prev, [field]: value, cost: price }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
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
          <DialogTitle>{t("jobCards.createNewJobCard")}</DialogTitle>
          <DialogDescription>{t("jobCards.createDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.bikeDetails")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bikeModel">{t("jobCards.bikeModel")} *</Label>
                <Select
                  value={formData.bikeModel}
                  onValueChange={(value) => updateField("bikeModel", value as typeof BIKE_MODELS[number])}
                >
                  <SelectTrigger data-testid="select-bike-model" className={errors.bikeModel ? "border-destructive" : ""}>
                    <SelectValue placeholder={t("jobCards.selectBikeModel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BIKE_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bikeModel && <p className="text-xs text-destructive">{errors.bikeModel}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration">{t("jobCards.registration")} *</Label>
                <Input
                  id="registration"
                  value={formData.registration}
                  onChange={(e) => updateField("registration", e.target.value.toUpperCase())}
                  placeholder={t("jobCards.registrationPlaceholder")}
                  className={errors.registration ? "border-destructive" : ""}
                  data-testid="input-registration"
                />
                {errors.registration && <p className="text-xs text-destructive">{errors.registration}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tagNo">{t("jobCards.tagNo")}</Label>
                <Select
                  value={formData.tagNo}
                  onValueChange={(value) => updateField("tagNo", value)}
                >
                  <SelectTrigger data-testid="select-tag-no">
                    <SelectValue placeholder={t("jobCards.selectTagNo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometer">{t("jobCards.odometer")}</Label>
                <Input
                  id="odometer"
                  type="number"
                  value={formData.odometer || ""}
                  onChange={(e) => updateField("odometer", parseInt(e.target.value) || 0)}
                  placeholder={t("jobCards.odometer")}
                  data-testid="input-odometer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.customerDetails")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">{t("jobCards.customerName")} *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  placeholder={t("jobCards.customerNamePlaceholder")}
                  className={errors.customerName ? "border-destructive" : ""}
                  data-testid="input-customer-name"
                />
                {errors.customerName && <p className="text-xs text-destructive">{errors.customerName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("common.phone")} *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder={t("common.phone")}
                  className={errors.phone ? "border-destructive" : ""}
                  data-testid="input-phone"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.customerRequests")}</h3>
            
            <div className="space-y-2">
              <Label>{t("jobCards.typeOfService")}</Label>
              <RadioGroup
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as typeof SERVICE_CATEGORIES[number])}
                className="flex flex-wrap gap-4"
              >
                {SERVICE_CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={category}
                      id={`category-${category}`}
                      data-testid={`radio-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm font-normal cursor-pointer">
                      {t(`jobCards.${category === "Paid Service" ? "paidService" : category === "Company Free Service" ? "freeService" : "repair"}`)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">{t("jobCards.serviceType")}</Label>
                <Select
                  value={getFilteredServiceTypes().includes(formData.serviceType) ? formData.serviceType : ""}
                  onValueChange={(value) => updateField("serviceType", value as typeof SERVICE_TYPES[number])}
                >
                  <SelectTrigger data-testid="select-service-type">
                    <SelectValue placeholder={t("jobCards.selectServiceType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredServiceTypes().map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`serviceTypes.${type}`, type)} {SERVICE_TYPE_DETAILS[type].price > 0 && `(Rs. ${SERVICE_TYPE_DETAILS[type].price.toLocaleString()})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">{t("jobCards.cost")} (LKR)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost || ""}
                  onChange={(e) => updateField("cost", parseInt(e.target.value) || 0)}
                  placeholder={t("jobCards.cost")}
                  data-testid="input-cost"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedTime">{t("jobCards.estimatedTime")}</Label>
              <Input
                id="estimatedTime"
                value={formData.estimatedTime}
                onChange={(e) => updateField("estimatedTime", e.target.value)}
                placeholder={t("jobCards.estimatedTimePlaceholder")}
                data-testid="input-estimated-time"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.customerRequests")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {CUSTOMER_REQUESTS.map((request) => (
                  <div key={request} className="flex items-center gap-2">
                    <Checkbox
                      id={`request-${request}`}
                      checked={formData.customerRequests.includes(request)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateField("customerRequests", [...formData.customerRequests, request]);
                        } else {
                          updateField("customerRequests", formData.customerRequests.filter(r => r !== request));
                        }
                      }}
                      data-testid={`checkbox-request-${request.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                    />
                    <Label htmlFor={`request-${request}`} className="text-sm font-normal cursor-pointer">
                      {request}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parts</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => updateField("parts", [...(formData.parts || []), ""])}
                  data-testid="button-add-part"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Part
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.parts || []).map((part, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      placeholder="Part name"
                      value={part}
                      onChange={(e) => {
                        const newParts = [...(formData.parts || [])];
                        newParts[index] = e.target.value;
                        updateField("parts", newParts);
                      }}
                      data-testid={`input-part-${index}`}
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const newParts = (formData.parts || []).filter((_, i) => i !== index);
                        updateField("parts", newParts);
                      }}
                      data-testid={`button-remove-part-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {(formData.parts || []).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No parts added</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repairDetails">{t("jobCards.repairDetails")}</Label>
              <Textarea
                id="repairDetails"
                value={formData.repairDetails}
                onChange={(e) => updateField("repairDetails", e.target.value)}
                placeholder={t("jobCards.repairDetailsPlaceholder")}
                className="min-h-24"
                data-testid="textarea-repair-details"
              />
            </div>
          </div>

          {formData.cost > 0 && (
            <Card className="bg-muted/50 border border-card-border">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">{t("jobCards.paymentDetails")}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("jobCards.totalCost")}:</span>
                    <span className="font-medium">LKR {formData.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("jobCards.advance")}:</span>
                    <span className="font-medium text-primary">LKR {payment.advance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("jobCards.remaining")}:</span>
                    <span>LKR {payment.remaining.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="mt-2">{payment.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-create">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("jobCards.createJobCard")}
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
  onAssignmentChange: (bay: typeof BAYS[number], technician: string) => void;
  onPartsChange: (parts: string[]) => void;
  isUpdating: boolean;
  isLimitedRole?: boolean;
  canViewRevenue?: boolean;
  mechanics: Staff[];
}

function ViewJobCardDialog({ open, onOpenChange, job, onStatusChange, onAssignmentChange, onPartsChange, isUpdating, isLimitedRole = false, canViewRevenue = true, mechanics }: ViewJobCardDialogProps) {
  const { t } = useTranslation();
  const [selectedBay, setSelectedBay] = useState<typeof BAYS[number]>("Sudershan");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [newPart, setNewPart] = useState("");

  useEffect(() => {
    if (job) {
      setSelectedBay(job.bay);
      setSelectedTechnician(job.assignedTo);
    }
  }, [job]);

  if (!job) return null;

  const handleAddPart = () => {
    if (newPart.trim()) {
      onPartsChange([...(job.parts || []), newPart.trim()]);
      setNewPart("");
    }
  };

  const handleRemovePart = (index: number) => {
    const newParts = (job.parts || []).filter((_, i) => i !== index);
    onPartsChange(newParts);
  };

  const serviceTypeDetails = SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS];
  const category = serviceTypeDetails?.category || "Paid Service";
  const allStatuses = getStatusesForCategory(category) as (typeof JOB_STATUSES[number])[];
  const statuses = isLimitedRole 
    ? allStatuses.filter(s => s === "In Progress" || s === "Completed")
    : allStatuses;

  const handleBayChange = (bay: typeof BAYS[number]) => {
    setSelectedBay(bay);
    onAssignmentChange(bay, selectedTechnician);
  };

  const handleTechnicianChange = (technician: string) => {
    setSelectedTechnician(technician);
    onAssignmentChange(selectedBay, technician);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle>{t("jobCards.title")}</DialogTitle>
            <Badge variant="outline">{job.id}</Badge>
            <StatusBadge status={job.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.assignmentStatus")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view-bay">{t("jobCards.bay")}</Label>
                <Select
                  value={selectedBay}
                  onValueChange={(value) => handleBayChange(value as typeof BAYS[number])}
                >
                  <SelectTrigger data-testid="select-view-bay">
                    <SelectValue placeholder={t("jobCards.selectBay")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BAYS.map((bay) => (
                      <SelectItem key={bay} value={bay}>{bay}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="view-technician">{t("jobCards.technician")}</Label>
                <Select
                  value={selectedTechnician}
                  onValueChange={handleTechnicianChange}
                >
                  <SelectTrigger data-testid="select-view-technician">
                    <SelectValue placeholder={t("jobCards.selectTechnician")} />
                  </SelectTrigger>
                  <SelectContent>
                    {mechanics.map((staff) => (
                      <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-2">
              <Label className="mb-2 block">{t("jobCards.updateStatus")}</Label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => {
                  const statusKey = status === "Pending" ? "pending" 
                    : status === "In Progress" ? "inProgress" 
                    : status === "Oil Change" ? "oilChange"
                    : status === "Quality Check" ? "qualityCheck" 
                    : status === "Completed" ? "completed"
                    : "delivered";
                  return (
                    <Button
                      key={status}
                      variant={job.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => onStatusChange(status)}
                      disabled={isUpdating}
                      data-testid={`button-status-${status.toLowerCase().replace(" ", "-")}`}
                    >
                      {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {t(`jobCards.${statusKey}`)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.bikeDetails")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.tagNo")}</h4>
                <p className="font-medium">{job.tagNo || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.registration")}</h4>
                <p className="font-medium">{job.registration}</p>
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.bikeModel")}</h4>
                <p className="font-medium">{job.bikeModel}</p>
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.odometer")}</h4>
                <p className="font-medium">{job.odometer.toLocaleString()} km</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.customerDetails")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.customerName")}</h4>
                <p className="font-medium" data-testid="text-customer-name">{job.customerName}</p>
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("common.phone")}</h4>
                <p className="font-medium">{job.phone}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.serviceDetails")}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.serviceType")}</h4>
                <Badge variant="outline">{t(`serviceTypes.${job.serviceType}`, job.serviceType)}</Badge>
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.estimatedTime")}</h4>
                <p className="font-medium">{job.estimatedTime || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("common.status")}</h4>
                <p className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            {job.customerRequests && job.customerRequests.length > 0 && (
              <div>
                <h4 className="text-sm text-muted-foreground mb-2">{t("jobCards.customerRequests")}</h4>
                <div className="flex flex-wrap gap-1">
                  {job.customerRequests.map((request) => (
                    <Badge key={request} variant="secondary" className="text-xs">
                      {t(`customerRequestItems.${request}`, request)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {job.repairDetails && (
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">{t("jobCards.repairDetails")}</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{job.repairDetails}</p>
              </div>
            )}
          </div>

          {canViewRevenue && (
            <Card className="bg-muted/50 border border-card-border">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">{t("jobCards.paymentDetails")}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("jobCards.totalCost")}:</span>
                    <span className="font-semibold">LKR {job.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("jobCards.advancePaid")}:</span>
                    <span className="text-green-600 dark:text-green-400">LKR {job.advancePayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("jobCards.remaining")}:</span>
                    <span className={job.remainingPayment > 0 ? "text-orange-600 dark:text-orange-400" : ""}>
                      LKR {job.remainingPayment.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Badge variant={job.paymentStatus === "Paid in Full" ? "default" : "secondary"}>
                      {job.paymentStatus === "Paid in Full" ? t("jobCards.paidInFull") : t("jobCards.partialPayment")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-view">
            {t("common.close")}
          </Button>
        </DialogFooter>
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
  mechanics: Staff[];
}

function EditJobCardDialog({ open, onOpenChange, job, onSubmit, isPending, mechanics }: EditJobCardDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [selectedCategory, setSelectedCategory] = useState<typeof SERVICE_CATEGORIES[number]>("Paid Service");

  useEffect(() => {
    if (open && job) {
      setFormData({
        customerName: job.customerName,
        phone: job.phone,
        bikeModel: job.bikeModel,
        registration: job.registration,
        odometer: job.odometer,
        serviceType: job.serviceType,
        customerRequests: job.customerRequests || [],
        status: job.status,
        bay: job.bay,
        assignedTo: job.assignedTo,
        cost: job.cost,
        estimatedTime: job.estimatedTime,
        repairDetails: job.repairDetails || "",
        tagNo: job.tagNo || "",
      });
      const jobCategory = SERVICE_TYPE_DETAILS[job.serviceType]?.category;
      if (jobCategory) {
        setSelectedCategory(jobCategory);
      }
    }
  }, [open, job]);

  const getFilteredServiceTypes = () => {
    return SERVICE_TYPES.filter(st => SERVICE_TYPE_DETAILS[st].category === selectedCategory);
  };

  if (!job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    if (field === "serviceType") {
      const serviceType = value as typeof SERVICE_TYPES[number];
      const price = SERVICE_TYPE_DETAILS[serviceType].price;
      setFormData((prev) => ({ ...prev, [field]: value, cost: price }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle>{t("jobCards.editJobCard")}</DialogTitle>
            <Badge variant="outline">{job.id}</Badge>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.assignment")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bay">{t("jobCards.bay")}</Label>
                <Select
                  value={formData.bay}
                  onValueChange={(value) => updateField("bay", value as typeof BAYS[number])}
                >
                  <SelectTrigger data-testid="select-edit-bay">
                    <SelectValue placeholder={t("jobCards.selectBay")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BAYS.map((bay) => (
                      <SelectItem key={bay} value={bay}>{bay}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-technician">{t("jobCards.technician")}</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => updateField("assignedTo", value)}
                >
                  <SelectTrigger data-testid="select-edit-technician">
                    <SelectValue placeholder={t("jobCards.selectTechnician")} />
                  </SelectTrigger>
                  <SelectContent>
                    {mechanics.map((staff) => (
                      <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.bikeDetails")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bikeModel">{t("jobCards.bikeModel")} *</Label>
                <Select
                  value={formData.bikeModel}
                  onValueChange={(value) => updateField("bikeModel", value as typeof BIKE_MODELS[number])}
                >
                  <SelectTrigger data-testid="select-edit-bike-model">
                    <SelectValue placeholder={t("jobCards.selectBikeModel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BIKE_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-registration">{t("jobCards.registration")} *</Label>
                <Input
                  id="edit-registration"
                  value={formData.registration ?? ""}
                  onChange={(e) => updateField("registration", e.target.value.toUpperCase())}
                  placeholder={t("jobCards.registrationPlaceholder")}
                  data-testid="input-edit-registration"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tagNo">{t("jobCards.tagNo")}</Label>
                <Select
                  value={formData.tagNo ?? ""}
                  onValueChange={(value) => updateField("tagNo", value)}
                >
                  <SelectTrigger data-testid="select-edit-tag-no">
                    <SelectValue placeholder={t("jobCards.selectTagNo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-odometer">{t("jobCards.odometer")}</Label>
                <Input
                  id="edit-odometer"
                  type="number"
                  value={formData.odometer ?? ""}
                  onChange={(e) => updateField("odometer", parseInt(e.target.value) || 0)}
                  placeholder={t("jobCards.odometer")}
                  data-testid="input-edit-odometer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.customerDetails")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-customerName">{t("jobCards.customerName")} *</Label>
                <Input
                  id="edit-customerName"
                  value={formData.customerName ?? ""}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  placeholder={t("jobCards.customerNamePlaceholder")}
                  data-testid="input-edit-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">{t("common.phone")} *</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone ?? ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder={t("common.phone")}
                  data-testid="input-edit-phone"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">{t("jobCards.customerRequests")}</h3>
            
            <div className="space-y-2">
              <Label>{t("jobCards.typeOfService")}</Label>
              <RadioGroup
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as typeof SERVICE_CATEGORIES[number])}
                className="flex flex-wrap gap-4"
              >
                {SERVICE_CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={category}
                      id={`edit-category-${category}`}
                      data-testid={`radio-edit-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <Label htmlFor={`edit-category-${category}`} className="text-sm font-normal cursor-pointer">
                      {t(`jobCards.${category === "Paid Service" ? "paidService" : category === "Company Free Service" ? "freeService" : "repair"}`)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-serviceType">{t("jobCards.serviceType")}</Label>
                <Select
                  value={getFilteredServiceTypes().includes(formData.serviceType as typeof SERVICE_TYPES[number]) ? formData.serviceType : ""}
                  onValueChange={(value) => updateField("serviceType", value as typeof SERVICE_TYPES[number])}
                >
                  <SelectTrigger data-testid="select-edit-service-type">
                    <SelectValue placeholder={t("jobCards.selectServiceType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredServiceTypes().map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`serviceTypes.${type}`, type)} {SERVICE_TYPE_DETAILS[type].price > 0 && `(Rs. ${SERVICE_TYPE_DETAILS[type].price.toLocaleString()})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">{t("jobCards.cost")} (LKR)</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={formData.cost ?? ""}
                  onChange={(e) => updateField("cost", parseInt(e.target.value) || 0)}
                  placeholder={t("jobCards.cost")}
                  data-testid="input-edit-cost"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-estimatedTime">{t("jobCards.estimatedTime")}</Label>
              <Input
                id="edit-estimatedTime"
                value={formData.estimatedTime ?? ""}
                onChange={(e) => updateField("estimatedTime", e.target.value)}
                placeholder={t("jobCards.estimatedTimePlaceholder")}
                data-testid="input-edit-estimated-time"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("jobCards.customerRequestsSelect")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {CUSTOMER_REQUESTS.map((request) => (
                  <div key={request} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-request-${request}`}
                      checked={(formData.customerRequests || []).includes(request)}
                      onCheckedChange={(checked) => {
                        const currentRequests = formData.customerRequests || [];
                        if (checked) {
                          updateField("customerRequests", [...currentRequests, request]);
                        } else {
                          updateField("customerRequests", currentRequests.filter(r => r !== request));
                        }
                      }}
                      data-testid={`checkbox-edit-request-${request.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                    />
                    <Label htmlFor={`edit-request-${request}`} className="text-sm font-normal cursor-pointer">
                      {t(`customerRequestItems.${request}`, request)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-repairDetails">{t("jobCards.repairDetails")}</Label>
              <Textarea
                id="edit-repairDetails"
                value={formData.repairDetails ?? ""}
                onChange={(e) => updateField("repairDetails", e.target.value)}
                placeholder={t("jobCards.repairDetailsPlaceholder")}
                className="min-h-24"
                data-testid="textarea-edit-repair-details"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-edit">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
