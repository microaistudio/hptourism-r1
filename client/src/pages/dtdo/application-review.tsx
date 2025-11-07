import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  FileText,
  User,
  MapPin,
  Home as HomeIcon,
  Calendar,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { HomestayApplication, Document as HomestayDocument } from "@shared/schema";

interface ApplicationData {
  application: HomestayApplication;
  owner: {
    fullName: string;
    mobile: string;
    email?: string;
  };
  documents: HomestayDocument[];
  daInfo?: {
    fullName: string;
    mobile: string;
  };
}

export default function DTDOApplicationReview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'revert' | null>(null);
  const [remarks, setRemarks] = useState("");

  const { data, isLoading } = useQuery<ApplicationData>({
    queryKey: ["/api/dtdo/applications", id],
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, remarks }: { action: string; remarks: string }) => {
      const response = await apiRequest("POST", `/api/dtdo/applications/${id}/${action}`, {
        remarks,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/applications", id] });
      toast({
        title: "Success",
        description: "Application processed successfully",
      });
      
      // If accepting, redirect to schedule inspection page
      if (variables.action === 'accept') {
        setLocation(`/dtdo/schedule-inspection/${id}`);
      } else {
        setLocation("/dtdo/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process application",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Not Found</h3>
            <Button onClick={() => setLocation("/dtdo/dashboard")} className="mt-4" data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { application, owner, documents, daInfo } = data;
  const applicationStatus = application.status ?? "forwarded_to_dtdo";
  const daRemarks = (application as unknown as { daRemarks?: string | null }).daRemarks ?? null;

  const handleAction = (action: 'accept' | 'reject' | 'revert') => {
    setActionType(action);
    setRemarks("");
  };

  const actionRequiresRemarks = (action: typeof actionType) =>
    action === 'accept' || action === 'reject' || action === 'revert';

  const confirmAction = () => {
    if (!actionType) return;
    
    if (actionRequiresRemarks(actionType) && !remarks.trim()) {
      const context =
        actionType === 'accept'
          ? 'scheduling the inspection'
          : actionType === 'reject'
          ? 'rejection'
          : 'reverting';
      toast({
        title: "Remarks Required",
        description: `Please provide remarks for ${context}.`,
        variant: "destructive",
      });
      return;
    }

    actionMutation.mutate({ action: actionType, remarks: remarks.trim() });
  };

  const getCategoryBadge = (category: string) => {
    const colorMap: Record<string, string> = {
      diamond: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
      gold: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20",
      silver: "bg-gray-50 text-gray-700 dark:bg-gray-950/20",
    };
    return (
      <Badge variant="outline" className={colorMap[category.toLowerCase()] || ""}>
        {category.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      forwarded_to_dtdo: {
        label: "Forwarded by DA",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/20",
      },
      dtdo_review: {
        label: "Under Review",
        className: "bg-orange-50 text-orange-700 dark:bg-orange-950/20",
      },
    };

    const config = statusConfig[status] || { label: status, className: "" };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/dtdo/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Application Review</h1>
            <p className="text-muted-foreground mt-1">{application.applicationNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {getCategoryBadge(application.category)}
          {getStatusBadge(applicationStatus)}
        </div>
      </div>

      {/* DA Remarks Card */}
      {(daRemarks || daInfo) && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <ClipboardCheck className="h-5 w-5" />
              DA Scrutiny Report
            </CardTitle>
            {daInfo && (
              <CardDescription>
                Forwarded by {daInfo.fullName} ({daInfo.mobile})
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
              <p className="text-sm whitespace-pre-wrap">
                {daRemarks || "No remarks provided"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Application Details */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="property">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="property" data-testid="tab-property">Property</TabsTrigger>
              <TabsTrigger value="owner" data-testid="tab-owner">Owner</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="property" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HomeIcon className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Property Name" value={application.propertyName} />
                  <DetailRow label="Category" value={application.category.toUpperCase()} />
                  <DetailRow label="Total Rooms" value={application.totalRooms.toString()} />
                  <DetailRow label="Address" value={application.address} />
                  <DetailRow label="District" value={application.district} />
                  <DetailRow label="Pincode" value={application.pincode} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Latitude" value={application.latitude || "N/A"} />
                  <DetailRow label="Longitude" value={application.longitude || "N/A"} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="owner" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Full Name" value={owner.fullName} />
                  <DetailRow label="Mobile" value={owner.mobile} />
                  <DetailRow label="Email" value={owner.email || "N/A"} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Uploaded Documents
                  </CardTitle>
                  <CardDescription>{documents.length} documents uploaded</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No documents uploaded
                      </p>
                    ) : (
                      documents.map((doc) => {
                        const fileUrl = (doc as { fileUrl?: string }).fileUrl ?? doc.filePath;
                        return (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{doc.documentType}</div>
                              <div className="text-xs text-muted-foreground">{doc.fileName}</div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (fileUrl) {
                                window.open(fileUrl, "_blank");
                              }
                            }}
                            data-testid={`button-view-doc-${doc.id}`}
                          >
                            View
                          </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Decision Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DTDO Decision</CardTitle>
              <CardDescription>Review and take action on this application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="default"
                onClick={() => handleAction('accept')}
                disabled={actionMutation.isPending}
                data-testid="button-accept"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept & Schedule Inspection
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleAction('revert')}
                disabled={actionMutation.isPending}
                data-testid="button-revert"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Revert to Applicant
              </Button>

              <Button
                className="w-full"
                variant="destructive"
                onClick={() => handleAction('reject')}
                disabled={actionMutation.isPending}
                data-testid="button-reject"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Application
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {application.submittedAt && (
                <div>
                  <div className="font-medium">Submitted</div>
                  <div className="text-muted-foreground">
                    {format(new Date(application.submittedAt), "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              )}
              {application.daForwardedDate && (
                <div>
                  <div className="font-medium">Forwarded by DA</div>
                  <div className="text-muted-foreground">
                    {format(new Date(application.daForwardedDate), "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' && 'Accept Application'}
              {actionType === 'reject' && 'Reject Application'}
              {actionType === 'revert' && 'Revert to Applicant'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept' && 'This will schedule an inspection for the property.'}
              {actionType === 'reject' && 'This will permanently reject the application. Please provide rejection reason.'}
              {actionType === 'revert' && 'This will send the application back to the applicant for corrections. Please provide details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">
                {actionType === 'accept'
                  ? 'Inspection Remarks (Required)'
                  : 'Remarks (Required)'}
              </Label>
              <Textarea
                id="remarks"
                placeholder={
                  actionType === 'accept'
                    ? 'Share instructions or observations for the inspection team...'
                    : actionType === 'reject'
                    ? 'Please specify the reason for rejection...'
                    : 'Please specify what corrections are needed...'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                data-testid="textarea-remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setActionType(null)}
              disabled={actionMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={
                actionMutation.isPending ||
                (actionRequiresRemarks(actionType) && !remarks.trim())
              }
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              data-testid="button-confirm-action"
            >
              {actionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {actionType === 'accept' ? 'Accept' : actionType === 'reject' ? 'Rejection' : 'Revert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-right">{value || "N/A"}</span>
    </div>
  );
}
