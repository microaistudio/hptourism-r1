import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, CreditCard } from "lucide-react";
import type { User, HomestayApplication } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: userData, isLoading: userLoading, error } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: !!userData?.user,
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
  
  // Separate drafts from submitted applications
  const draftApplications = applications.filter(a => a.status === 'draft');
  const submittedApplications = applications.filter(a => a.status !== 'draft');

  // Different stats for different roles
  const stats = user.role === 'property_owner' ? {
    total: applications.length,
    draft: applications.filter(a => a.status === 'draft').length,
    sentBack: applications.filter(a => a.status === 'sent_back_for_corrections').length,
    paymentPending: applications.filter(a => a.status === 'payment_pending').length,
    pending: applications.filter(a => a.status === 'submitted' || a.status === 'district_review' || a.status === 'state_review' || a.status === 'inspection_scheduled' || a.status === 'inspection_completed').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  } : {
    // Officer stats - all applications they can see
    total: applications.length,
    pendingReview: applications.filter(a => 
      a.status === 'submitted' || 
      a.status === 'district_review' || 
      a.status === 'state_review' ||
      a.status === 'inspection_completed'
    ).length,
    inspectionScheduled: applications.filter(a => a.status === 'inspection_scheduled').length,
    paymentPending: applications.filter(a => a.status === 'payment_pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    sentBack: applications.filter(a => a.status === 'sent_back_for_corrections').length,
    draft: applications.filter(a => a.status === 'draft').length,
    pending: 0,
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
      payment_pending: { variant: "secondary", label: "Payment Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Welcome, {user.fullName}!</h2>
            {user.role === 'property_owner' && (
              <p className="text-muted-foreground">Manage your homestay applications</p>
            )}
            {user.role === 'district_officer' && (
              <p className="text-muted-foreground">District Officer Dashboard - {user.district || 'No District Assigned'}</p>
            )}
            {user.role === 'state_officer' && (
              <p className="text-muted-foreground">State Officer Dashboard - Statewide Access</p>
            )}
            {user.role === 'admin' && (
              <p className="text-muted-foreground">Administrator Dashboard</p>
            )}
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

        {/* Payment Required Alert */}
        {user.role === 'property_owner' && stats.paymentPending > 0 && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle className="text-primary">Payment Required</CardTitle>
              </div>
              <CardDescription>
                You have {stats.paymentPending} application{stats.paymentPending > 1 ? 's' : ''} awaiting payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                Your application{stats.paymentPending > 1 ? 's have' : ' has'} been approved for registration. 
                Complete the payment to receive your certificate.
              </p>
              <Button 
                onClick={() => {
                  const paymentApp = applications.find(a => a.status === 'payment_pending');
                  if (paymentApp) setLocation(`/applications/${paymentApp.id}/payment-gateway`);
                }}
                data-testid="button-make-payment"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Make Payment
              </Button>
            </CardContent>
          </Card>
        )}

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
                {user.role === 'property_owner' ? 'All submissions' : 
                 user.role === 'district_officer' ? `In ${user.district || 'district'}` : 'Statewide'}
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

          {user.role !== 'property_owner' && 'pendingReview' in stats && (
            <Card className="border-orange-600">
              <CardHeader className="pb-3">
                <CardDescription>Pending Review</CardDescription>
                <CardTitle className="text-3xl text-orange-600" data-testid="stat-pending-review">{stats.pendingReview}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  Requires action
                </div>
              </CardContent>
            </Card>
          )}

          {user.role === 'property_owner' && !(stats.sentBack > 0) && (
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

          {user.role === 'property_owner' && (
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
          )}

          {user.role !== 'property_owner' && 'inspectionScheduled' in stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Inspections</CardDescription>
                <CardTitle className="text-3xl text-blue-600" data-testid="stat-inspection">{stats.inspectionScheduled}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  Scheduled
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-600" data-testid="stat-approved">{stats.approved}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {user.role === 'property_owner' ? 'Active properties' : 'Completed'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Draft Applications Section - Only for property owners */}
        {user.role === 'property_owner' && draftApplications.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Draft Applications</CardTitle>
              </div>
              <CardDescription>
                Continue editing incomplete applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {draftApplications.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between p-4 border border-dashed rounded-lg hover-elevate"
                    data-testid={`card-draft-${draft.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{draft.propertyName || 'Untitled Application'}</h4>
                        {getStatusBadge('draft')}
                        {draft.category && <Badge variant="outline" className="capitalize">{draft.category}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {draft.district || 'Location not set'} 
                        {draft.totalRooms > 0 && ` • ${draft.totalRooms} rooms`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last saved: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => setLocation(`/applications/new?draft=${draft.id}`)}
                      data-testid={`button-resume-${draft.id}`}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Resume Editing
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>
              {user.role === 'property_owner' ? 'Your submitted homestay applications' : 'Applications for review'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (user.role === 'property_owner' ? submittedApplications.length === 0 : applications.length === 0) ? (
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
                {(user.role === 'property_owner' ? submittedApplications : applications).map((app) => (
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
                      {app.status === 'sent_back_for_corrections' && app.clarificationRequested && (
                        <p className="text-sm text-destructive mt-1">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {app.clarificationRequested}
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
                    ) : app.status === 'payment_pending' ? (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/applications/${app.id}/payment-gateway`);
                        }}
                        data-testid={`button-payment-${app.id}`}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Make Payment
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
      </div>
    </div>
  );
}
