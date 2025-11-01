import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  Save,
  Eye,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { HomestayApplication, Document } from "@shared/schema";

interface ApplicationData {
  application: HomestayApplication;
  owner: {
    fullName: string;
    mobile: string;
    email: string | null;
  } | null;
  documents: Document[];
}

interface DocumentVerification {
  documentId: string;
  status: 'pending' | 'verified' | 'rejected' | 'needs_correction';
  notes: string;
}

export default function DAApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  if (!id) {
    setLocation("/da/dashboard");
    return null;
  }
  
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Document verification state
  const [verifications, setVerifications] = useState<Record<string, DocumentVerification>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery<ApplicationData>({
    queryKey: ["/api/da/applications", id],
  });

  // Start Scrutiny Mutation
  const startScrutinyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/start-scrutiny`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
      toast({
        title: "Scrutiny Started",
        description: "Application is now under your review",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start scrutiny",
        variant: "destructive",
      });
    },
  });

  // Save Scrutiny Progress Mutation
  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/save-scrutiny`, {
        verifications: Object.values(verifications),
      });
    },
    onSuccess: () => {
      toast({
        title: "Progress Saved",
        description: "Your verification progress has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    },
  });

  // Forward to DTDO Mutation
  const forwardMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/forward-to-dtdo`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
      setForwardDialogOpen(false);
      setRemarks("");
      toast({
        title: "Application Forwarded",
        description: "Application has been sent to DTDO successfully",
      });
      setLocation("/da/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to forward application",
        variant: "destructive",
      });
    },
  });

  // Send Back Mutation
  const sendBackMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/send-back`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
      setSendBackDialogOpen(false);
      setReason("");
      toast({
        title: "Application Sent Back",
        description: "Application has been returned to the applicant",
      });
      setLocation("/da/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send back application",
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">Application not found</p>
        </div>
      </div>
    );
  }

  const { application, owner, documents } = data;

  // Initialize verification states for documents (in useEffect to avoid render-time state updates)
  // Re-hydrate whenever documents change to ensure synchronization
  useEffect(() => {
    if (documents.length > 0) {
      const initialVerifications: Record<string, DocumentVerification> = {};
      documents.forEach(doc => {
        initialVerifications[doc.id] = {
          documentId: doc.id,
          status: doc.verificationStatus as any || 'pending',
          notes: doc.verificationNotes || '',
        };
      });
      setVerifications(initialVerifications);
    }
  }, [documents]);

  // Calculate verification progress - count any non-pending status as complete (verified, rejected, needs_correction)
  const totalDocs = documents.length;
  const completedDocs = Object.values(verifications).filter(v => v.status !== 'pending').length;
  const progress = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

  const updateVerification = (docId: string, updates: Partial<DocumentVerification>) => {
    setVerifications(prev => ({
      ...prev,
      [docId]: { ...prev[docId], ...updates }
    }));
  };

  const toggleNotes = (docId: string) => {
    setExpandedNotes(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'needs_correction':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Needs Correction</Badge>;
      default:
        return <Badge variant="outline">Pending Review</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 dark:text-green-400';
      case 'rejected': return 'text-red-600 dark:text-red-400';
      case 'needs_correction': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-[1600px]">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/da/dashboard")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{application.propertyName}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Application #{application.applicationNumber}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{owner?.fullName} • {owner?.mobile}</span>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline">{application.category.toUpperCase()}</Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {application.status === 'submitted' && (
              <Button
                onClick={() => startScrutinyMutation.mutate()}
                disabled={startScrutinyMutation.isPending}
                data-testid="button-start-scrutiny"
              >
                {startScrutinyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Start Scrutiny
              </Button>
            )}

            {application.status === 'under_scrutiny' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => saveProgressMutation.mutate()}
                  disabled={saveProgressMutation.isPending}
                  data-testid="button-save-progress"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Progress
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setSendBackDialogOpen(true)}
                  data-testid="button-send-back"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Send Back
                </Button>
                <Button
                  onClick={() => setForwardDialogOpen(true)}
                  data-testid="button-forward"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Forward to DTDO
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {application.status === 'under_scrutiny' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Label>Document Verification Progress</Label>
              <span className="text-sm font-medium">{verifiedDocs} / {totalDocs} documents verified</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="w-4 h-4 mr-2" />
            Document Verification ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="details" data-testid="tab-details">
            Property & Owner Details
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab - Split Screen */}
        <TabsContent value="documents" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Document Preview */}
            <Card className="h-[calc(100vh-320px)]">
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
                <CardDescription>
                  {selectedDocument ? selectedDocument.fileName : "Select a document to preview"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-100px)] overflow-auto">
                {selectedDocument ? (
                  <div className="space-y-4">
                    {/* Document Info */}
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedDocument.documentType}</span>
                        {getStatusBadge(verifications[selectedDocument.id]?.status || 'pending')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Size: {(selectedDocument.fileSize / 1024).toFixed(2)} KB
                      </div>
                    </div>

                    {/* Document Viewer */}
                    <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                      {selectedDocument.mimeType.startsWith('image/') ? (
                        <img
                          src={selectedDocument.filePath}
                          alt={selectedDocument.fileName}
                          className="w-full h-auto"
                        />
                      ) : selectedDocument.mimeType === 'application/pdf' ? (
                        <iframe
                          src={selectedDocument.filePath}
                          className="w-full h-[600px]"
                          title={selectedDocument.fileName}
                        />
                      ) : (
                        <div className="p-8 text-center">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Preview not available for this file type
                          </p>
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedDocument.filePath} download>
                              <Download className="w-4 h-4 mr-2" />
                              Download File
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Eye className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a document from the list to preview</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Side - Document Checklist & Verification */}
            <Card className="h-[calc(100vh-320px)]">
              <CardHeader>
                <CardTitle>Document Checklist</CardTitle>
                <CardDescription>Review and verify each document</CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-100px)] overflow-auto">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc, index) => (
                      <Collapsible
                        key={doc.id}
                        open={expandedNotes[doc.id]}
                        onOpenChange={() => toggleNotes(doc.id)}
                      >
                        <Card className={`border-2 transition-colors ${
                          selectedDocument?.id === doc.id ? 'border-primary' : 'border-border'
                        }`}>
                          <CardHeader className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <Checkbox
                                checked={verifications[doc.id]?.status === 'verified'}
                                onCheckedChange={(checked) => {
                                  updateVerification(doc.id, {
                                    status: checked ? 'verified' : 'pending'
                                  });
                                }}
                                className="mt-1"
                                data-testid={`checkbox-verify-${doc.id}`}
                              />

                              {/* Document Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm mb-1">{doc.documentType}</h4>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {doc.fileName}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedDocument(doc)}
                                    data-testid={`button-view-${doc.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>

                                {/* Status Selection */}
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant={verifications[doc.id]?.status === 'verified' ? 'default' : 'outline'}
                                    className={verifications[doc.id]?.status === 'verified' ? 'bg-green-600' : ''}
                                    onClick={() => updateVerification(doc.id, { status: 'verified' })}
                                    data-testid={`button-verify-${doc.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verify
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={verifications[doc.id]?.status === 'needs_correction' ? 'secondary' : 'outline'}
                                    onClick={() => updateVerification(doc.id, { status: 'needs_correction' })}
                                    data-testid={`button-correction-${doc.id}`}
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Correction
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={verifications[doc.id]?.status === 'rejected' ? 'destructive' : 'outline'}
                                    onClick={() => updateVerification(doc.id, { status: 'rejected' })}
                                    data-testid={`button-reject-${doc.id}`}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Toggle Notes Button */}
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between"
                                data-testid={`button-toggle-notes-${doc.id}`}
                              >
                                <span className="text-xs">Add Notes/Remarks</span>
                                {expandedNotes[doc.id] ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </CardHeader>

                          {/* Expandable Notes Section */}
                          <CollapsibleContent>
                            <CardContent className="pt-0 px-4 pb-4">
                              <Textarea
                                placeholder="Enter your observations, remarks, or required corrections..."
                                value={verifications[doc.id]?.notes || ''}
                                onChange={(e) => updateVerification(doc.id, { notes: e.target.value })}
                                rows={3}
                                className="text-sm"
                                data-testid={`textarea-notes-${doc.id}`}
                              />
                              {verifications[doc.id]?.notes && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => updateVerification(doc.id, { notes: '' })}
                                  data-testid={`button-clear-notes-${doc.id}`}
                                >
                                  Clear Notes
                                </Button>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab - Property & Owner Information */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Property Name" value={application.propertyName} />
                <DetailRow label="Category" value={application.category.toUpperCase()} />
                <DetailRow label="Location Type" value={application.locationType.toUpperCase()} />
                <DetailRow label="Address" value={application.address} />
                <DetailRow label="District" value={application.district} />
                <DetailRow label="Pincode" value={application.pincode} />
                <DetailRow label="Telephone" value={application.telephone || "N/A"} />
              </CardContent>
            </Card>

            {/* Owner Details */}
            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Full Name" value={owner?.fullName || "N/A"} />
                <DetailRow label="Mobile" value={owner?.mobile || "N/A"} />
                <DetailRow label="Email" value={owner?.email || "Not Provided"} />
              </CardContent>
            </Card>

            {/* Room Details */}
            <Card>
              <CardHeader>
                <CardTitle>Room Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Single Bed Rooms" value={application.singleBedRooms?.toString() || "0"} />
                <DetailRow label="Double Bed Rooms" value={application.doubleBedRooms?.toString() || "0"} />
                <DetailRow label="Total Rooms" value={application.totalRooms?.toString() || "0"} />
                <DetailRow label="Proposed Room Rate (₹)" value={application.proposedRoomRate?.toString() || "N/A"} />
                <DetailRow label="GSTIN" value={application.gstin || "Not Provided"} />
              </CardContent>
            </Card>

            {/* Fees */}
            <Card>
              <CardHeader>
                <CardTitle>Fees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Base Fee (₹)" value={application.baseFee?.toString() || "N/A"} />
                <DetailRow label="Per Room Fee (₹)" value={application.perRoomFee?.toString() || "N/A"} />
                <DetailRow label="GST (₹)" value={application.gstAmount?.toString() || "N/A"} />
                <DetailRow label="Total Fee (₹)" value={application.totalFee?.toString() || "N/A"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Forward to DTDO Dialog */}
      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward to DTDO</DialogTitle>
            <DialogDescription>
              Add your overall scrutiny remarks before forwarding this application to the District Tourism Development Officer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">Overall Scrutiny Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Summary of your scrutiny, any observations or recommendations..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                data-testid="textarea-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => forwardMutation.mutate()}
              disabled={forwardMutation.isPending}
              data-testid="button-confirm-forward"
            >
              {forwardMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Forward to DTDO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back to Applicant</DialogTitle>
            <DialogDescription>
              Specify what corrections or additional information is required from the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Sending Back *</Label>
              <Textarea
                id="reason"
                placeholder="Please specify the corrections needed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                data-testid="textarea-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendBackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => sendBackMutation.mutate()}
              disabled={sendBackMutation.isPending || !reason.trim()}
              data-testid="button-confirm-send-back"
            >
              {sendBackMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Back
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
      <span className="font-medium">{value || "N/A"}</span>
    </div>
  );
}
