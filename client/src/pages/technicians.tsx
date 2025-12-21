import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import type { Technician } from "@shared/schema";

interface TechnicianFormData {
  name: string;
  phone: string;
  specialization: string;
  isActive: boolean;
}

const initialFormData: TechnicianFormData = {
  name: "",
  phone: "",
  specialization: "",
  isActive: true,
};

export default function Technicians() {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTechnicianId, setDeleteTechnicianId] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  const { data: technicianList = [], isLoading, error } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TechnicianFormData) => {
      return apiRequest("POST", "/api/technicians", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setIsCreateOpen(false);
      toast({ title: "Success", description: "Technician added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add technician", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TechnicianFormData> }) => {
      return apiRequest("PATCH", `/api/technicians/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setIsEditOpen(false);
      setSelectedTechnician(null);
      toast({ title: "Success", description: "Technician updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update technician", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/technicians/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      setDeleteTechnicianId(null);
      toast({ title: "Success", description: "Technician removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove technician", variant: "destructive" });
    },
  });

  const activeCount = technicianList.filter((t) => t.isActive).length;
  const inactiveCount = technicianList.filter((t) => !t.isActive).length;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load technicians. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Technicians</h1>
          <p className="text-muted-foreground text-sm">Manage technicians who work on motorcycles</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-technician">
            <Plus className="w-4 h-4 mr-2" />
            Add Technician
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-count">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
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
                <p className="text-2xl font-bold" data-testid="text-inactive-count">{inactiveCount}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-card-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-count">{technicianList.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-card-border">
        <CardHeader>
          <h2 className="text-lg font-semibold">Technician Directory</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      {isAdmin && <TableCell><Skeleton className="h-8 w-20" /></TableCell>}
                    </TableRow>
                  ))
                ) : technicianList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No technicians found</p>
                      {isAdmin && (
                        <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add your first technician
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  technicianList.map((technician) => (
                    <TableRow key={technician.id} data-testid={`row-technician-${technician.id}`}>
                      <TableCell className="font-mono text-sm">{technician.id}</TableCell>
                      <TableCell className="font-medium">{technician.name}</TableCell>
                      <TableCell>{technician.phone}</TableCell>
                      <TableCell>{technician.specialization || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={technician.isActive ? "default" : "secondary"}>
                          {technician.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTechnician(technician);
                                setIsEditOpen(true);
                              }}
                              data-testid={`button-edit-technician-${technician.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTechnicianId(technician.id)}
                              data-testid={`button-delete-technician-${technician.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
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

      <TechnicianFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        title="Add Technician"
      />

      <TechnicianFormDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedTechnician(null);
        }}
        onSubmit={(data) => {
          if (selectedTechnician) {
            updateMutation.mutate({ id: selectedTechnician.id, data });
          }
        }}
        isPending={updateMutation.isPending}
        title="Edit Technician"
        defaultValues={selectedTechnician || undefined}
      />

      <AlertDialog open={!!deleteTechnicianId} onOpenChange={(open) => !open && setDeleteTechnicianId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technician</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this technician? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTechnicianId && deleteMutation.mutate(deleteTechnicianId)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TechnicianFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TechnicianFormData) => void;
  isPending: boolean;
  title: string;
  defaultValues?: Technician;
}

function TechnicianFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  title,
  defaultValues,
}: TechnicianFormDialogProps) {
  const [formData, setFormData] = useState<TechnicianFormData>(initialFormData);

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        setFormData({
          name: defaultValues.name,
          phone: defaultValues.phone,
          specialization: defaultValues.specialization || "",
          isActive: defaultValues.isActive,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, defaultValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "Update technician information" : "Add a new technician to the team"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter technician name"
              required
              data-testid="input-technician-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="07XXXXXXXX"
              required
              data-testid="input-technician-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              value={formData.specialization}
              onChange={(e) => setFormData((prev) => ({ ...prev, specialization: e.target.value }))}
              placeholder="e.g., Engine Repair, Electrical Systems"
              data-testid="input-technician-specialization"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active Status</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              data-testid="switch-technician-active"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-technician">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {defaultValues ? "Update" : "Add"} Technician
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
