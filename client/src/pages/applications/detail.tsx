import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Building2, User, MapPin, Phone, Mail, Bed, IndianRupee, Calendar, FileText, ArrowLeftCircle, ClipboardCheck, CalendarClock, FileImage, Download, Images, Award, CreditCard } from "lucide-react";
import type { HomestayApplication, User as UserType, Document } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ImageGallery } from "@/components/ImageGallery";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateCertificatePDF } from "@/lib/certificateGenerator";

export default function ApplicationDetail() {
  const [, params] = useRoute("/applications/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [officerComments, setOfficerComments] = useState("");
  
  // New officer action states
  const [sendBackFeedback, setSendBackFeedback] = useState("");
  const [sendBackIssues, setSendBackIssues] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  
  // Inspection completion states
  const [inspectionOutcome, setInspectionOutcome] = useState<'approved' | 'corrections_needed' | 'rejected'>('approved');
  const [roomCountVerified, setRoomCountVerified] = useState(false);
  const [roomCountActual, setRoomCountActual] = useState("");
  const [amenitiesVerified, setAmenitiesVerified] = useState(false);
  const [amenitiesIssues, setAmenitiesIssues] = useState("");
  const [fireSafetyVerified, setFireSafetyVerified] = useState(false);
  const [fireSafetyIssues, setFireSafetyIssues] = useState("");
  const [categoryRecommendation, setCategoryRecommendation] = useState("");
  const [issuesFound, setIssuesFound] = useState("");
  const [inspectionCompletionNotes, setInspectionCompletionNotes] = useState("");
  
  // Image gallery state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const applicationId = params?.id;

  const { data: userData } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: applicationData, isLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", applicationId],
    enabled: !!applicationId,
  });

  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery<{ documents: Document[] }>({
    queryKey: ['/api/applications', applicationId, 'documents'],
    enabled: !!applicationId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ action, comments }: { action: "approve" | "reject"; comments: string }) => {
      const response = await apiRequest("POST", `/api/applications/${applicationId}/review`, {
        action,
        comments,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: variables.action === "approve" ? "Application Approved" : "Application Rejected",
        description: `The application has been ${variables.action}d successfully.`,
      });
      setOfficerComments("");
    },
    onError: () => {
      toast({
        title: "Review failed",
        description: "Failed to process review. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send Back Mutation
  const sendBackMutation = useMutation({
    mutationFn: async ({ feedback, issuesFound }: { feedback: string; issuesFound: string }) => {
      const response = await apiRequest("POST", `/api/applications/${applicationId}/send-back`, {
        feedback,
        issuesFound,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application Sent Back",
        description: "The application has been sent back to the applicant for corrections.",
      });
      setSendBackFeedback("");
      setSendBackIssues("");
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Failed to send back application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Move to Inspection Mutation
  const moveToInspectionMutation = useMutation({
    mutationFn: async ({ scheduledDate, notes }: { scheduledDate: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/applications/${applicationId}/move-to-inspection`, {
        scheduledDate,
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Inspection Scheduled",
        description: "The site inspection has been scheduled successfully.",
      });
      setInspectionDate("");
      setInspectionNotes("");
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Failed to schedule inspection. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete Inspection Mutation
  const completeInspectionMutation = useMutation({
    mutationFn: async () => {
      const findings = {
        roomCountVerified,
        roomCountActual: roomCountActual ? parseInt(roomCountActual) : undefined,
        amenitiesVerified,
        amenitiesIssues,
        fireSafetyVerified,
        fireSafetyIssues,
        categoryRecommendation,
        overallSatisfactory: inspectionOutcome === 'approved',
        issuesFound,
      };
      
      const response = await apiRequest("POST", `/api/applications/${applicationId}/complete-inspection`, {
        outcome: inspectionOutcome,
        findings,
        notes: inspectionCompletionNotes,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      
      const outcomeMessages = {
        approved: "Application approved and moved to payment pending",
        corrections_needed: "Application sent back for corrections",
        rejected: "Application rejected"
      };
      
      toast({
        title: "Inspection Completed",
        description: outcomeMessages[inspectionOutcome],
      });
      
      // Reset form
      setInspectionOutcome('approved');
      setRoomCountVerified(false);
      setRoomCountActual("");
      setAmenitiesVerified(false);
      setAmenitiesIssues("");
      setFireSafetyVerified(false);
      setFireSafetyIssues("");
      setCategoryRecommendation("");
      setIssuesFound("");
      setInspectionCompletionNotes("");
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Failed to complete inspection. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!applicationData?.application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Application Not Found</CardTitle>
            <CardDescription>The application you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const app = applicationData.application;
  const user = userData?.user;
  const isDistrictOfficer = user?.role === "district_officer";
  const isStateOfficer = user?.role === "state_officer";
  
  // District officers can review pending applications
  // State officers can review applications in state_review status
  const canReview = (isDistrictOfficer && app.status === "pending") || 
                    (isStateOfficer && app.status === "state_review");

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: "Draft", variant: "outline" as const },
      pending: { label: "District Review", variant: "secondary" as const },
      state_review: { label: "State Review", variant: "secondary" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
    };
    return config[status as keyof typeof config] || config.draft;
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      diamond: { label: "Diamond", variant: "default" as const },
      gold: { label: "Gold", variant: "secondary" as const },
      silver: { label: "Silver", variant: "outline" as const },
    };
    return config[category as keyof typeof config];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge {...getStatusBadge(app.status || 'draft')} data-testid="badge-status">
              {getStatusBadge(app.status || 'draft').label}
            </Badge>
            <Badge {...getCategoryBadge(app.category || 'silver')} data-testid="badge-category">
              {getCategoryBadge(app.category || 'silver').label}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle>Property Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Property Name</Label>
                  <p className="text-lg font-medium" data-testid="text-property-name">{app.propertyName}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p data-testid="text-address">{app.address}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">District</Label>
                    <p className="flex items-center gap-2" data-testid="text-district">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {app.district}
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">PIN Code</Label>
                    <p data-testid="text-pincode">{app.pincode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Rooms</Label>
                    <p className="flex items-center gap-2" data-testid="text-rooms">
                      <Bed className="w-4 h-4 text-muted-foreground" />
                      {app.totalRooms} rooms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registration Certificate - Show when approved */}
            {app.status === 'approved' && app.certificateNumber && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-green-800">Registration Certificate Issued</CardTitle>
                  </div>
                  <CardDescription>
                    Your homestay is officially registered with HP Tourism
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <Label className="text-muted-foreground text-xs">Certificate Number</Label>
                      <p className="text-lg font-bold text-green-700" data-testid="text-certificate-number">
                        {app.certificateNumber}
                      </p>
                    </div>
                    {app.certificateIssuedDate && (
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <Label className="text-muted-foreground text-xs">Issue Date</Label>
                        <p className="text-lg font-semibold text-green-700" data-testid="text-certificate-date">
                          {new Date(app.certificateIssuedDate).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  {app.certificateExpiryDate && (
                    <div className="bg-white p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-muted-foreground text-xs">Valid Until</Label>
                          <p className="font-medium text-green-700">
                            {new Date(app.certificateExpiryDate).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700" 
                      onClick={() => generateCertificatePDF(app)}
                      data-testid="button-download-certificate"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Certificate (PDF)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Pending - Show when payment is pending (property owners only) */}
            {app.status === 'payment_pending' && userData?.user?.role === 'property_owner' && (
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <CardTitle className="text-primary">Payment Required</CardTitle>
                  </div>
                  <CardDescription>
                    Complete payment to receive your registration certificate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Total Registration Fee</span>
                        <span className="text-2xl font-bold text-primary">₹{parseFloat(app.totalFee).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => setLocation(`/applications/${app.id}/payment-himkosh`)}
                      data-testid="button-proceed-payment"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed to HimKosh Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Status - Show for officers when payment is pending */}
            {app.status === 'payment_pending' && userData?.user?.role !== 'property_owner' && (
              <Card className="border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <CardTitle className="text-primary">Payment Pending</CardTitle>
                  </div>
                  <CardDescription>
                    Awaiting payment from property owner
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Total Registration Fee</span>
                      <span className="text-2xl font-bold text-primary">₹{parseFloat(app.totalFee).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      The property owner needs to complete payment before certificate can be issued.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>Owner Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p data-testid="text-owner-name">{app.ownerName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mobile Number</Label>
                    <p className="flex items-center gap-2" data-testid="text-owner-mobile">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {app.ownerMobile}
                    </p>
                  </div>
                </div>
                {app.ownerEmail && (
                  <div>
                    <Label className="text-muted-foreground">Email Address</Label>
                    <p className="flex items-center gap-2" data-testid="text-owner-email">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {app.ownerEmail}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Aadhaar Number</Label>
                  <p data-testid="text-owner-aadhaar">{app.ownerAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {app.amenities && typeof app.amenities === 'object' && Object.keys(app.amenities).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities & Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(app.amenities)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Uploaded Documents */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-primary" />
                  <CardTitle>Uploaded Documents</CardTitle>
                </div>
                <CardDescription>
                  {isLoadingDocuments 
                    ? "Loading documents..."
                    : documentsData?.documents && documentsData.documents.length > 0 
                    ? `${documentsData.documents.length} document(s) uploaded`
                    : "No documents uploaded yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDocuments ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm">Loading documents...</p>
                  </div>
                ) : !app.ownershipProofUrl && !app.aadhaarCardUrl && !app.propertyPhotosUrls?.length && (!documentsData?.documents || documentsData.documents.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileImage className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No documents uploaded yet</p>
                    <p className="text-xs mt-1">Documents will appear here once the applicant uploads them</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Property Photos Gallery */}
                    {(() => {
                      const propertyPhotos = documentsData?.documents?.filter(
                        doc => doc.documentType === 'property_photo' && doc.mimeType.startsWith('image/')
                      ) || [];
                      
                      if (propertyPhotos.length > 0) {
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Images className="w-5 h-5 text-primary" />
                                <p className="text-sm font-medium">Property Photos ({propertyPhotos.length})</p>
                              </div>
                              <Button
                                data-testid="button-view-gallery"
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setGalleryInitialIndex(0);
                                  setIsGalleryOpen(true);
                                }}
                              >
                                <Images className="w-4 h-4 mr-2" />
                                View Gallery
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                              {propertyPhotos.map((photo, index) => (
                                <div
                                  key={photo.id}
                                  className="aspect-square border rounded-md overflow-hidden cursor-pointer hover-elevate active-elevate-2"
                                  onClick={() => {
                                    setGalleryInitialIndex(index);
                                    setIsGalleryOpen(true);
                                  }}
                                  data-testid={`thumbnail-property-${index}`}
                                >
                                  <img
                                    src={`/api/object-storage/view?path=${encodeURIComponent(photo.filePath)}`}
                                    alt={photo.fileName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Other Documents */}
                    {(() => {
                      const otherDocs = documentsData?.documents?.filter(
                        doc => doc.documentType !== 'property_photo'
                      ) || [];
                      
                      if (otherDocs.length > 0) {
                        return (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Supporting Documents</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {otherDocs.map((doc) => (
                                <div key={doc.id} className="flex flex-col p-3 border rounded-md hover-elevate">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-primary/10 rounded flex-shrink-0">
                                      {doc.mimeType.startsWith('image/') ? (
                                        <FileImage className="w-5 h-5 text-primary" />
                                      ) : (
                                        <FileText className="w-5 h-5 text-primary" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{doc.fileName}</p>
                                      <p className="text-xs text-muted-foreground capitalize">{doc.documentType.replace(/_/g, ' ')}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-auto pt-2 border-t">
                                    <span className="text-xs text-muted-foreground">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(`/api/object-storage/view?path=${encodeURIComponent(doc.filePath)}`, '_blank')}
                                      data-testid={`button-view-document-${doc.id}`}
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* Ownership Proof */}
                    {app.ownershipProofUrl && (
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Property Ownership Proof</p>
                            <p className="text-xs text-muted-foreground">Sale deed / Mutation certificate</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(app.ownershipProofUrl!, '_blank')}
                          data-testid="button-view-ownership"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    )}

                    {/* Aadhaar Card */}
                    {app.aadhaarCardUrl && (
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Aadhaar Card</p>
                            <p className="text-xs text-muted-foreground">Owner identification</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(app.aadhaarCardUrl!, '_blank')}
                          data-testid="button-view-aadhaar"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    )}

                    {/* PAN Card */}
                    {app.panCardUrl && (
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">PAN Card</p>
                            <p className="text-xs text-muted-foreground">Tax identification</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(app.panCardUrl!, '_blank')}
                          data-testid="button-view-pan"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    )}

                    {/* GST Certificate */}
                    {app.gstCertificateUrl && (
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">GST Certificate</p>
                            <p className="text-xs text-muted-foreground">Business registration</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(app.gstCertificateUrl!, '_blank')}
                          data-testid="button-view-gst"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    )}

                    {/* Property Photos */}
                    {app.propertyPhotosUrls && app.propertyPhotosUrls.length > 0 && (
                      <div className="border rounded-md p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <FileImage className="w-5 h-5 text-primary" />
                          <p className="font-medium text-sm">Property Photos ({app.propertyPhotosUrls.length})</p>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {app.propertyPhotosUrls.map((url, index) => (
                            <div 
                              key={index} 
                              className="aspect-square border rounded overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(url, '_blank')}
                              data-testid={`image-property-${index}`}
                            >
                              <img 
                                src={url} 
                                alt={`Property photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Officer Review Section */}
            {canReview && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Application</CardTitle>
                  <CardDescription>
                    {isDistrictOfficer 
                      ? "As a District Officer, you can approve (forwards to State review) or reject this application"
                      : "As a State Officer, you can grant final approval or reject this application"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="comments">Officer Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Add your review comments here..."
                      value={officerComments}
                      onChange={(e) => setOfficerComments(e.target.value)}
                      className="mt-2"
                      rows={4}
                      data-testid="input-officer-comments"
                    />
                  </div>
                  <div className="flex gap-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          className="flex-1"
                          disabled={reviewMutation.isPending}
                          data-testid="button-approve-trigger"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve Application
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isDistrictOfficer ? (
                              <>This will approve the homestay application for <strong>{app.propertyName}</strong> and forward it to State Tourism for final review.</>
                            ) : (
                              <>This will grant final approval to <strong>{app.propertyName}</strong>. The property will be listed on the public portal.</>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-approve">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => reviewMutation.mutate({ action: "approve", comments: officerComments })}
                            data-testid="button-confirm-approve"
                          >
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={reviewMutation.isPending}
                          data-testid="button-reject-trigger"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Application
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reject the homestay application for <strong>{app.propertyName}</strong>. 
                            Please ensure you've added comments explaining the rejection.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-reject">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => reviewMutation.mutate({ action: "reject", comments: officerComments })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-reject"
                          >
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New Officer Workflow Actions */}
            {(isDistrictOfficer || isStateOfficer) && (
              <Card>
                <CardHeader>
                  <CardTitle>Officer Actions</CardTitle>
                  <CardDescription>
                    Available actions for this application (Status: {app.status?.replace(/_/g, ' ')})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Send Back for Corrections */}
                  {(app.status === 'submitted' || app.status === 'document_verification') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" data-testid="button-send-back">
                          <ArrowLeftCircle className="w-4 h-4 mr-2" />
                          Send Back for Corrections
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send Application Back</DialogTitle>
                          <DialogDescription>
                            Return this application to the applicant for corrections or additional information.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="feedback">Feedback to Applicant</Label>
                            <Textarea
                              id="feedback"
                              placeholder="Explain what needs to be corrected..."
                              value={sendBackFeedback}
                              onChange={(e) => setSendBackFeedback(e.target.value)}
                              rows={4}
                              data-testid="input-sendback-feedback"
                            />
                          </div>
                          <div>
                            <Label htmlFor="issues">Issues Found</Label>
                            <Textarea
                              id="issues"
                              placeholder="List specific issues that need to be addressed..."
                              value={sendBackIssues}
                              onChange={(e) => setSendBackIssues(e.target.value)}
                              rows={3}
                              data-testid="input-sendback-issues"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => sendBackMutation.mutate({ feedback: sendBackFeedback, issuesFound: sendBackIssues })}
                            disabled={sendBackMutation.isPending || !sendBackFeedback || sendBackFeedback.length < 10}
                            data-testid="button-confirm-sendback"
                          >
                            Send Back
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Schedule Site Inspection */}
                  {(app.status === 'document_verification' || app.status === 'submitted') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" data-testid="button-schedule-inspection">
                          <CalendarClock className="w-4 h-4 mr-2" />
                          Schedule Site Inspection
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Schedule Site Inspection</DialogTitle>
                          <DialogDescription>
                            Set a date for the on-site inspection of this property.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="inspectionDate">Inspection Date</Label>
                            <Input
                              id="inspectionDate"
                              type="date"
                              value={inspectionDate}
                              onChange={(e) => setInspectionDate(e.target.value)}
                              data-testid="input-inspection-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="inspectionNotes">Notes</Label>
                            <Textarea
                              id="inspectionNotes"
                              placeholder="Add any special instructions or notes about the inspection..."
                              value={inspectionNotes}
                              onChange={(e) => setInspectionNotes(e.target.value)}
                              rows={3}
                              data-testid="input-inspection-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => moveToInspectionMutation.mutate({ scheduledDate: inspectionDate, notes: inspectionNotes })}
                            disabled={moveToInspectionMutation.isPending || !inspectionDate}
                            data-testid="button-confirm-schedule-inspection"
                          >
                            Schedule Inspection
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Complete Inspection */}
                  {app.status === 'site_inspection_scheduled' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" data-testid="button-complete-inspection">
                          <ClipboardCheck className="w-4 h-4 mr-2" />
                          Complete Inspection
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Complete Site Inspection</DialogTitle>
                          <DialogDescription>
                            Record your findings from the site inspection and choose an outcome
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Inspection Checklist */}
                          <div className="space-y-4">
                            <Label className="text-base font-semibold">Inspection Checklist</Label>
                            
                            {/* Room Count Verification */}
                            <div className="space-y-2 p-3 border rounded-md">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="roomCountVerified"
                                  checked={roomCountVerified}
                                  onCheckedChange={(checked) => setRoomCountVerified(!!checked)}
                                  data-testid="checkbox-room-count"
                                />
                                <Label htmlFor="roomCountVerified" className="font-medium cursor-pointer">
                                  Room count verified (Declared: {app.totalRooms})
                                </Label>
                              </div>
                              <Input
                                placeholder="Actual room count (if different)"
                                value={roomCountActual}
                                onChange={(e) => setRoomCountActual(e.target.value)}
                                type="number"
                                data-testid="input-room-count-actual"
                              />
                            </div>
                            
                            {/* Amenities Verification */}
                            <div className="space-y-2 p-3 border rounded-md">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="amenitiesVerified"
                                  checked={amenitiesVerified}
                                  onCheckedChange={(checked) => setAmenitiesVerified(!!checked)}
                                  data-testid="checkbox-amenities"
                                />
                                <Label htmlFor="amenitiesVerified" className="font-medium cursor-pointer">
                                  Amenities verified (as per {app.category} category)
                                </Label>
                              </div>
                              <Textarea
                                placeholder="Issues with amenities (if any)..."
                                value={amenitiesIssues}
                                onChange={(e) => setAmenitiesIssues(e.target.value)}
                                rows={2}
                                data-testid="input-amenities-issues"
                              />
                            </div>
                            
                            {/* Fire Safety Verification */}
                            <div className="space-y-2 p-3 border rounded-md">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="fireSafetyVerified"
                                  checked={fireSafetyVerified}
                                  onCheckedChange={(checked) => setFireSafetyVerified(!!checked)}
                                  data-testid="checkbox-fire-safety"
                                />
                                <Label htmlFor="fireSafetyVerified" className="font-medium cursor-pointer">
                                  Fire safety measures verified
                                </Label>
                              </div>
                              <Textarea
                                placeholder="Fire safety issues (if any)..."
                                value={fireSafetyIssues}
                                onChange={(e) => setFireSafetyIssues(e.target.value)}
                                rows={2}
                                data-testid="input-fire-safety-issues"
                              />
                            </div>
                          </div>
                          
                          {/* Category Recommendation */}
                          <div className="space-y-2">
                            <Label htmlFor="categoryRec">Category Recommendation (Optional)</Label>
                            <Input
                              id="categoryRec"
                              placeholder="Recommend different category if needed"
                              value={categoryRecommendation}
                              onChange={(e) => setCategoryRecommendation(e.target.value)}
                              data-testid="input-category-recommendation"
                            />
                          </div>
                          
                          {/* Inspection Outcome */}
                          <div className="space-y-3">
                            <Label className="text-base font-semibold">Inspection Outcome</Label>
                            <RadioGroup value={inspectionOutcome} onValueChange={(value: any) => setInspectionOutcome(value)}>
                              <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate cursor-pointer">
                                <RadioGroupItem value="approved" id="outcome-approved" data-testid="radio-approved" />
                                <Label htmlFor="outcome-approved" className="flex-1 cursor-pointer">
                                  <span className="font-medium text-green-600">Approve</span>
                                  <p className="text-sm text-muted-foreground">Site inspection successful, move to payment</p>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate cursor-pointer">
                                <RadioGroupItem value="corrections_needed" id="outcome-corrections" data-testid="radio-corrections" />
                                <Label htmlFor="outcome-corrections" className="flex-1 cursor-pointer">
                                  <span className="font-medium text-orange-600">Send Back for Corrections</span>
                                  <p className="text-sm text-muted-foreground">Issues found, applicant needs to fix them</p>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate cursor-pointer">
                                <RadioGroupItem value="rejected" id="outcome-rejected" data-testid="radio-rejected" />
                                <Label htmlFor="outcome-rejected" className="flex-1 cursor-pointer">
                                  <span className="font-medium text-destructive">Reject</span>
                                  <p className="text-sm text-muted-foreground">Property does not meet requirements</p>
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          {/* Issues Found (required for corrections/rejection) */}
                          {(inspectionOutcome === 'corrections_needed' || inspectionOutcome === 'rejected') && (
                            <div className="space-y-2">
                              <Label htmlFor="issuesFound" className="text-destructive">Issues Found *</Label>
                              <Textarea
                                id="issuesFound"
                                placeholder="Describe the issues that need to be addressed..."
                                value={issuesFound}
                                onChange={(e) => setIssuesFound(e.target.value)}
                                rows={4}
                                data-testid="input-issues-found"
                                className="border-destructive"
                              />
                            </div>
                          )}
                          
                          {/* Additional Notes */}
                          <div className="space-y-2">
                            <Label htmlFor="completionNotes">Additional Notes</Label>
                            <Textarea
                              id="completionNotes"
                              placeholder="Any additional observations or recommendations..."
                              value={inspectionCompletionNotes}
                              onChange={(e) => setInspectionCompletionNotes(e.target.value)}
                              rows={3}
                              data-testid="input-inspection-completion-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => completeInspectionMutation.mutate()}
                            disabled={completeInspectionMutation.isPending || 
                              ((inspectionOutcome === 'corrections_needed' || inspectionOutcome === 'rejected') && !issuesFound)}
                            data-testid="button-confirm-complete-inspection"
                          >
                            {completeInspectionMutation.isPending ? "Processing..." : "Submit Inspection Results"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Info message if no actions available */}
                  {app.status !== 'submitted' && 
                   app.status !== 'document_verification' && 
                   app.status !== 'site_inspection_scheduled' && (
                    <div className="text-sm text-muted-foreground p-4 border rounded-md">
                      No workflow actions available for current status. Use the Review section above to approve or reject.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Fee Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  <CardTitle>Fee Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Fee</span>
                  <span data-testid="text-base-fee">₹{Number(app.baseFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per Room Fee ({app.totalRooms} rooms)</span>
                  <span data-testid="text-room-fee">₹{(Number(app.perRoomFee) * app.totalRooms).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span data-testid="text-gst">₹{Number(app.gstAmount).toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t flex justify-between font-semibold">
                  <span>Total Fee</span>
                  <span className="text-primary" data-testid="text-total">₹{Number(app.totalFee).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle>Timeline</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Submitted</Label>
                  <p className="text-sm" data-testid="text-submitted-date">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
                {app.updatedAt && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Last Updated</Label>
                    <p className="text-sm" data-testid="text-updated-date">
                      {new Date(app.updatedAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(app.districtNotes || app.stateNotes) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle>Officer Comments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {app.districtNotes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">District Officer</Label>
                      <p className="text-sm" data-testid="text-district-notes">{app.districtNotes}</p>
                    </div>
                  )}
                  {app.stateNotes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">State Officer</Label>
                      <p className="text-sm" data-testid="text-state-notes">{app.stateNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Image Gallery Modal */}
      {(() => {
        const propertyPhotos = documentsData?.documents?.filter(
          doc => doc.documentType === 'property_photo' && doc.mimeType.startsWith('image/')
        ) || [];
        
        return (
          <ImageGallery
            images={propertyPhotos.map(photo => ({
              filePath: photo.filePath,
              fileName: photo.fileName
            }))}
            open={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            initialIndex={galleryInitialIndex}
          />
        );
      })()}
    </div>
  );
}
