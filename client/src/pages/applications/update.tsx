import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, ArrowLeft, Edit, Check, X, FileText, Image as ImageIcon, Download } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ObjectUploader, UploadedFileMetadata } from "@/components/ObjectUploader";

export default function UpdateApplication() {
  const [, params] = useRoute("/applications/:id/update");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const applicationId = params?.id;

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    revenuePapers: UploadedFileMetadata[];
    affidavitSection29: UploadedFileMetadata[];
    undertakingFormC: UploadedFileMetadata[];
    registerForVerification: UploadedFileMetadata[];
    billBook: UploadedFileMetadata[];
  }>({
    revenuePapers: [],
    affidavitSection29: [],
    undertakingFormC: [],
    registerForVerification: [],
    billBook: [],
  });
  const [propertyPhotos, setPropertyPhotos] = useState<UploadedFileMetadata[]>([]);

  const { data, isLoading, error } = useQuery<{ application: HomestayApplication }>({
    queryKey: applicationId ? [`/api/applications/${applicationId}`] : [],
    enabled: !!applicationId,
  });

  const application = data?.application;

  // Load existing documents once when application data loads
  useEffect(() => {
    if (application?.documents && !documentsLoaded) {
      const docs = application.documents as any[];
      const docsByType = {
        revenuePapers: [] as UploadedFileMetadata[],
        affidavitSection29: [] as UploadedFileMetadata[],
        undertakingFormC: [] as UploadedFileMetadata[],
        registerForVerification: [] as UploadedFileMetadata[],
        billBook: [] as UploadedFileMetadata[],
      };
      const photos: UploadedFileMetadata[] = [];
      
      docs.forEach((doc: any) => {
        const file: UploadedFileMetadata = {
          id: doc.id, // PRESERVE existing document ID
          filePath: doc.fileUrl || doc.filePath,
          fileName: doc.fileName,
          fileSize: doc.fileSize || 0,
          mimeType: doc.mimeType || 'application/octet-stream',
        };
        
        switch (doc.documentType) {
          case 'revenue_papers':
            docsByType.revenuePapers.push(file);
            break;
          case 'affidavit_section_29':
            docsByType.affidavitSection29.push(file);
            break;
          case 'undertaking_form_c':
            docsByType.undertakingFormC.push(file);
            break;
          case 'register_for_verification':
            docsByType.registerForVerification.push(file);
            break;
          case 'bill_book':
            docsByType.billBook.push(file);
            break;
          case 'property_photo':
            photos.push(file);
            break;
        }
      });
      
      setUploadedDocuments(docsByType);
      setPropertyPhotos(photos);
      setDocumentsLoaded(true);
    }
  }, [application, documentsLoaded]);

  // Check if user can update this application
  if (application && !['reverted_to_applicant', 'reverted_by_dtdo'].includes(application.status)) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Update Application</AlertTitle>
          <AlertDescription>
            This application cannot be updated in its current status. Only applications that have been sent back for corrections can be updated.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
          className="mt-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update application");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}`] });
      toast({
        title: "Application Updated",
        description: "Your application has been updated and resubmitted successfully.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    },
  });

  const handleResubmit = () => {
    // Prepare document updates - PRESERVE IDs for existing docs, generate for new ones
    const allDocuments = [
      ...uploadedDocuments.revenuePapers.map(f => ({ 
        id: f.id || crypto.randomUUID(), // Preserve existing ID or generate new
        fileName: f.fileName, 
        fileUrl: f.filePath, 
        documentType: 'revenue_papers',
      })),
      ...uploadedDocuments.affidavitSection29.map(f => ({ 
        id: f.id || crypto.randomUUID(),
        fileName: f.fileName, 
        fileUrl: f.filePath, 
        documentType: 'affidavit_section_29',
      })),
      ...uploadedDocuments.undertakingFormC.map(f => ({ 
        id: f.id || crypto.randomUUID(),
        fileName: f.fileName, 
        fileUrl: f.filePath, 
        documentType: 'undertaking_form_c',
      })),
      ...uploadedDocuments.registerForVerification.map(f => ({ 
        id: f.id || crypto.randomUUID(),
        fileName: f.fileName, 
        fileUrl: f.filePath, 
        documentType: 'register_for_verification',
      })),
      ...uploadedDocuments.billBook.map(f => ({ 
        id: f.id || crypto.randomUUID(),
        fileName: f.fileName, 
        fileUrl: f.filePath, 
        documentType: 'bill_book',
      })),
      ...propertyPhotos.map(f => ({ 
        id: f.id || crypto.randomUUID(),
        fileName: f.fileName, 
        fileUrl: f.filePath, 
        documentType: 'property_photo',
      })),
    ];

    updateMutation.mutate({
      status: 'submitted',
      documents: allDocuments.length > 0 ? allDocuments : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load application details.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalDocuments = 
    uploadedDocuments.revenuePapers.length +
    uploadedDocuments.affidavitSection29.length +
    uploadedDocuments.undertakingFormC.length +
    uploadedDocuments.registerForVerification.length +
    uploadedDocuments.billBook.length +
    propertyPhotos.length;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Update Application</h1>
          <p className="text-muted-foreground mt-1">
            Review your application and update the required sections
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Feedback Alerts */}
      {application.clarificationRequested && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Feedback from Dealing Assistant</AlertTitle>
          <AlertDescription>{application.clarificationRequested}</AlertDescription>
        </Alert>
      )}

      {application.dtdoRemarks && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Feedback from DTDO</AlertTitle>
          <AlertDescription>{application.dtdoRemarks}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Property Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Property Information
                </CardTitle>
                <CardDescription>Basic property details</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property Name</label>
                  <p className="text-base font-medium">{application.propertyName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {application.category}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="text-sm">{application.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">District</label>
                  <p className="text-sm">{application.district}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">PIN Code</label>
                  <p className="text-sm">{application.pincode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Rooms</label>
                  <p className="text-sm font-medium">{application.totalRooms} rooms</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle>Owner Information</CardTitle>
              <CardDescription>Property owner details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-base font-medium">{application.ownerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mobile Number</label>
                  <p className="text-sm">{application.ownerMobile}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="text-sm">{application.ownerEmail || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Aadhaar Number</label>
                  <p className="text-sm">{application.ownerAadhaar}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities & Facilities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities & Facilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(application.amenities as any)?.ac && (
                  <Badge variant="outline" className="justify-center">AC</Badge>
                )}
                {(application.amenities as any)?.wifi && (
                  <Badge variant="outline" className="justify-center">WiFi</Badge>
                )}
                {(application.amenities as any)?.tv && (
                  <Badge variant="outline" className="justify-center">TV</Badge>
                )}
                {(application.amenities as any)?.parking && (
                  <Badge variant="outline" className="justify-center">Parking</Badge>
                )}
                {(application.amenities as any)?.restaurant && (
                  <Badge variant="outline" className="justify-center">Restaurant</Badge>
                )}
                {(application.amenities as any)?.hotWater && (
                  <Badge variant="outline" className="justify-center">Hot Water</Badge>
                )}
                {(application.amenities as any)?.laundry && (
                  <Badge variant="outline" className="justify-center">Laundry</Badge>
                )}
                {(application.amenities as any)?.roomService && (
                  <Badge variant="outline" className="justify-center">Room Service</Badge>
                )}
                {(application.amenities as any)?.garden && (
                  <Badge variant="outline" className="justify-center">Garden</Badge>
                )}
                {(application.amenities as any)?.mountainView && (
                  <Badge variant="outline" className="justify-center">Mountain View</Badge>
                )}
                {(application.amenities as any)?.petFriendly && (
                  <Badge variant="outline" className="justify-center">Pet Friendly</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Uploaded Documents
                </CardTitle>
                <CardDescription>{totalDocuments} document(s) uploaded</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSection(editingSection === 'documents' ? null : 'documents')}
                data-testid="button-edit-documents"
              >
                {editingSection === 'documents' ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Documents
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Property Photos */}
              {propertyPhotos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Property Photos ({propertyPhotos.length})
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {propertyPhotos.slice(0, 4).map((photo, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={photo.filePath} 
                          alt={photo.fileName}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            asChild
                          >
                            <a href={photo.filePath} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {propertyPhotos.length > 4 && (
                      <div className="h-24 rounded-lg border bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">+{propertyPhotos.length - 4} more</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Supporting Documents */}
              <div>
                <label className="text-sm font-medium mb-3 block">Supporting Documents</label>
                <div className="grid gap-3">
                  {[
                    { files: uploadedDocuments.revenuePapers, label: 'Revenue Papers' },
                    { files: uploadedDocuments.affidavitSection29, label: 'Affidavit Section 29' },
                    { files: uploadedDocuments.undertakingFormC, label: 'Undertaking Form-C' },
                    { files: uploadedDocuments.registerForVerification, label: 'Register for Verification' },
                    { files: uploadedDocuments.billBook, label: 'Bill Book' },
                  ].map((docType, idx) => (
                    docType.files.length > 0 && (
                      <div key={idx}>
                        {docType.files.map((file, fileIdx) => (
                          <div key={fileIdx} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                <p className="text-xs text-muted-foreground">{docType.label}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={file.filePath} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                View
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Document Update Section */}
              {editingSection === 'documents' && (
                <>
                  <Separator />
                  <div className="space-y-4 pt-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Update Documents</AlertTitle>
                      <AlertDescription>
                        You can replace or add new documents below. Existing documents will remain unless you remove them.
                      </AlertDescription>
                    </Alert>

                    <ObjectUploader
                      label="Upload Property Photos"
                      accept="image/*"
                      maxFiles={5}
                      multiple={true}
                      fileType="property-photos"
                      onUploadComplete={(paths) => setPropertyPhotos(paths)}
                      existingFiles={propertyPhotos}
                    />

                    <ObjectUploader
                      label="Upload Revenue Papers"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={2}
                      multiple={true}
                      fileType="revenue-papers"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, revenuePapers: paths }))}
                      existingFiles={uploadedDocuments.revenuePapers}
                    />

                    <ObjectUploader
                      label="Upload Affidavit Section-29"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="affidavit"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, affidavitSection29: paths }))}
                      existingFiles={uploadedDocuments.affidavitSection29}
                    />

                    <ObjectUploader
                      label="Upload Undertaking Form-C"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="undertaking"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, undertakingFormC: paths }))}
                      existingFiles={uploadedDocuments.undertakingFormC}
                    />

                    <ObjectUploader
                      label="Upload Register for Verification"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="register"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, registerForVerification: paths }))}
                      existingFiles={uploadedDocuments.registerForVerification}
                    />

                    <ObjectUploader
                      label="Upload Bill Book"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="bill-book"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, billBook: paths }))}
                      existingFiles={uploadedDocuments.billBook}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Fee Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Base Fee</span>
                <span className="text-sm font-medium">₹{application.baseFee ? parseFloat(application.baseFee).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">GST (18%)</span>
                <span className="text-sm font-medium">₹{application.gstAmount ? parseFloat(application.gstAmount).toFixed(2) : '0.00'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Total Fee</span>
                <span className="font-semibold text-lg text-primary">₹{application.totalFee ? parseFloat(application.totalFee).toFixed(2) : '0.00'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                <p className="text-sm">{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{application.updatedAt ? new Date(application.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Resubmit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleResubmit}
            disabled={updateMutation.isPending}
            data-testid="button-resubmit"
          >
            {updateMutation.isPending ? (
              <>Resubmitting...</>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Resubmit Application
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Your application will be resubmitted with updated documents
          </p>
        </div>
      </div>
    </div>
  );
}
