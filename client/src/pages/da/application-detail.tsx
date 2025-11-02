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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
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
  
  // Parse queue from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const queueParam = searchParams.get('queue');
  const applicationQueue = queueParam ? queueParam.split(',') : [];
  const currentIndex = applicationQueue.indexOf(id || '');
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < applicationQueue.length - 1;
  
  // All state hooks MUST come before any conditional returns
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Document verification state
  const [verifications, setVerifications] = useState<Record<string, DocumentVerification>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  
  // Navigation functions
  const navigateToApplication = (targetId: string) => {
    const queue = applicationQueue.join(',');
    setLocation(`/da/applications/${targetId}?queue=${encodeURIComponent(queue)}`);
  };
  
  const goToPrevious = () => {
    if (hasPrevious) {
      navigateToApplication(applicationQueue[currentIndex - 1]);
    }
  };
  
  const goToNext = () => {
    if (hasNext) {
      navigateToApplication(applicationQueue[currentIndex + 1]);
    }
  };
  
  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'ArrowLeft' && hasPrevious) {
        goToPrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        goToNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasPrevious, hasNext, currentIndex]);

  const { data, isLoading } = useQuery<ApplicationData>({
    queryKey: ["/api/da/applications", id],
    enabled: !!id, // Only run query if id exists
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

  // Initialize verification states for documents (in useEffect to avoid render-time state updates)
  // Re-hydrate whenever documents change to ensure synchronization
  // MUST be before any conditional returns to satisfy Rules of Hooks
  useEffect(() => {
    if (data?.documents && data.documents.length > 0) {
      const initialVerifications: Record<string, DocumentVerification> = {};
      data.documents.forEach(doc => {
        initialVerifications[doc.id] = {
          documentId: doc.id,
          status: doc.verificationStatus as any || 'pending',
          notes: doc.verificationNotes || '',
        };
      });
      setVerifications(initialVerifications);
      
      // Auto-select first document if no document currently selected
      // OR if the selected document's ID doesn't exist in new documents (stale after navigation)
      setSelectedDocument(prevSelected => {
        const documentIds = data.documents.map(d => d.id);
        if (!prevSelected || !documentIds.includes(prevSelected.id)) {
          return data.documents[0];
        }
        return prevSelected;
      });
    } else if (data?.documents && data.documents.length === 0) {
      // Clear state when navigating to application with no documents
      setVerifications({});
      setSelectedDocument(null);
    }
  }, [data?.documents]);

  // Check for missing id AFTER all hooks are called
  if (!id) {
    setLocation("/da/dashboard");
    return null;
  }

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
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-300 dark:border-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-300 dark:border-red-700">
            <XCircle className="w-3 h-3 mr-1" />Rejected
          </span>
        );
      case 'needs_correction':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <AlertCircle className="w-3 h-3 mr-1" />Needs Correction
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
            Pending Review
          </span>
        );
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

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2">{application.propertyName}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span>Application #{application.applicationNumber}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{owner?.fullName} • {owner?.mobile}</span>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline">{application.category?.toUpperCase() ?? 'SILVER'}</Badge>
              {applicationQueue.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-xs font-medium">
                    {currentIndex + 1} of {applicationQueue.length}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Navigation Controls */}
          {applicationQueue.length > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={!hasPrevious}
                data-testid="button-previous"
                title="Previous application (←)"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={!hasNext}
                data-testid="button-next"
                title="Next application (→)"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
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
              <span className="text-sm font-medium">{completedDocs} / {totalDocs} documents reviewed</span>
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
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
                <CardDescription>
                  {selectedDocument ? selectedDocument.fileName : "Select a document to preview"}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 min-h-[400px] flex items-center justify-center">
                      {selectedDocument.mimeType.startsWith('image/') ? (
                        <img
                          src={`/api/object-storage/view?path=${encodeURIComponent(selectedDocument.filePath)}`}
                          alt={selectedDocument.fileName}
                          className="w-full h-auto max-h-[600px] object-contain"
                          data-testid="img-document-preview"
                          onError={(e) => {
                            console.error('Image failed to load:', selectedDocument.filePath);
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" fill="gray">Image failed to load</text></svg>';
                          }}
                          onLoad={() => console.log('Image loaded successfully:', selectedDocument.fileName)}
                        />
                      ) : selectedDocument.mimeType === 'application/pdf' ? (
                        <iframe
                          src={`/api/object-storage/view?path=${encodeURIComponent(selectedDocument.filePath)}`}
                          className="w-full h-[600px]"
                          title={selectedDocument.fileName}
                          data-testid="iframe-document-preview"
                        />
                      ) : (
                        <div className="p-8 text-center">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Preview not available for this file type
                          </p>
                          <Button variant="outline" size="sm" asChild data-testid="button-download-document">
                            <a href={`/api/object-storage/view?path=${encodeURIComponent(selectedDocument.filePath)}`} download>
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
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Document Checklist</CardTitle>
                    <CardDescription>Review and verify each document</CardDescription>
                  </div>
                  {documents.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          documents.forEach(doc => {
                            updateVerification(doc.id, { status: 'verified' });
                          });
                          toast({
                            title: "All Verified",
                            description: `${documents.length} documents marked as verified`,
                          });
                        }}
                        data-testid="button-verify-all"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClearAllDialogOpen(true)}
                        data-testid="button-clear-all"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Progress Meter */}
                {documents.length > 0 && (
                  <div className="space-y-2" data-testid="progress-meter">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Overall Progress</span>
                      <span 
                        className={`font-semibold ${
                          progress === 100 
                            ? 'text-green-600 dark:text-green-400' 
                            : progress >= 50 
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                        data-testid="text-progress-percentage"
                      >
                        {completedDocs} of {totalDocs} ({progress}%)
                      </span>
                    </div>
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" data-testid="progress-bar-container">
                      <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-300 ${
                          progress === 100 
                            ? 'bg-green-500' 
                            : progress >= 50 
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${progress}%` }}
                        data-testid="progress-bar-fill"
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
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
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs font-normal shrink-0">
                                        {index + 1} of {documents.length}
                                      </Badge>
                                      <h4 className="font-medium text-sm truncate">{doc.documentType}</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(verifications[doc.id]?.status || 'pending')}
                                    </div>
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
                                <div className="flex flex-wrap gap-2 mt-3">
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateVerification(doc.id, { status: 'pending' })}
                                    disabled={verifications[doc.id]?.status === 'pending'}
                                    data-testid={`button-clear-status-${doc.id}`}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Clear
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
                <DetailRow label="Category" value={application.category?.toUpperCase() || "N/A"} />
                <DetailRow label="Location Type" value={application.locationType?.toUpperCase() || "N/A"} />
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

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Verifications?</DialogTitle>
            <DialogDescription>
              This will reset all {documents.length} documents to pending status and clear all notes. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearAllDialogOpen(false)} data-testid="button-cancel-clear-all">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                documents.forEach(doc => {
                  updateVerification(doc.id, { status: 'pending', notes: '' });
                });
                setClearAllDialogOpen(false);
                toast({
                  title: "All Cleared",
                  description: `${documents.length} documents reset to pending`,
                });
              }}
              data-testid="button-confirm-clear-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear All
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
