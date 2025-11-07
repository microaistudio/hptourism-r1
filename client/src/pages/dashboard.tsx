import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, CreditCard, Download } from "lucide-react";
import type { User, HomestayApplication } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FilterType = 'all' | 'draft' | 'pending' | 'approved' | 'rejected' | 'sent_back' | 'payment_pending' | 'pending_review' | 'inspection';

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const queryClient = useQueryClient();
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const { data: userData, isLoading: userLoading, error } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: !!userData?.user,
  });

  const searchParams = useMemo(() => {
    const query = location.includes("?") ? location.split("?")[1] : "";
    return new URLSearchParams(query);
  }, [location]);

  const paymentQuery = searchParams.get("payment");
  const paymentApplicationId = searchParams.get("application");
  const paymentApplicationNumber = searchParams.get("appNo");
  const paymentSuccess = paymentQuery === "success" && !!paymentApplicationId;
  const paymentFailed = paymentQuery === "failed" && !!paymentApplicationId;

  useEffect(() => {
    if (paymentQuery) {
      const timer = window.setTimeout(() => {
        const pathOnly = location.split("?")[0];
        setLocation(pathOnly, true);
      }, 6000);
      return () => window.clearTimeout(timer);
    }
  }, [paymentQuery, location, setLocation]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (error || !userData?.user) {
    setTimeout(() => setLocation("/login"), 0);
    return (
      <div className="flex items-center justify-center p-8">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const user = userData.user;
  const applications = applicationsData?.applications || [];
  
  // Separate drafts from submitted applications
  const draftApplications = applications.filter(a => a.status === 'draft');
  const submittedApplications = applications.filter(a => a.status !== 'draft');

  // Filter applications based on active filter
  const getFilteredApplications = () => {
    switch (activeFilter) {
      case 'draft':
        return applications.filter(a => a.status === 'draft');
      case 'pending':
        return applications.filter(a => 
          a.status === 'submitted' || 
          a.status === 'district_review' || 
          a.status === 'state_review' || 
          a.status === 'inspection_scheduled' || 
          a.status === 'inspection_completed' ||
          a.status === 'reverted_to_applicant' ||
          a.status === 'reverted_by_dtdo'
        );
      case 'pending_review':
        return applications.filter(a => 
          a.status === 'submitted' || 
          a.status === 'district_review' || 
          a.status === 'state_review' ||
          a.status === 'inspection_completed' ||
          a.status === 'reverted_to_applicant' ||
          a.status === 'reverted_by_dtdo'
        );
      case 'inspection':
        return applications.filter(a => a.status === 'inspection_scheduled');
      case 'approved':
        return applications.filter(a => a.status === 'approved');
      case 'rejected':
        return applications.filter(a => a.status === 'rejected');
      case 'sent_back':
        return applications.filter(a => a.status === 'sent_back_for_corrections' || a.status === 'reverted_to_applicant' || a.status === 'reverted_by_dtdo');
      case 'payment_pending':
        return applications.filter(a => a.status === 'payment_pending' || a.status === 'verified_for_payment');
      case 'all':
      default:
        return applications;
    }
  };

  const filteredApplications = getFilteredApplications();

  // Different stats for different roles
  const stats = user.role === 'property_owner' ? {
    total: applications.length,
    draft: applications.filter(a => a.status === 'draft').length,
    sentBack: applications.filter(a => a.status === 'sent_back_for_corrections' || a.status === 'reverted_to_applicant' || a.status === 'reverted_by_dtdo').length,
    paymentPending: applications.filter(a => a.status === 'payment_pending' || a.status === 'verified_for_payment').length,
    pending: applications.filter(a => a.status === 'submitted' || a.status === 'district_review' || a.status === 'state_review' || a.status === 'inspection_scheduled' || a.status === 'inspection_completed' || a.status === 'reverted_to_applicant' || a.status === 'reverted_by_dtdo').length,
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
    paymentPending: applications.filter(a => a.status === 'payment_pending' || a.status === 'verified_for_payment').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    sentBack: applications.filter(a => a.status === 'sent_back_for_corrections').length,
    draft: applications.filter(a => a.status === 'draft').length,
    pending: 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning", label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      submitted: { variant: "secondary", label: "Submitted" },
      district_review: { variant: "secondary", label: "District Review" },
      state_review: { variant: "secondary", label: "State Review" },
      sent_back_for_corrections: { variant: "warning", label: "Sent Back for Corrections" },
      reverted_to_applicant: { variant: "warning", label: "Reverted by DA" },
      reverted_by_dtdo: { variant: "warning", label: "Reverted by DTDO" },
      inspection_scheduled: { variant: "secondary", label: "Inspection Scheduled" },
      inspection_completed: { variant: "secondary", label: "Inspection Completed" },
      payment_pending: { variant: "secondary", label: "Payment Pending" },
      verified_for_payment: { variant: "secondary", label: "Payment Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="bg-background p-6">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {paymentSuccess && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <AlertTitle>Payment Successful</AlertTitle>
              <AlertDescription>
                Application {paymentApplicationNumber || paymentApplicationId} is now approved.
                Download your certificate from the application card below.
              </AlertDescription>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => setLocation(`/applications/${paymentApplicationId}`)}
                data-testid="button-view-certificate"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Certificate
              </Button>
            </div>
          </Alert>
        )}

        {paymentFailed && (
          <Alert className="mb-6 border-destructive/40 bg-red-50">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <AlertTitle>Payment Failed</AlertTitle>
              <AlertDescription>
                We could not confirm the payment for application {paymentApplicationNumber || paymentApplicationId}.
                Please try again or contact support with your HimKosh reference ID.
              </AlertDescription>
            </div>
          </Alert>
        )}

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              data-testid="button-dashboard-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
                  const paymentApp = applications.find(a => a.status === 'payment_pending' || a.status === 'verified_for_payment');
                  if (paymentApp) setLocation(`/applications/${paymentApp.id}/payment-himkosh`);
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
          <Card className="mb-6 border border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-orange-600">Action Required</CardTitle>
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
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => {
                  const sentBackApp = applications.find(a => a.status === 'sent_back_for_corrections' || a.status === 'reverted_to_applicant' || a.status === 'reverted_by_dtdo');
                  if (sentBackApp) setLocation(`/applications/new?application=${sentBackApp.id}`);
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
          <Card 
            className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveFilter('all')}
            data-testid="card-filter-all"
          >
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
            <Card 
              className={`border border-orange-500 cursor-pointer hover-elevate transition-all ${activeFilter === 'sent_back' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setActiveFilter('sent_back')}
              data-testid="card-filter-sent-back"
            >
              <CardHeader className="pb-3">
                <CardDescription>Sent Back</CardDescription>
                <CardTitle className="text-3xl text-orange-600" data-testid="stat-sent-back">{stats.sentBack}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mr-1 text-orange-500" />
                  Needs correction
                </div>
              </CardContent>
            </Card>
          )}

          {user.role !== 'property_owner' && 'pendingReview' in stats && (
            <Card 
              className={`border-orange-600 cursor-pointer hover-elevate transition-all ${activeFilter === 'pending_review' ? 'ring-2 ring-orange-600' : ''}`}
              onClick={() => setActiveFilter('pending_review')}
              data-testid="card-filter-pending-review"
            >
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
            <Card 
              className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'draft' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveFilter('draft')}
              data-testid="card-filter-draft"
            >
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
            <Card 
              className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'pending' ? 'ring-2 ring-orange-600' : ''}`}
              onClick={() => setActiveFilter('pending')}
              data-testid="card-filter-pending"
            >
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
            <Card 
              className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'inspection' ? 'ring-2 ring-blue-600' : ''}`}
              onClick={() => setActiveFilter('inspection')}
              data-testid="card-filter-inspection"
            >
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

          <Card 
            className={`cursor-pointer hover-elevate transition-all ${activeFilter === 'approved' ? 'ring-2 ring-green-600' : ''}`}
            onClick={() => setActiveFilter('approved')}
            data-testid="card-filter-approved"
          >
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {activeFilter === 'all' && 'All Applications'}
                  {activeFilter === 'draft' && 'Draft Applications'}
                  {activeFilter === 'pending' && 'Pending Review'}
                  {activeFilter === 'pending_review' && 'Pending Review'}
                  {activeFilter === 'inspection' && 'Inspection Scheduled'}
                  {activeFilter === 'approved' && 'Approved Applications'}
                  {activeFilter === 'rejected' && 'Rejected Applications'}
                  {activeFilter === 'sent_back' && 'Sent Back for Corrections'}
                  {activeFilter === 'payment_pending' && 'Payment Pending'}
                </CardTitle>
                <CardDescription>
                  {activeFilter === 'all' && (user.role === 'property_owner' ? 'Your homestay applications' : 'Applications for review')}
                  {activeFilter === 'draft' && 'Continue editing incomplete applications'}
                  {activeFilter === 'pending' && 'Applications under review'}
                  {activeFilter === 'pending_review' && 'Requires officer action'}
                  {activeFilter === 'inspection' && 'Site inspections scheduled'}
                  {activeFilter === 'approved' && 'Registration completed'}
                  {activeFilter === 'rejected' && 'Not approved'}
                  {activeFilter === 'sent_back' && 'Needs corrections'}
                  {activeFilter === 'payment_pending' && 'Payment required to complete'}
                </CardDescription>
              </div>
              {activeFilter !== 'all' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                  data-testid="button-clear-filter"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeFilter === 'all' ? 'No applications yet' : `No ${activeFilter.replace('_', ' ')} applications`}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilter === 'all' && user.role === 'property_owner' 
                    ? 'Start your first homestay registration application'
                    : `No applications match this filter`}
                </p>
                {user.role === 'property_owner' && activeFilter === 'all' && (
                  <Button onClick={() => setLocation("/applications/new")} data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Application
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApplications.map((app) => {
                  const isHighlighted = paymentSuccess && paymentApplicationId === app.id;
                  return (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer transition-all ${
                      isHighlighted ? "border-green-500 ring-2 ring-green-200" : ""
                    }`}
                    onClick={() => {
                      if (app.status === 'draft') {
                        setLocation(`/applications/new?draft=${app.id}`);
                      } else if (app.status === 'sent_back_for_corrections' || app.status === 'reverted_to_applicant' || app.status === 'reverted_by_dtdo') {
                        setLocation(`/applications/new?application=${app.id}`);
                      } else {
                        setLocation(`/applications/${app.id}`);
                      }
                    }}
                    data-testid={`card-application-${app.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{app.propertyName}</h4>
                        {getStatusBadge(app.status || 'draft')}
                        <Badge variant="outline" className="capitalize">{app.category}</Badge>
                        {isHighlighted && (
                          <Badge variant="default" className="bg-green-600">
                            Certificate Ready
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.applicationNumber} • {app.district} • {app.totalRooms} rooms
                      </p>
                      {(app.status === 'sent_back_for_corrections' || app.status === 'reverted_to_applicant' || app.status === 'reverted_by_dtdo') && (app.clarificationRequested || (app as any).dtdoRemarks) && (
                        <p className="text-sm text-amber-600 mt-1">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {app.clarificationRequested || (app as any).dtdoRemarks}
                        </p>
                      )}
                    </div>
                    {app.status === 'draft' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/applications/new?draft=${app.id}`);
                        }}
                        data-testid={`button-resume-${app.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Resume Editing
                      </Button>
                    ) : (app.status === 'sent_back_for_corrections' || app.status === 'reverted_to_applicant' || app.status === 'reverted_by_dtdo') ? (
                      <Button 
                        variant="warning" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/applications/new?application=${app.id}`);
                        }}
                        data-testid={`button-update-${app.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Continue Corrections
                      </Button>
                    ) : (app.status === 'payment_pending' || app.status === 'verified_for_payment') ? (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/applications/${app.id}/payment-himkosh`);
                        }}
                        data-testid={`button-payment-${app.id}`}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Make Payment
                      </Button>
                    ) : (
                      <Button
                        variant={isHighlighted ? "default" : "ghost"}
                        size="sm"
                        data-testid={`button-view-${app.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/applications/${app.id}`);
                        }}
                      >
                        {isHighlighted ? (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download Certificate
                          </>
                        ) : (
                          "View Details"
                        )}
                      </Button>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
