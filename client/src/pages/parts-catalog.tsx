import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { PartsCatalog } from "@shared/schema";

interface PartFormData {
  partNumber: string;
  name: string;
  price: number;
}

const initialFormData: PartFormData = {
  partNumber: "",
  name: "",
  price: 0,
};

export default function PartsCatalogPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin, isManager } = useUserRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletePartId, setDeletePartId] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartsCatalog | null>(null);
  const [formData, setFormData] = useState<PartFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");

  const canManage = isAdmin || isManager;

  const { data: partsList = [], isLoading, error } = useQuery<PartsCatalog[]>({
    queryKey: ["/api/parts-catalog"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PartFormData) => {
      return apiRequest("POST", "/api/parts-catalog", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-catalog"] });
      setIsCreateOpen(false);
      setFormData(initialFormData);
      toast({ title: t("common.success"), description: t("partsCatalog.partCreated") });
    },
    onError: (error: Error) => {
      const message = error.message.includes("409") 
        ? t("partsCatalog.partNumberExists") 
        : t("messages.errorOccurred");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PartFormData> }) => {
      return apiRequest("PATCH", `/api/parts-catalog/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-catalog"] });
      setIsEditOpen(false);
      setSelectedPart(null);
      setFormData(initialFormData);
      toast({ title: t("common.success"), description: t("partsCatalog.partUpdated") });
    },
    onError: (error: Error) => {
      const message = error.message.includes("409") 
        ? t("partsCatalog.partNumberExists") 
        : t("messages.errorOccurred");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/parts-catalog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-catalog"] });
      setDeletePartId(null);
      toast({ title: t("common.success"), description: t("partsCatalog.partDeleted") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (part: PartsCatalog) => {
    setSelectedPart(part);
    setFormData({
      partNumber: part.partNumber,
      name: part.name,
      price: part.price,
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    if (!formData.partNumber.trim() || !formData.name.trim() || formData.price <= 0) {
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedPart || !formData.partNumber.trim() || !formData.name.trim() || formData.price <= 0) {
      return;
    }
    updateMutation.mutate({ id: selectedPart.id, data: formData });
  };

  const handleDelete = () => {
    if (deletePartId) {
      deleteMutation.mutate(deletePartId);
    }
  };

  const filteredParts = partsList.filter(part =>
    part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">{t("common.error")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("partsCatalog.title")}</h1>
          <p className="text-muted-foreground">{t("partsCatalog.subtitle")}</p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} data-testid="button-add-part">
            <Plus className="h-4 w-4 mr-2" />
            {t("partsCatalog.addPart")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("partsCatalog.totalParts")}</p>
              <p className="text-2xl font-bold">{partsList.length}</p>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center">
          <Input
            placeholder={t("partsCatalog.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-parts"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="font-semibold">{t("partsCatalog.title")}</h2>
        </CardHeader>
        <CardContent>
          {filteredParts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("partsCatalog.noParts")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("partsCatalog.partNumber")}</TableHead>
                    <TableHead>{t("partsCatalog.partName")}</TableHead>
                    <TableHead className="text-right">{t("partsCatalog.price")}</TableHead>
                    {canManage && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={part.id} data-testid={`row-part-${part.id}`}>
                      <TableCell className="font-mono">{part.partNumber}</TableCell>
                      <TableCell>{part.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        LKR {part.price.toLocaleString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEdit(part)}
                              data-testid={`button-edit-part-${part.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletePartId(part.id)}
                              data-testid={`button-delete-part-${part.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("partsCatalog.addPart")}</DialogTitle>
            <DialogDescription>{t("partsCatalog.addPartDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partNumber">{t("partsCatalog.partNumber")}</Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
                placeholder="EO-001"
                data-testid="input-part-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("partsCatalog.partName")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Engine Oil 10W-30 (1L)"
                data-testid="input-part-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">{t("partsCatalog.price")} (LKR)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="850"
                data-testid="input-part-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("partsCatalog.editPart")}</DialogTitle>
            <DialogDescription>{t("partsCatalog.editPartDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editPartNumber">{t("partsCatalog.partNumber")}</Label>
              <Input
                id="editPartNumber"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value.toUpperCase() })}
                data-testid="input-edit-part-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editName">{t("partsCatalog.partName")}</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-part-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPrice">{t("partsCatalog.price")} (LKR)</Label>
              <Input
                id="editPrice"
                type="number"
                min="0"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                data-testid="input-edit-part-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateMutation.isPending}
              data-testid="button-submit-update"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePartId} onOpenChange={(open) => !open && setDeletePartId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("partsCatalog.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
