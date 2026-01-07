import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Loader2, AlertCircle, MessageSquare, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import type { SmsTemplate } from "@shared/schema";

interface TemplateFormData {
  name: string;
  message: string;
  isDefault: boolean;
}

const initialFormData: TemplateFormData = {
  name: "",
  message: "",
  isDefault: false,
};

const PLACEHOLDERS = [
  { key: "{{customerName}}", label: "Customer Name" },
  { key: "{{bikeModel}}", label: "Bike Model" },
  { key: "{{registration}}", label: "Registration Number" },
  { key: "{{jobCode}}", label: "Job Code" },
];

export default function SmsTemplatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin, isManager } = useUserRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");

  const canManage = isAdmin || isManager;

  const { data: templatesList = [], isLoading, error } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("POST", "/api/sms-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      setIsCreateOpen(false);
      setFormData(initialFormData);
      toast({ title: t("common.success"), description: t("smsTemplates.templateCreated", "Template created successfully") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      return apiRequest("PATCH", `/api/sms-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      setIsEditOpen(false);
      setSelectedTemplate(null);
      setFormData(initialFormData);
      toast({ title: t("common.success"), description: t("smsTemplates.templateUpdated", "Template updated successfully") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sms-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-templates"] });
      setDeleteTemplateId(null);
      toast({ title: t("common.success"), description: t("smsTemplates.templateDeleted", "Template deleted successfully") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("messages.errorOccurred"), variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (template: SmsTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      message: template.message,
      isDefault: template.isDefault,
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.message.trim()) {
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedTemplate || !formData.name.trim() || !formData.message.trim()) {
      return;
    }
    updateMutation.mutate({ id: selectedTemplate.id, data: formData });
  };

  const handleDelete = () => {
    if (deleteTemplateId) {
      deleteMutation.mutate(deleteTemplateId);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message + placeholder,
    }));
  };

  const filteredTemplates = templatesList.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.message.toLowerCase().includes(searchQuery.toLowerCase())
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
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
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
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <p className="text-lg font-medium text-foreground">{t("messages.errorOccurred")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
            {t("smsTemplates.title", "SMS Templates")}
          </h1>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} data-testid="button-add-template">
            <Plus className="w-4 h-4 mr-2" />
            {t("smsTemplates.addTemplate", "Add Template")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-templates"
          />
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">
                {searchQuery ? t("common.noResults") : t("smsTemplates.noTemplates", "No SMS templates yet")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("smsTemplates.createFirst", "Create your first template to get started")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("smsTemplates.templateName", "Template Name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("smsTemplates.message", "Message Preview")}</TableHead>
                  <TableHead>{t("smsTemplates.type", "Type")}</TableHead>
                  {canManage && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">
                      {template.message}
                    </TableCell>
                    <TableCell>
                      {template.isDefault ? (
                        <Badge variant="secondary">{t("smsTemplates.default", "Default")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("smsTemplates.custom", "Custom")}</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(template)}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTemplateId(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("smsTemplates.addTemplate", "Add Template")}</DialogTitle>
            <DialogDescription>
              {t("smsTemplates.addTemplateDescription", "Create a new SMS template with placeholders for customer data")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("smsTemplates.templateName", "Template Name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("smsTemplates.namePlaceholder", "e.g., Ready for Pickup")}
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t("smsTemplates.message", "Message")}</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t("smsTemplates.messagePlaceholder", "Enter your message template...")}
                rows={4}
                data-testid="input-template-message"
              />
              <div className="flex flex-wrap gap-1">
                {PLACEHOLDERS.map((p) => (
                  <Button
                    key={p.key}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    data-testid={`button-placeholder-${p.key}`}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t("smsTemplates.placeholderHelp", "Click the buttons above to insert placeholders that will be replaced with actual customer data.")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                data-testid="switch-is-default"
              />
              <Label htmlFor="isDefault">{t("smsTemplates.markAsDefault", "Mark as default template")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.name.trim() || !formData.message.trim()}
              data-testid="button-save-template"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("smsTemplates.editTemplate", "Edit Template")}</DialogTitle>
            <DialogDescription>
              {t("smsTemplates.editTemplateDescription", "Update the SMS template details")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("smsTemplates.templateName", "Template Name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-message">{t("smsTemplates.message", "Message")}</Label>
              <Textarea
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                data-testid="input-edit-template-message"
              />
              <div className="flex flex-wrap gap-1">
                {PLACEHOLDERS.map((p) => (
                  <Button
                    key={p.key}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                data-testid="switch-edit-is-default"
              />
              <Label htmlFor="edit-isDefault">{t("smsTemplates.markAsDefault", "Mark as default template")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} data-testid="button-cancel-edit">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !formData.name.trim() || !formData.message.trim()}
              data-testid="button-update-template"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("smsTemplates.deleteTemplate", "Delete Template")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("smsTemplates.deleteConfirmation", "Are you sure you want to delete this template? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
