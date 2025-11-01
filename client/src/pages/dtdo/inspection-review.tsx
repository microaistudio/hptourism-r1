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
  Shield,
  Star,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { HomestayApplication, InspectionReport, InspectionOrder } from "@shared/schema";

interface InspectionReviewData {
  report: InspectionReport;
  application: HomestayApplication;
  inspectionOrder: InspectionOrder;
  owner: {
    fullName: string;
    mobile: string;
    email?: string;
  } | null;
  da: {
    fullName: string;
    mobile: string;
  } | null;
}

export default function DTDOInspectionReview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'objections' | null>(null);
  const [remarks, setRemarks] = useState("");

  const { data, isLoading } = useQuery<InspectionReviewData>({
    queryKey: ["/api/dtdo/inspection-report", id],
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, remarks }: { action: string; remarks: string }) => {
      const response = await apiRequest("POST", `/api/dtdo/inspection-report/${id}/${action}`, {
        remarks,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/inspection-report", id] });
      toast({
        title: "Success",
        description: "Inspection report processed successfully",
      });
      setLocation("/dtdo/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process inspection report",
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
            <h3 className="text-xl font-semibold mb-2">Inspection Report Not Found</h3>
            <Button onClick={() => setLocation("/dtdo/dashboard")} className="mt-4" data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, application, inspectionOrder, owner, da } = data;

  const handleAction = (action: 'approve' | 'reject' | 'objections') => {
    setActionType(action);
    setRemarks("");
  };

  const confirmAction = () => {
    if (!actionType) return;
    
    if (!remarks.trim() && (actionType === 'reject' || actionType === 'objections')) {
      toast({
        title: "Remarks Required",
        description: `Please provide ${actionType === 'reject' ? 'rejection reason' : 'objection details'}`,
        variant: "destructive",
      });
      return;
    }

    actionMutation.mutate({ action: actionType, remarks: remarks.trim() });
  };

  // Calculate compliance
  const mandatoryChecklist = report.mandatoryChecklist as Record<string, boolean> || {};
  const desirableChecklist = report.desirableChecklist as Record<string, boolean> || {};
  
  const mandatoryValues = Object.values(mandatoryChecklist);
  const mandatoryCompliance = mandatoryValues.length > 0 
    ? Math.round((mandatoryValues.filter(Boolean).length / mandatoryValues.length) * 100)
    : 0;
    
  const desirableValues = Object.values(desirableChecklist);
  const desirableCompliance = desirableValues.length > 0
    ? Math.round((desirableValues.filter(Boolean).length / desirableValues.length) * 100)
    : 0;

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
            <h1 className="text-3xl font-bold tracking-tight">Inspection Report Review</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve inspection findings
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20">
          Under Review
        </Badge>
      </div>

      {/* Quick Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Application</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{application.applicationNumber}</div>
            <p className="text-xs text-muted-foreground mt-1">{application.propertyName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">{getCategoryBadge(report.recommendedCategory || application.category)}</div>
            {report.categoryMeetsStandards ? (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Meets standards</p>
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">✗ Does not meet standards</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mandatory Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{mandatoryCompliance}%</div>
            <p className="text-xs text-muted-foreground mt-1">{mandatoryValues.filter(Boolean).length} of {mandatoryValues.length} met</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desirable Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{desirableCompliance}%</div>
            <p className="text-xs text-muted-foreground mt-1">{desirableValues.filter(Boolean).length} of {desirableValues.length} met</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Application & Owner Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Property Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{owner?.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile</p>
                <p className="font-medium">{owner?.mobile}</p>
              </div>
              {owner?.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{owner.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HomeIcon className="h-5 w-5" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Property Name</p>
                <p className="font-medium">{application.propertyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">District</p>
                <p className="font-medium">{application.district}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rooms</p>
                <p className="font-medium">
                  Declared: {application.totalRooms || 'N/A'} | 
                  Verified: {report.actualRoomCount || 'N/A'}
                  {report.roomCountVerified ? (
                    <CheckCircle className="inline ml-2 h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="inline ml-2 h-4 w-4 text-red-600" />
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Inspection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Inspected By</p>
                <p className="font-medium">{da?.fullName || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{da?.mobile}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inspection Date</p>
                <p className="font-medium">
                  {report.actualInspectionDate ? format(new Date(report.actualInspectionDate), 'PPP') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Report Submitted</p>
                <p className="font-medium">
                  {format(new Date(report.submittedDate), 'PPP')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Inspection Findings */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Findings</CardTitle>
              <CardDescription>
                ANNEXURE-III Compliance Checklist (HP Homestay Rules 2025)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="mandatory">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mandatory" data-testid="tab-mandatory">
                    Section A: Mandatory
                    <Badge variant="secondary" className="ml-auto">{mandatoryCompliance}%</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="desirable" data-testid="tab-desirable">
                    Section B: Desirable
                    <Badge variant="secondary" className="ml-auto">{desirableCompliance}%</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mandatory" className="space-y-4 mt-6">
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      <Shield className="w-4 h-4 inline mr-2" />
                      All 18 mandatory requirements must be met for approval
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(mandatoryChecklist).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 rounded border">
                        {value ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    ))}
                  </div>

                  {report.mandatoryRemarks && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">DA Remarks:</p>
                      <p className="text-sm text-muted-foreground">{report.mandatoryRemarks}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="desirable" className="space-y-4 mt-6">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      <Star className="w-4 h-4 inline mr-2" />
                      Desirable requirements enhance guest experience and property rating
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(desirableChecklist).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 rounded border">
                        {value ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    ))}
                  </div>

                  {report.desirableRemarks && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">DA Remarks:</p>
                      <p className="text-sm text-muted-foreground">{report.desirableRemarks}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* DA's Overall Assessment */}
          {report.detailedFindings && (
            <Card>
              <CardHeader>
                <CardTitle>DA's Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{report.detailedFindings}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-medium">Recommendation:</span>
                  <Badge>{report.recommendation}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DTDO Decision Actions */}
          <Card>
            <CardHeader>
              <CardTitle>DTDO Decision</CardTitle>
              <CardDescription>
                Make your final decision on this inspection report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => handleAction('approve')}
                  data-testid="button-approve"
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAction('objections')}
                  data-testid="button-objections"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Raise Objections
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAction('reject')}
                  data-testid="button-reject"
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent data-testid="dialog-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Inspection Report'}
              {actionType === 'reject' && 'Reject Application'}
              {actionType === 'objections' && 'Raise Objections'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'The application will proceed to payment verification.'}
              {actionType === 'reject' && 'The application will be permanently rejected.'}
              {actionType === 'objections' && 'The application will require re-inspection after issues are addressed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">
                {actionType === 'approve' ? 'Remarks (Optional)' : 'Remarks (Required)'}
              </Label>
              <Textarea
                id="remarks"
                placeholder={
                  actionType === 'approve'
                    ? 'Add any additional notes...'
                    : actionType === 'reject'
                    ? 'Specify the reason for rejection...'
                    : 'Specify the issues that need to be addressed...'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                data-testid="textarea-remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionType(null)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionMutation.isPending}
              data-testid="button-confirm"
            >
              {actionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
