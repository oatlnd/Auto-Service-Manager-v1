import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/contexts/UserRoleContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, WorkSkill } from "@shared/schema";
import { USER_ROLES, WORK_SKILLS } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

interface StaffFormData {
  name: string;
  phone: string;
  email: string;
  role: typeof USER_ROLES[number];
  workSkills: WorkSkill[];
  isActive: boolean;
}

const initialFormData: StaffFormData = {
  name: "",
  phone: "",
  email: "",
  role: "Job Card",
  workSkills: [],
  isActive: true,
};

export default function StaffManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const { data: staffList = [], isLoading, error } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      return apiRequest("POST", "/api/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsCreateOpen(false);
      toast({ title: t("common.success"), description: t("messages.addedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffFormData> }) => {
      return apiRequest("PATCH", `/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsEditOpen(false);
      setSelectedStaff(null);
      toast({ title: t("common.success"), description: t("messages.updatedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setDeleteStaffId(null);
      toast({ title: t("common.success"), description: t("messages.deletedSuccess") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "default";
      case "Manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const activeStaff = staffList.filter(s => s.isActive).length;
  const totalStaff = staffList.length;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border border-card-border">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive" />
            <p className="text-muted-foreground">{t("messages.accessDenied")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">{t("staff.title")}</h1>
          <p className="text-muted-foreground">{t("staff.subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-staff">
            <Plus className="w-4 h-4 mr-2" />
            {t("staff.addStaff")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-staff">{activeStaff}</p>
                <p className="text-xs text-muted-foreground">{t("common.active")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <UserX className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-inactive-staff">{totalStaff - activeStaff}</p>
                <p className="text-xs text-muted-foreground">{t("common.inactive")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <span className="text-lg font-bold">{totalStaff}</span>
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-staff">{totalStaff}</p>
                <p className="text-xs text-muted-foreground">{t("common.total")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-card-border">
        <CardHeader>
          <h2 className="text-lg font-semibold">{t("staff.staffDirectory")}</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("staff.email")}</TableHead>
                  <TableHead>{t("staff.role")}</TableHead>
                  <TableHead>Work Skills</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      {isAdmin && <TableCell><Skeleton className="h-8 w-20" /></TableCell>}
                    </TableRow>
                  ))
                ) : staffList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No staff members yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  staffList.map((staff) => (
                    <TableRow key={staff.id} className="hover-elevate" data-testid={`row-staff-${staff.id}`}>
                      <TableCell className="font-medium">{staff.id}</TableCell>
                      <TableCell>
                        <p className="font-medium">{staff.name}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{staff.phone}</p>
                          {staff.email && <p className="text-xs text-muted-foreground">{staff.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(staff.role)}>{staff.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {staff.workSkills && staff.workSkills.length > 0 ? (
                            staff.workSkills.map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.isActive ? "default" : "secondary"}>
                          {staff.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedStaff(staff);
                                setIsEditOpen(true);
                              }}
                              data-testid={`button-edit-staff-${staff.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteStaffId(staff.id)}
                              data-testid={`button-delete-staff-${staff.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
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

      <CreateStaffDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <EditStaffDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedStaff(null);
        }}
        staff={selectedStaff}
        onSubmit={(data) => {
          if (selectedStaff) {
            updateMutation.mutate({ id: selectedStaff.id, data });
          }
        }}
        isPending={updateMutation.isPending}
      />

      <AlertDialog open={!!deleteStaffId} onOpenChange={() => setDeleteStaffId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this staff member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-staff">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStaffId && deleteMutation.mutate(deleteStaffId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-staff"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StaffFormData) => void;
  isPending: boolean;
}

function CreateStaffDialog({ open, onOpenChange, onSubmit, isPending }: CreateStaffDialogProps) {
  const [formData, setFormData] = useState<StaffFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim() || formData.phone.length < 10) newErrors.phone = "Valid phone required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const updateField = <K extends keyof StaffFormData>(field: K, value: StaffFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>Enter the details for the new staff member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Enter full name"
              className={errors.name ? "border-destructive" : ""}
              data-testid="input-staff-name"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Enter phone number"
              className={errors.phone ? "border-destructive" : ""}
              data-testid="input-staff-phone"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Enter email (optional)"
              data-testid="input-staff-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => updateField("role", value as typeof USER_ROLES[number])}
            >
              <SelectTrigger data-testid="select-staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Work Skills</Label>
            <div className="flex flex-wrap gap-4">
              {WORK_SKILLS.map((skill) => (
                <div key={skill} className="flex items-center gap-2">
                  <Checkbox
                    id={`skill-${skill}`}
                    checked={formData.workSkills.includes(skill)}
                    onCheckedChange={(checked) => {
                      const newSkills = checked
                        ? [...formData.workSkills, skill]
                        : formData.workSkills.filter((s) => s !== skill);
                      updateField("workSkills", newSkills);
                    }}
                    data-testid={`checkbox-skill-${skill.toLowerCase()}`}
                  />
                  <Label htmlFor={`skill-${skill}`} className="text-sm font-normal cursor-pointer">
                    {skill}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select skills this staff member can perform (for job assignments)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateField("isActive", checked)}
              data-testid="switch-staff-active"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-staff">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
  onSubmit: (data: Partial<StaffFormData>) => void;
  isPending: boolean;
}

function EditStaffDialog({ open, onOpenChange, staff, onSubmit, isPending }: EditStaffDialogProps) {
  const [formData, setFormData] = useState<Partial<StaffFormData>>({});

  useEffect(() => {
    if (open && staff) {
      setFormData({
        name: staff.name,
        phone: staff.phone,
        email: staff.email || "",
        role: staff.role,
        workSkills: staff.workSkills || [],
        isActive: staff.isActive,
      });
    }
  }, [open, staff]);

  if (!staff) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = <K extends keyof StaffFormData>(field: K, value: StaffFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle>Edit Staff Member</DialogTitle>
            <Badge variant="outline">{staff.id}</Badge>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={formData.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              data-testid="input-edit-staff-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={formData.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              data-testid="input-edit-staff-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              data-testid="input-edit-staff-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => updateField("role", value as typeof USER_ROLES[number])}
            >
              <SelectTrigger data-testid="select-edit-staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Work Skills</Label>
            <div className="flex flex-wrap gap-4">
              {WORK_SKILLS.map((skill) => (
                <div key={skill} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-skill-${skill}`}
                    checked={(formData.workSkills || []).includes(skill)}
                    onCheckedChange={(checked) => {
                      const currentSkills = formData.workSkills || [];
                      const newSkills = checked
                        ? [...currentSkills, skill]
                        : currentSkills.filter((s) => s !== skill);
                      updateField("workSkills", newSkills);
                    }}
                    data-testid={`checkbox-edit-skill-${skill.toLowerCase()}`}
                  />
                  <Label htmlFor={`edit-skill-${skill}`} className="text-sm font-normal cursor-pointer">
                    {skill}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select skills this staff member can perform (for job assignments)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="edit-isActive"
              checked={formData.isActive ?? true}
              onCheckedChange={(checked) => updateField("isActive", checked)}
              data-testid="switch-edit-staff-active"
            />
            <Label htmlFor="edit-isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-update-staff">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
