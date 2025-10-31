import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Database, Trash2, RefreshCw } from "lucide-react";

export default function AdminConsole() {
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const resetDbMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/reset-db", {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Database reset successful",
        description: "All test data has been cleared from the database.",
      });
      setShowResetDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Database reset failed",
        description: error.message || "An error occurred while resetting the database",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground mt-2">
          System administration and database management
        </p>
      </div>

      <div className="grid gap-6">
        {/* Database Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>Database Management</CardTitle>
            </div>
            <CardDescription>
              Clear test data and reset the database to a clean state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Resetting the database will:
                  </p>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 list-disc list-inside space-y-1">
                    <li>Delete all homestay applications</li>
                    <li>Delete all uploaded documents (database records)</li>
                    <li>Delete all payment records</li>
                    <li>Delete all non-admin user accounts</li>
                    <li>Delete all production statistics</li>
                  </ul>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                    Admin accounts will be preserved.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowResetDialog(true)}
              disabled={resetDbMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-reset-db"
            >
              {resetDbMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resetting Database...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Database
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Future admin features can be added here */}
        <Card>
          <CardHeader>
            <CardTitle>System Statistics</CardTitle>
            <CardDescription>
              View system-wide statistics and health metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: Real-time system metrics, database size, active users, etc.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete all test data from the database including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All homestay applications</li>
                <li>All uploaded documents</li>
                <li>All payment records</li>
                <li>All non-admin users</li>
                <li>All production statistics</li>
              </ul>
              <p className="font-semibold mt-3">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetDbMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetDbMutation.mutate()}
              disabled={resetDbMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetDbMutation.isPending ? "Resetting..." : "Yes, Reset Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
