import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  Users,
  FileText,
  Clock,
  Zap,
  HardDrive,
  ShieldAlert,
  TestTube,
  Download,
  Loader2,
} from "lucide-react";

interface SystemStats {
  database: {
    size: string;
    tables: number;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  files: {
    total: number;
    totalSize: string;
  };
  environment: string;
  resetEnabled: boolean;
  superConsoleOverride?: boolean;
}

type ResetOperation =
  | "full"
  | "applications"
  | "users"
  | "files"
  | "timeline"
  | "inspections"
  | "objections"
  | "payments";

interface ResetDialogState {
  open: boolean;
  operation: ResetOperation | null;
  confirmationText: string;
  reason: string;
}

export default function SuperAdminConsole() {
  const { toast } = useToast();
  const [resetDialog, setResetDialog] = useState<ResetDialogState>({
    open: false,
    operation: null,
    confirmationText: "",
    reason: "",
  });
  const [seedCount, setSeedCount] = useState(10);
  const [seedScenario, setSeedScenario] = useState("pending_da_review");

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch test payment mode status
  const { data: testModeData, isLoading: testModeLoading, refetch: refetchTestMode } = useQuery<{
    enabled: boolean;
    isDefault: boolean;
  }>({
    queryKey: ["/api/admin/settings/payment/test-mode"],
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async ({ operation, confirmationText, reason }: {
      operation: ResetOperation;
      confirmationText: string;
      reason: string;
    }) => {
      const response = await apiRequest("POST", `/api/admin/reset/${operation}`, {
        confirmationText,
        reason,
      });
      return response.json() as Promise<{ success: boolean; message: string; deletedCounts?: any }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Reset completed successfully",
        description: data.message || 'Operation completed',
      });
      setResetDialog({ open: false, operation: null, confirmationText: "", reason: "" });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "An error occurred during reset",
        variant: "destructive",
      });
    },
  });

  // Seed data mutation
  const seedMutation = useMutation({
    mutationFn: async ({ type, count, scenario }: {
      type: "applications" | "users" | "scenario";
      count?: number;
      scenario?: string;
    }) => {
      const response = await apiRequest("POST", `/api/admin/seed/${type}`, { count, scenario });
      return response.json() as Promise<{ success: boolean; message: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Test data generated",
        description: data.message || "Data created successfully",
      });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Seed failed",
        description: error.message || "Failed to generate test data",
        variant: "destructive",
      });
    },
  });

  // Toggle test payment mode mutation
  const toggleTestModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/payment/test-mode/toggle", { enabled });
      return enabled;
    },
    onSuccess: (_data, enabled) => {
      toast({
        title: enabled ? "Test payment mode enabled" : "Test payment mode disabled",
        description: enabled
          ? "🧪 Payment requests will send ₹1 to gateway (for testing)"
          : "Payment requests will send actual calculated amounts",
      });
      refetchTestMode();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update test mode",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleResetClick = (operation: ResetOperation) => {
    setResetDialog({ open: true, operation, confirmationText: "", reason: "" });
  };

  const handleResetConfirm = () => {
    if (!resetDialog.operation) return;

    const requiredText = resetDialog.operation === "full" ? "RESET" : "DELETE";

    if (resetDialog.confirmationText !== requiredText) {
      toast({
        title: "Confirmation failed",
        description: `Please type "${requiredText}" exactly to confirm`,
        variant: "destructive",
      });
      return;
    }

    if (!resetDialog.reason || resetDialog.reason.length < 10) {
      toast({
        title: "Reason required",
        description: "Please provide a reason (at least 10 characters)",
        variant: "destructive",
      });
      return;
    }

    resetMutation.mutate({
      operation: resetDialog.operation,
      confirmationText: resetDialog.confirmationText,
      reason: resetDialog.reason,
    });
  };

  const resetOperations: Array<{
    id: ResetOperation;
    title: string;
    description: string;
    icon: typeof Trash2;
    variant: "destructive" | "default";
  }> = [
    {
      id: "full",
      title: "Full System Reset",
      description: "Delete ALL data except super admin accounts",
      icon: AlertTriangle,
      variant: "destructive",
    },
    {
      id: "applications",
      title: "Clear Applications",
      description: "Delete all homestay applications and related data",
      icon: FileText,
      variant: "destructive",
    },
    {
      id: "users",
      title: "Clear Users",
      description: "Delete all non-admin users",
      icon: Users,
      variant: "destructive",
    },
    {
      id: "files",
      title: "Clear Files",
      description: "Delete all uploaded documents from storage",
      icon: HardDrive,
      variant: "destructive",
    },
    {
      id: "timeline",
      title: "Clear Timeline",
      description: "Delete application timeline entries",
      icon: Clock,
      variant: "default",
    },
    {
      id: "inspections",
      title: "Clear Inspections",
      description: "Delete all inspection orders and reports",
      icon: Database,
      variant: "default",
    },
    {
      id: "objections",
      title: "Clear Objections",
      description: "Delete all objection records",
      icon: ShieldAlert,
      variant: "default",
    },
    {
      id: "payments",
      title: "Clear Payments",
      description: "Delete all payment records",
      icon: Trash2,
      variant: "default",
    },
  ];

  const toggleSuperConsoleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/super-console/toggle", { enabled });
      return enabled;
    },
    onSuccess: (enabled) => {
      toast({
        title: enabled ? "Super console enabled" : "Super console disabled",
        description: enabled
          ? "The Super Admin Console has been enabled for this environment."
          : "The Super Admin Console override has been removed.",
      });
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to toggle super console",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  if (statsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Environment warning
  if (!stats?.resetEnabled) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Super Admin Console Disabled
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800 dark:text-orange-200">
              The Super Admin Console is only available in <strong>development</strong> and <strong>test</strong> environments.
              It is currently disabled because this appears to be a production environment.
            </p>
            <p className="mt-4 text-sm text-orange-700 dark:text-orange-300">
              Current environment: <Badge>{stats?.environment || "unknown"}</Badge>
            </p>
            <div className="mt-6">
              <Button
                onClick={() => toggleSuperConsoleMutation.mutate(true)}
                disabled={toggleSuperConsoleMutation.isPending}
              >
                {toggleSuperConsoleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling...
                  </>
                ) : (
                  "Enable Super Admin Console"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const environmentLabel = stats?.superConsoleOverride
    ? `${(stats.environment || '').toUpperCase()} (OVERRIDE)`
    : stats?.environment?.toUpperCase();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Super Admin Console</h1>
          <Badge variant="destructive" className="ml-2">
            {environmentLabel}
          </Badge>
          {stats?.superConsoleOverride && (
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => toggleSuperConsoleMutation.mutate(false)}
              disabled={toggleSuperConsoleMutation.isPending}
            >
              {toggleSuperConsoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable Override"
              )}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          System maintenance, reset operations, and test data generation
        </p>
      </div>

      {/* Environment Warning Banner */}
      <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                ⚠️ Development/Test Environment Only
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                All reset operations are <strong>destructive</strong> and <strong>cannot be undone</strong>.
                Use with extreme caution. All actions are logged for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>System Statistics</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStats()}
                data-testid="button-refresh-stats"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <CardDescription>Current state of the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Applications</p>
                </div>
                <p className="text-2xl font-bold">{stats?.applications.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total homestay apps</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Users</p>
                </div>
                <p className="text-2xl font-bold">{stats?.users.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Registered users</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Files</p>
                </div>
                <p className="text-2xl font-bold">{stats?.files.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.files.totalSize || "0 MB"}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Database</p>
                </div>
                <p className="text-2xl font-bold">{stats?.database.tables || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.database.size || "0 MB"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Operations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <CardTitle>Reset Operations</CardTitle>
            </div>
            <CardDescription>
              Dangerous zone - All operations are permanent and cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {resetOperations.map((op) => {
                const Icon = op.icon;
                return (
                  <Button
                    key={op.id}
                    variant={op.variant}
                    onClick={() => handleResetClick(op.id)}
                    className="h-auto py-4 flex-col items-start text-left"
                    data-testid={`button-reset-${op.id}`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <div className="font-medium">{op.title}</div>
                    <div className="text-xs opacity-80 font-normal mt-1">
                      {op.description}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle>Payment Settings</CardTitle>
            </div>
            <CardDescription>
              Configure payment gateway test mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Test Payment Mode</h3>
                  {testModeData?.enabled && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      🧪 Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {testModeData?.enabled 
                    ? "Payment requests send ₹1 to gateway (actual fee is calculated but not charged)"
                    : "Payment requests send actual calculated amounts to gateway"
                  }
                </p>
                {testModeData?.enabled && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Applications will calculate real fees, but only ₹1 will be sent to payment gateway for testing
                  </p>
                )}
              </div>
              <Button
                variant={testModeData?.enabled ? "destructive" : "default"}
                onClick={() => toggleTestModeMutation.mutate(!testModeData?.enabled)}
                disabled={testModeLoading || toggleTestModeMutation.isPending}
                data-testid="button-toggle-test-payment-mode"
              >
                {toggleTestModeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    {testModeData?.enabled ? "Disable" : "Enable"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Data Generation */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-primary" />
              <CardTitle>Generate Test Data</CardTitle>
            </div>
            <CardDescription>Create sample applications and users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="seed-count">Number of Applications</Label>
              <Input
                id="seed-count"
                type="number"
                value={seedCount}
                onChange={(e) => setSeedCount(parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                className="mt-1"
                data-testid="input-seed-count"
              />
            </div>
            <Button
              onClick={() => seedMutation.mutate({ type: "applications", count: seedCount })}
              disabled={seedMutation.isPending}
              className="w-full"
              data-testid="button-seed-applications"
            >
              {seedMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate {seedCount} Applications
                </>
              )}
            </Button>
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate({ type: "users" })}
                disabled={seedMutation.isPending}
                className="w-full"
                data-testid="button-seed-users"
              >
                Generate Test Users (All Roles)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Load Scenarios */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle>Load Scenario</CardTitle>
            </div>
            <CardDescription>Quick setups for testing specific workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="scenario">Select Scenario</Label>
              <Select value={seedScenario} onValueChange={setSeedScenario}>
                <SelectTrigger className="mt-1" data-testid="select-scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_da_review">
                    Pending DA Review (10 apps)
                  </SelectItem>
                  <SelectItem value="inspection_backlog">
                    Inspection Backlog (15 apps)
                  </SelectItem>
                  <SelectItem value="payment_pending">
                    Payment Pending (8 apps)
                  </SelectItem>
                  <SelectItem value="objections_raised">
                    Objections Raised (5 apps)
                  </SelectItem>
                  <SelectItem value="complete_workflow">
                    Complete Workflow (20 apps, mixed)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => seedMutation.mutate({ type: "scenario", scenario: seedScenario })}
              disabled={seedMutation.isPending}
              className="w-full"
              data-testid="button-load-scenario"
            >
              {seedMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Load Scenario
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialog.open} onOpenChange={(open) => {
        if (!open) {
          setResetDialog({ open: false, operation: null, confirmationText: "", reason: "" });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm {resetDialog.operation === "full" ? "Full System Reset" : "Delete Operation"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-semibold">
                  This will permanently delete data. This action cannot be undone!
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="confirmation-text">
                      Type{" "}
                      <code className="bg-muted px-1 rounded font-mono">
                        {resetDialog.operation === "full" ? "RESET" : "DELETE"}
                      </code>{" "}
                      to confirm
                    </Label>
                    <Input
                      id="confirmation-text"
                      value={resetDialog.confirmationText}
                      onChange={(e) =>
                        setResetDialog({ ...resetDialog, confirmationText: e.target.value })
                      }
                      placeholder={resetDialog.operation === "full" ? "RESET" : "DELETE"}
                      className="mt-1 font-mono"
                      data-testid="input-confirmation-text"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason (required, min 10 characters)</Label>
                    <Textarea
                      id="reason"
                      value={resetDialog.reason}
                      onChange={(e) =>
                        setResetDialog({ ...resetDialog, reason: e.target.value })
                      }
                      placeholder="e.g., Starting new test cycle"
                      className="mt-1"
                      data-testid="input-reason"
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetConfirm}
              disabled={resetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                "Confirm & Execute"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
