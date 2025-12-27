import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Plus, Search, Gift, Users, Award, Star, ArrowUpRight, ArrowDownRight, Crown, Trash2, Edit, Check, X, Phone } from "lucide-react";
import type { LoyaltyCustomer, Reward, Redemption, PointsTransaction, InsertLoyaltyCustomer, InsertReward } from "@shared/schema";
import { insertLoyaltyCustomerSchema, insertRewardSchema, LOYALTY_TIERS, LOYALTY_TIER_THRESHOLDS, LOYALTY_TIER_MULTIPLIERS, POINTS_PER_100_LKR } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserRole } from "@/contexts/UserRoleContext";

const SRI_LANKA_TZ = "Asia/Colombo";

function formatDateInSL(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, SRI_LANKA_TZ, "MMM d, yyyy");
}

function formatDateTimeInSL(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, SRI_LANKA_TZ, "MMM d, yyyy h:mm a");
}

function getTierColor(tier: string): string {
  switch (tier) {
    case "Platinum": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "Gold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "Silver": return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    default: return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  }
}

function getTierIcon(tier: string) {
  switch (tier) {
    case "Platinum": return <Crown className="w-3 h-3" />;
    case "Gold": return <Star className="w-3 h-3" />;
    case "Silver": return <Award className="w-3 h-3" />;
    default: return <Award className="w-3 h-3" />;
  }
}

function getRedemptionStatusColor(status: string): string {
  switch (status) {
    case "Fulfilled": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }
}

export default function LoyaltyProgram() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAdmin, isManager, isLimitedRole } = useUserRole();
  const canManage = isAdmin || isManager;

  const [searchTerm, setSearchTerm] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<LoyaltyCustomer | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<LoyaltyCustomer[]>({
    queryKey: ["/api/loyalty/customers"],
  });

  const { data: rewards = [], isLoading: loadingRewards } = useQuery<Reward[]>({
    queryKey: ["/api/loyalty/rewards"],
  });

  const { data: redemptions = [] } = useQuery<Redemption[]>({
    queryKey: ["/api/loyalty/redemptions"],
  });

  const { data: customerTransactions = [] } = useQuery<PointsTransaction[]>({
    queryKey: ["/api/loyalty/customers", selectedCustomer?.id, "transactions"],
    enabled: !!selectedCustomer,
  });

  const customerForm = useForm<InsertLoyaltyCustomer>({
    resolver: zodResolver(insertLoyaltyCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      vehicleNumbers: [],
    },
  });

  const rewardForm = useForm<InsertReward>({
    resolver: zodResolver(insertRewardSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsCost: 0,
      category: "Discount",
      isActive: true,
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertLoyaltyCustomer) => {
      return apiRequest("POST", "/api/loyalty/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/customers"] });
      setCustomerDialogOpen(false);
      customerForm.reset();
      toast({ title: t("loyalty.customerCreated"), description: t("loyalty.customerCreatedDesc") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLoyaltyCustomer> }) => {
      return apiRequest("PATCH", `/api/loyalty/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/customers"] });
      setCustomerDialogOpen(false);
      setEditingCustomer(null);
      customerForm.reset();
      toast({ title: t("loyalty.customerUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/loyalty/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/customers"] });
      toast({ title: t("loyalty.customerDeleted") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const createRewardMutation = useMutation({
    mutationFn: async (data: InsertReward) => {
      return apiRequest("POST", "/api/loyalty/rewards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      setRewardDialogOpen(false);
      rewardForm.reset();
      toast({ title: t("loyalty.rewardCreated") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertReward> }) => {
      return apiRequest("PATCH", `/api/loyalty/rewards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      setRewardDialogOpen(false);
      setEditingReward(null);
      rewardForm.reset();
      toast({ title: t("loyalty.rewardUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/loyalty/rewards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      toast({ title: t("loyalty.rewardDeleted") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const redeemRewardMutation = useMutation({
    mutationFn: async ({ customerId, rewardId }: { customerId: string; rewardId: string }) => {
      return apiRequest("POST", `/api/loyalty/customers/${customerId}/redeem`, { rewardId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/customers", selectedCustomer?.id, "transactions"] });
      setRedeemDialogOpen(false);
      toast({ title: t("loyalty.rewardRedeemed"), description: t("loyalty.rewardRedeemedDesc") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateRedemptionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "Fulfilled" | "Cancelled" }) => {
      return apiRequest("PATCH", `/api/loyalty/redemptions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/customers"] });
      toast({ title: t("loyalty.redemptionUpdated") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.vehicleNumbers?.some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    customerForm.reset({ name: "", phone: "", email: "", vehicleNumbers: [] });
    setCustomerDialogOpen(true);
  };

  const handleEditCustomer = (customer: LoyaltyCustomer) => {
    setEditingCustomer(customer);
    customerForm.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      vehicleNumbers: customer.vehicleNumbers || [],
    });
    setCustomerDialogOpen(true);
  };

  const handleAddReward = () => {
    setEditingReward(null);
    rewardForm.reset({ name: "", description: "", pointsCost: 0, category: "Discount", isActive: true });
    setRewardDialogOpen(true);
  };

  const handleEditReward = (reward: Reward) => {
    setEditingReward(reward);
    rewardForm.reset({
      name: reward.name,
      description: reward.description || "",
      pointsCost: reward.pointsCost,
      category: reward.category,
      stock: reward.stock,
      isActive: reward.isActive,
    });
    setRewardDialogOpen(true);
  };

  const handleCustomerSubmit = (data: InsertLoyaltyCustomer) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleRewardSubmit = (data: InsertReward) => {
    if (editingReward) {
      updateRewardMutation.mutate({ id: editingReward.id, data });
    } else {
      createRewardMutation.mutate(data);
    }
  };

  const openCustomerDetails = (customer: LoyaltyCustomer) => {
    setSelectedCustomer(customer);
    setCustomerDetailsOpen(true);
  };

  const totalMembers = customers.length;
  const totalPointsIssued = customers.reduce((sum, c) => sum + c.totalPoints, 0);
  const activeRewards = rewards.filter((r) => r.isActive).length;
  const pendingRedemptions = redemptions.filter((r) => r.status === "Pending").length;

  if (loadingCustomers || loadingRewards) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("loyalty.title")}</h1>
          <p className="text-muted-foreground">{t("loyalty.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("loyalty.totalMembers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-members">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("loyalty.totalPointsIssued")}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-points">{totalPointsIssued.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("loyalty.activeRewards")}</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-rewards">{activeRewards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("loyalty.pendingRedemptions")}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-redemptions">{pendingRedemptions}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" data-testid="tab-customers">{t("loyalty.customers")}</TabsTrigger>
          <TabsTrigger value="rewards" data-testid="tab-rewards">{t("loyalty.rewards")}</TabsTrigger>
          <TabsTrigger value="redemptions" data-testid="tab-redemptions">{t("loyalty.redemptions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("loyalty.searchCustomers")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-customers"
              />
            </div>
            <Button onClick={handleAddCustomer} data-testid="button-add-customer">
              <Plus className="w-4 h-4 mr-2" />
              {t("loyalty.addCustomer")}
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("loyalty.noCustomers")}</p>
                </CardContent>
              </Card>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="hover-elevate cursor-pointer" onClick={() => openCustomerDetails(customer)} data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{customer.name}</span>
                          <Badge className={`${getTierColor(customer.tier)} gap-1`}>
                            {getTierIcon(customer.tier)}
                            {customer.tier}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          {customer.vehicleNumbers && customer.vehicleNumbers.length > 0 && (
                            <span>{customer.vehicleNumbers.join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">{t("loyalty.availablePoints")}</div>
                          <div className="text-lg font-bold text-primary">{customer.availablePoints.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">{t("loyalty.totalSpent")}</div>
                          <div className="font-semibold">LKR {customer.totalSpent.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">{t("loyalty.visits")}</div>
                          <div className="font-semibold">{customer.visitCount}</div>
                        </div>
                        {canManage && (
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}
                              data-testid={`button-edit-customer-${customer.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); deleteCustomerMutation.mutate(customer.id); }}
                                data-testid={`button-delete-customer-${customer.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            {canManage && (
              <Button onClick={handleAddReward} data-testid="button-add-reward">
                <Plus className="w-4 h-4 mr-2" />
                {t("loyalty.addReward")}
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Gift className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("loyalty.noRewards")}</p>
                </CardContent>
              </Card>
            ) : (
              rewards.map((reward) => (
                <Card key={reward.id} className={!reward.isActive ? "opacity-60" : ""} data-testid={`card-reward-${reward.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg">{reward.name}</CardTitle>
                        <CardDescription>{reward.description}</CardDescription>
                      </div>
                      {!reward.isActive && <Badge variant="secondary">{t("loyalty.inactive")}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-bold text-primary">{reward.pointsCost.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{t("loyalty.points")}</div>
                        {reward.stock !== undefined && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {t("loyalty.stock")}: {reward.stock}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditReward(reward)}
                            data-testid={`button-edit-reward-${reward.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteRewardMutation.mutate(reward.id)}
                              data-testid={`button-delete-reward-${reward.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="redemptions" className="space-y-4">
          <div className="grid gap-4">
            {redemptions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Award className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("loyalty.noRedemptions")}</p>
                </CardContent>
              </Card>
            ) : (
              redemptions.map((redemption) => {
                const customer = customers.find((c) => c.id === redemption.customerId);
                return (
                  <Card key={redemption.id} data-testid={`card-redemption-${redemption.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <div className="font-semibold">{customer?.name || t("loyalty.unknownCustomer")}</div>
                          <div className="text-muted-foreground">{redemption.rewardName}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatDateTimeInSL(redemption.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-right">
                            <div className="font-semibold">{redemption.pointsUsed.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">{t("loyalty.pointsUsed")}</div>
                          </div>
                          <Badge className={getRedemptionStatusColor(redemption.status)}>
                            {redemption.status}
                          </Badge>
                          {canManage && redemption.status === "Pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateRedemptionStatusMutation.mutate({ id: redemption.id, status: "Fulfilled" })}
                                data-testid={`button-fulfill-${redemption.id}`}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateRedemptionStatusMutation.mutate({ id: redemption.id, status: "Cancelled" })}
                                data-testid={`button-cancel-${redemption.id}`}
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? t("loyalty.editCustomer") : t("loyalty.addCustomer")}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? t("loyalty.editCustomerDesc") : t("loyalty.addCustomerDesc")}
            </DialogDescription>
          </DialogHeader>
          <Form {...customerForm}>
            <form onSubmit={customerForm.handleSubmit(handleCustomerSubmit)} className="space-y-4">
              <FormField
                control={customerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customerForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("loyalty.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ""} data-testid="input-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)} data-testid="button-cancel-customer">
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending} data-testid="button-save-customer">
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? t("loyalty.editReward") : t("loyalty.addReward")}</DialogTitle>
            <DialogDescription>
              {editingReward ? t("loyalty.editRewardDesc") : t("loyalty.addRewardDesc")}
            </DialogDescription>
          </DialogHeader>
          <Form {...rewardForm}>
            <form onSubmit={rewardForm.handleSubmit(handleRewardSubmit)} className="space-y-4">
              <FormField
                control={rewardForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-reward-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={rewardForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("loyalty.description")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-reward-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={rewardForm.control}
                name="pointsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("loyalty.pointsCost")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-reward-points" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={rewardForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("loyalty.category")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-reward-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Discount">{t("loyalty.categoryDiscount")}</SelectItem>
                        <SelectItem value="Free Service">{t("loyalty.categoryFreeService")}</SelectItem>
                        <SelectItem value="Merchandise">{t("loyalty.categoryMerchandise")}</SelectItem>
                        <SelectItem value="Special">{t("loyalty.categorySpecial")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={rewardForm.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("loyalty.stock")} ({t("loyalty.optional")})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} 
                        data-testid="input-reward-stock" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setRewardDialogOpen(false)} data-testid="button-cancel-reward">
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createRewardMutation.isPending || updateRewardMutation.isPending} data-testid="button-save-reward">
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={customerDetailsOpen} onOpenChange={setCustomerDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCustomer?.name}
              {selectedCustomer && (
                <Badge className={`${getTierColor(selectedCustomer.tier)} gap-1`}>
                  {getTierIcon(selectedCustomer.tier)}
                  {selectedCustomer.tier}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer?.phone} {selectedCustomer?.email && `- ${selectedCustomer.email}`}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t("loyalty.availablePoints")}</div>
                  <div className="text-xl font-bold text-primary">{selectedCustomer.availablePoints.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("loyalty.totalPoints")}</div>
                  <div className="text-xl font-semibold">{selectedCustomer.totalPoints.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("loyalty.totalSpent")}</div>
                  <div className="text-xl font-semibold">LKR {selectedCustomer.totalSpent.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t("loyalty.visits")}</div>
                  <div className="text-xl font-semibold">{selectedCustomer.visitCount}</div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2">
                <h3 className="font-semibold">{t("loyalty.redeemReward")}</h3>
                <Button onClick={() => setRedeemDialogOpen(true)} disabled={selectedCustomer.availablePoints === 0} data-testid="button-open-redeem">
                  <Gift className="w-4 h-4 mr-2" />
                  {t("loyalty.redeem")}
                </Button>
              </div>

              <div>
                <h3 className="font-semibold mb-2">{t("loyalty.transactionHistory")}</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customerTransactions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("loyalty.noTransactions")}</p>
                  ) : (
                    customerTransactions.map((txn) => (
                      <div key={txn.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <div>
                          <div className="text-sm font-medium">{txn.description}</div>
                          <div className="text-xs text-muted-foreground">{formatDateTimeInSL(txn.createdAt)}</div>
                        </div>
                        <div className={`flex items-center gap-1 font-semibold ${txn.points >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {txn.points >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          {txn.points >= 0 ? "+" : ""}{txn.points}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("loyalty.selectReward")}</DialogTitle>
            <DialogDescription>
              {t("loyalty.availablePointsLabel")}: {selectedCustomer?.availablePoints.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {rewards.filter((r) => r.isActive && r.pointsCost <= (selectedCustomer?.availablePoints || 0)).length === 0 ? (
              <p className="text-muted-foreground">{t("loyalty.noAffordableRewards")}</p>
            ) : (
              rewards
                .filter((r) => r.isActive && r.pointsCost <= (selectedCustomer?.availablePoints || 0))
                .map((reward) => (
                  <Card key={reward.id} className="hover-elevate cursor-pointer" onClick={() => {
                    if (selectedCustomer) {
                      redeemRewardMutation.mutate({ customerId: selectedCustomer.id, rewardId: reward.id });
                    }
                  }} data-testid={`card-redeem-${reward.id}`}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{reward.name}</div>
                        <div className="text-sm text-muted-foreground">{reward.description}</div>
                      </div>
                      <div className="text-lg font-bold text-primary">{reward.pointsCost.toLocaleString()} pts</div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
