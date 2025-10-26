import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mountain, LogOut, Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import type { User, HomestayApplication } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData, isLoading: userLoading, error } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: !!userData?.user,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
      toast({
        title: "Logged out successfully",
      });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (error || !userData?.user) {
    setTimeout(() => setLocation("/login"), 0);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const user = userData.user;
  const applications = applicationsData?.applications || [];

  const stats = {
    total: applications.length,
    draft: applications.filter(a => a.status === 'draft').length,
    sentBack: applications.filter(a => a.status === 'sent_back_for_corrections').length,
    pending: applications.filter(a => a.status === 'submitted' || a.status === 'district_review' || a.status === 'state_review' || a.status === 'inspection_scheduled' || a.status === 'inspection_completed').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      submitted: { variant: "secondary", label: "Submitted" },
      district_review: { variant: "secondary", label: "District Review" },
      state_review: { variant: "secondary", label: "State Review" },
      sent_back_for_corrections: { variant: "destructive", label: "Sent Back for Corrections" },
      inspection_scheduled: { variant: "secondary", label: "Inspection Scheduled" },
      inspection_completed: { variant: "secondary", label: "Inspection Completed" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mountain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">HP Tourism Portal</h1>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium" data-testid="text-user-name">{user.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            {(user.role === 'district_officer' || user.role === 'state_officer') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/workflow-monitoring')}
                  data-testid="button-workflow-monitoring"
                >
                  Workflow Monitoring
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/analytics')}
                  data-testid="button-analytics"
                >
                  Analytics
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user.fullName}!</h2>
            <p className="text-muted-foreground">Manage your homestay applications</p>
          </div>
          {user.role === 'property_owner' && (
            <Button
              onClick={() => setLocation("/applications/new")}
              data-testid="button-new-application"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          )}
        </div>

        {/* Action Required Alert */}
        {user.role === 'property_owner' && stats.sentBack > 0 && (
          <Card className="mb-6 border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">Action Required</CardTitle>
              </div>
              <CardDescription>
                You have {stats.sentBack} application{stats.sentBack > 1 ? 's' : ''} sent back for corrections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                Your application{stats.sentBack > 1 ? 's have' : ' has'} been reviewed and require{stats.sentBack > 1 ? '' : 's'} corrections. 
                Please update and resubmit to continue processing.
              </p>
              <Button 
                variant="destructive"
                onClick={() => {
                  const sentBackApp = applications.find(a => a.status === 'sent_back_for_corrections');
                  if (sentBackApp) setLocation(`/applications/${sentBackApp.id}`);
                }}
                data-testid="button-view-sent-back"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                View and Update Application
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Applications</CardDescription>
              <CardTitle className="text-3xl" data-testid="stat-total">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <FileText className="w-4 h-4 mr-1" />
                All submissions
              </div>
            </CardContent>
          </Card>

          {user.role === 'property_owner' && stats.sentBack > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardDescription>Sent Back</CardDescription>
                <CardTitle className="text-3xl text-destructive" data-testid="stat-sent-back">{stats.sentBack}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Needs correction
                </div>
              </CardContent>
            </Card>
          )}

          {!(user.role === 'property_owner' && stats.sentBack > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Draft</CardDescription>
                <CardTitle className="text-3xl text-muted-foreground" data-testid="stat-draft">{stats.draft}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  Not submitted
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl text-orange-600" data-testid="stat-pending">{stats.pending}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                Under review
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-600" data-testid="stat-approved">{stats.approved}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Active properties
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>
              {user.role === 'property_owner' ? 'Your homestay applications' : 'Applications for review'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">
                  {user.role === 'property_owner' 
                    ? 'Start your first homestay registration application'
                    : 'No applications pending review'}
                </p>
                {user.role === 'property_owner' && (
                  <Button onClick={() => setLocation("/applications/new")} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Application
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/applications/${app.id}`)}
                    data-testid={`card-application-${app.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{app.propertyName}</h4>
                        {getStatusBadge(app.status || 'draft')}
                        <Badge variant="outline" className="capitalize">{app.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.applicationNumber} • {app.district} • {app.totalRooms} rooms
                      </p>
                      {app.status === 'sent_back_for_corrections' && app.officerFeedback && (
                        <p className="text-sm text-destructive mt-1">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {app.officerFeedback}
                        </p>
                      )}
                    </div>
                    {app.status === 'sent_back_for_corrections' ? (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/applications/${app.id}/update`);
                        }}
                        data-testid={`button-update-${app.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Update Application
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" data-testid={`button-view-${app.id}`}>
                        View Details
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
