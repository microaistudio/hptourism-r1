import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Database, Trash2, RefreshCw, Terminal, Play, Table2, FileCode } from "lucide-react";

// Pre-made SQL query templates
const QUERY_TEMPLATES = {
  "View all users": "SELECT id, mobile, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 20;",
  "Count applications by status": "SELECT status, COUNT(*) as count FROM homestay_applications GROUP BY status ORDER BY count DESC;",
  "View recent applications": "SELECT id, property_name, status, created_at FROM homestay_applications ORDER BY created_at DESC LIMIT 10;",
  "View all DDO codes": "SELECT * FROM ddo_codes ORDER BY district;",
  "View LGD districts": "SELECT * FROM lgd_districts ORDER BY name;",
  "Count users by role": "SELECT role, COUNT(*) as count FROM users GROUP BY role;",
  "View recent payments": "SELECT id, application_id, amount, status, created_at FROM payments ORDER BY created_at DESC LIMIT 10;",
  "Table sizes": "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;",
};

export default function AdminConsole() {
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [preserveDdoCodes, setPreserveDdoCodes] = useState(true);
  const [preservePropertyOwners, setPreservePropertyOwners] = useState(false);
  const [preserveDistrictOfficers, setPreserveDistrictOfficers] = useState(false);
  const [preserveStateOfficers, setPreserveStateOfficers] = useState(false);
  const [preserveLgdData, setPreserveLgdData] = useState(true);
  
  // DB Console state
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Fetch tables list
  const { data: tablesData } = useQuery<{ tables: { table_name: string; size: string }[] }>({
    queryKey: ['/api/admin/db-console/tables'],
    enabled: true,
  });

  // Execute SQL query mutation
  const executeQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/admin/db-console/execute", { query });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('[DB Console] Query result:', data);
      console.log('[DB Console] Success:', data.success, 'Row count:', data.rowCount, 'Data length:', data.data?.length);
      setQueryResult(data);
      toast({
        title: "Query executed successfully",
        description: `${data.type === 'read' ? 'Read' : 'Write'} query returned ${data.rowCount} row(s)`,
      });
    },
    onError: (error: any) => {
      console.error('[DB Console] Query error:', error);
      toast({
        title: "Query execution failed",
        description: error.message || "An error occurred while executing the query",
        variant: "destructive",
      });
      setQueryResult({ success: false, error: error.message || "Unknown error" });
    },
  });

  const resetDbMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/reset-db", {
        preserveDdoCodes,
        preservePropertyOwners,
        preserveDistrictOfficers,
        preserveStateOfficers,
        preserveLgdData,
      });
    },
    onSuccess: (data: any) => {
      // Build detailed success message
      const preservedInfo = data.preserved;
      const preservedByRole = preservedInfo?.byRole || {};
      const roleList = Object.entries(preservedByRole)
        .map(([role, count]) => `${role}: ${count}`)
        .join(", ");
      
      toast({
        title: "Database reset successful",
        description: (
          <div className="space-y-2">
            <p>All test data has been cleared from the database.</p>
            <div className="mt-2 text-xs space-y-1">
              {/* Configuration data preservation (always show) */}
              {preservedInfo?.ddoCodes && <p className="text-muted-foreground">✓ DDO Codes preserved</p>}
              {!preservedInfo?.ddoCodes && <p className="text-muted-foreground">✗ DDO Codes deleted</p>}
              {preservedInfo?.lgdData && <p className="text-muted-foreground">✓ LGD Master Data preserved</p>}
              {!preservedInfo?.lgdData && <p className="text-muted-foreground">✗ LGD Master Data deleted</p>}
              
              {/* User preservation (conditional) */}
              {preservedInfo?.totalUsers > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Preserved {preservedInfo.totalUsers} user(s):</p>
                  <p className="text-muted-foreground">{roleList}</p>
                  {preservedInfo.propertyOwners && <p className="text-muted-foreground">✓ Property owners preserved</p>}
                  {preservedInfo.districtOfficers && <p className="text-muted-foreground">✓ District officers preserved</p>}
                  {preservedInfo.stateOfficers && <p className="text-muted-foreground">✓ State officers preserved</p>}
                </div>
              )}
              {preservedInfo?.totalUsers === 0 && (
                <p className="text-muted-foreground">All non-admin users deleted</p>
              )}
            </div>
          </div>
        ),
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

        {/* Database Console Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              <CardTitle>Database Console</CardTitle>
            </div>
            <CardDescription>
              Execute SQL queries and explore database tables (Development only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dev-only notice */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                🛠️ <strong>Development Tool:</strong> This console is only available in development mode and is automatically disabled in production for security.
              </p>
            </div>
            {/* Query Templates */}
            <div className="space-y-2">
              <Label htmlFor="template-select">Quick Query Templates</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedTemplate}
                  onValueChange={(value) => {
                    setSelectedTemplate(value);
                    setSqlQuery(QUERY_TEMPLATES[value as keyof typeof QUERY_TEMPLATES] || "");
                  }}
                >
                  <SelectTrigger className="flex-1" id="template-select">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(QUERY_TEMPLATES).map((template) => (
                      <SelectItem key={template} value={template}>
                        {template}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate("");
                    setSqlQuery("");
                    setQueryResult(null);
                  }}
                  data-testid="button-clear-query"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* SQL Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sql-input">SQL Query</Label>
                {sqlQuery.trim().toLowerCase().startsWith('select') && (
                  <Badge variant="outline" className="text-xs">
                    <FileCode className="w-3 h-3 mr-1" />
                    READ
                  </Badge>
                )}
                {sqlQuery && !sqlQuery.trim().toLowerCase().startsWith('select') && !sqlQuery.trim().toLowerCase().startsWith('show') && !sqlQuery.trim().toLowerCase().startsWith('explain') && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    WRITE
                  </Badge>
                )}
              </div>
              <Textarea
                id="sql-input"
                placeholder="Enter your SQL query here... (e.g., SELECT * FROM users LIMIT 10;)"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="font-mono text-sm min-h-[120px]"
                data-testid="textarea-sql-query"
              />
            </div>

            {/* Execute Button */}
            <Button
              onClick={() => executeQueryMutation.mutate(sqlQuery)}
              disabled={!sqlQuery.trim() || executeQueryMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-execute-query"
            >
              {executeQueryMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Query
                </>
              )}
            </Button>

            {/* Tables List */}
            {tablesData?.tables && tablesData.tables.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  Available Tables ({tablesData.tables.length})
                </Label>
                <ScrollArea className="h-[120px] border rounded-md p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tablesData.tables.map((table) => (
                      <Button
                        key={table.table_name}
                        variant="ghost"
                        size="sm"
                        className="justify-start h-auto py-1.5 px-2 text-xs font-mono"
                        onClick={() => setSqlQuery(`SELECT * FROM ${table.table_name} LIMIT 10;`)}
                        data-testid={`button-table-${table.table_name}`}
                      >
                        {table.table_name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Query Results */}
            {queryResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Query Results</Label>
                  {queryResult.success && (
                    <Badge variant="outline" className="text-xs">
                      {queryResult.rowCount} row(s)
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  {queryResult.success ? (
                    <div className="space-y-2">
                      {queryResult.data && queryResult.data.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b">
                                {Object.keys(queryResult.data[0]).map((key) => (
                                  <th
                                    key={key}
                                    className="text-left p-2 font-semibold bg-muted/50"
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.data.map((row: any, idx: number) => (
                                <tr key={idx} className="border-b hover:bg-muted/30">
                                  {Object.values(row).map((value: any, vidx: number) => (
                                    <td key={vidx} className="p-2 font-mono">
                                      {value === null ? (
                                        <span className="text-muted-foreground italic">NULL</span>
                                      ) : typeof value === 'object' ? (
                                        <span className="text-xs">{JSON.stringify(value)}</span>
                                      ) : (
                                        String(value)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Query executed successfully. No rows returned.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                      <p className="text-sm font-semibold text-destructive mb-1">Error:</p>
                      <p className="text-xs font-mono text-destructive/90">
                        {queryResult.error || "Unknown error"}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Click on any table name to quickly view its contents. Use the templates for common queries.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete all test data from the database including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All homestay applications and related records</li>
                <li>All uploaded documents</li>
                <li>All payment records</li>
                <li>Users (based on preservation settings below)</li>
                <li>All production statistics</li>
              </ul>
              
              <div className="border-t pt-3 mt-3">
                <p className="font-semibold text-sm mb-3 text-foreground">Preservation Options:</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-ddo"
                      checked={preserveDdoCodes}
                      onCheckedChange={(checked) => setPreserveDdoCodes(checked as boolean)}
                      data-testid="checkbox-preserve-ddo"
                    />
                    <Label htmlFor="preserve-ddo" className="text-sm font-normal cursor-pointer">
                      Preserve DDO Codes (configuration data)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-owners"
                      checked={preservePropertyOwners}
                      onCheckedChange={(checked) => setPreservePropertyOwners(checked as boolean)}
                      data-testid="checkbox-preserve-owners"
                    />
                    <Label htmlFor="preserve-owners" className="text-sm font-normal cursor-pointer">
                      Preserve Property Owners
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-district"
                      checked={preserveDistrictOfficers}
                      onCheckedChange={(checked) => setPreserveDistrictOfficers(checked as boolean)}
                      data-testid="checkbox-preserve-district"
                    />
                    <Label htmlFor="preserve-district" className="text-sm font-normal cursor-pointer">
                      Preserve District Officers (DA, DTDO)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-state"
                      checked={preserveStateOfficers}
                      onCheckedChange={(checked) => setPreserveStateOfficers(checked as boolean)}
                      data-testid="checkbox-preserve-state"
                    />
                    <Label htmlFor="preserve-state" className="text-sm font-normal cursor-pointer">
                      Preserve State Officers
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserve-lgd"
                      checked={preserveLgdData}
                      onCheckedChange={(checked) => setPreserveLgdData(checked as boolean)}
                      data-testid="checkbox-preserve-lgd"
                    />
                    <Label htmlFor="preserve-lgd" className="text-sm font-normal cursor-pointer">
                      Preserve LGD Master Data (HP Hierarchy)
                    </Label>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    ℹ️ Admin and Super Admin accounts are always preserved
                  </p>
                </div>
              </div>
              
              <p className="font-semibold mt-3 text-destructive">
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
              data-testid="button-confirm-reset"
            >
              {resetDbMutation.isPending ? "Resetting..." : "Yes, Reset Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
