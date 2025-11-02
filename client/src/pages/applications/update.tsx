import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { ObjectUploader, UploadedFileMetadata } from "@/components/ObjectUploader";

// Comprehensive update form schema with all application fields
const updateFormSchema = z.object({
  // Property Information
  propertyName: z.string().min(1, "Property name is required"),
  category: z.enum(['diamond', 'gold', 'silver']),
  locationType: z.enum(['mc', 'tcp', 'gp']),
  projectType: z.enum(['new_rooms', 'new_project']),
  propertyArea: z.coerce.number().min(1, "Property area is required"),
  propertyOwnership: z.enum(['owned', 'leased']),
  
  // LGD Address
  district: z.string().min(1, "District is required"),
  tehsil: z.string().min(1, "Tehsil is required"),
  block: z.string().optional().or(z.literal("")),
  gramPanchayat: z.string().optional().or(z.literal("")),
  gramPanchayatOther: z.string().optional().or(z.literal("")),
  urbanBody: z.string().optional().or(z.literal("")),
  urbanBodyOther: z.string().optional().or(z.literal("")),
  ward: z.string().optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  pincode: z.string().min(1, "Pincode is required"),
  telephone: z.string().optional().or(z.literal("")),
  
  // Room Configuration
  singleBedRooms: z.coerce.number().min(0).default(0),
  singleBedRoomSize: z.coerce.number().min(0).optional(),
  singleBedRoomRate: z.coerce.number().min(0).optional(),
  doubleBedRooms: z.coerce.number().min(0).default(0),
  doubleBedRoomSize: z.coerce.number().min(0).optional(),
  doubleBedRoomRate: z.coerce.number().min(0).optional(),
  familySuites: z.coerce.number().min(0).default(0),
  familySuiteSize: z.coerce.number().min(0).optional(),
  familySuiteRate: z.coerce.number().min(0).optional(),
  attachedWashrooms: z.coerce.number().min(0),
  
  // Distances (in km)
  distanceAirport: z.coerce.number().min(0).optional(),
  distanceRailway: z.coerce.number().min(0).optional(),
  distanceCityCenter: z.coerce.number().min(0).optional(),
  distanceShopping: z.coerce.number().min(0).optional(),
  distanceBusStand: z.coerce.number().min(0).optional(),
  
  // Public Areas (in sq ft)
  lobbyArea: z.coerce.number().min(0).optional(),
  diningArea: z.coerce.number().min(0).optional(),
  parkingArea: z.string().optional().or(z.literal("")),
  
  // Additional Facilities
  ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
  differentlyAbledFacilities: z.string().optional().or(z.literal("")),
  fireEquipmentDetails: z.string().optional().or(z.literal("")),
  nearestHospital: z.string().optional().or(z.literal("")),
  
  // Amenities (optional booleans)
  amenitiesAc: z.boolean().optional(),
  amenitiesWifi: z.boolean().optional(),
  amenitiesParking: z.boolean().optional(),
  amenitiesRestaurant: z.boolean().optional(),
  amenitiesHotWater: z.boolean().optional(),
  amenitiesTv: z.boolean().optional(),
  amenitiesLaundry: z.boolean().optional(),
  amenitiesRoomService: z.boolean().optional(),
  amenitiesGarden: z.boolean().optional(),
  amenitiesMountainView: z.boolean().optional(),
  amenitiesPetFriendly: z.boolean().optional(),
  
  // Owner Information
  ownerName: z.string().min(1, "Owner name is required"),
  ownerGender: z.enum(['male', 'female', 'other']),
  ownerMobile: z.string().min(10, "Valid mobile number required"),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  ownerAadhaar: z.string().min(12, "Valid Aadhaar number required"),
  
  // GSTIN & Validity
  gstin: z.string().optional().or(z.literal("")),
  certificateValidityYears: z.coerce.number().min(1).max(3),
}).refine(
  (data) => (data.singleBedRooms + data.doubleBedRooms + data.familySuites) >= 1,
  { message: "At least 1 room required", path: ["singleBedRooms"] }
);

type UpdateFormData = z.infer<typeof updateFormSchema>;

export default function UpdateApplication() {
  const [, params] = useRoute("/applications/:id/update");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const applicationId = params?.id;

  const { data, isLoading, error } = useQuery<{ application: HomestayApplication }>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      propertyName: "",
      category: "silver",
      locationType: "gp",
      projectType: "new_project",
      propertyArea: 0,
      propertyOwnership: "owned",
      district: "",
      tehsil: "",
      block: "",
      gramPanchayat: "",
      urbanBody: "",
      ward: "",
      address: "",
      pincode: "",
      telephone: "",
      singleBedRooms: 0,
      doubleBedRooms: 0,
      familySuites: 0,
      attachedWashrooms: 0,
      ownerName: "",
      ownerGender: "male",
      ownerMobile: "",
      ownerEmail: "",
      ownerAadhaar: "",
      gstin: "",
      certificateValidityYears: 1,
    },
  });

  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedFileMetadata[]>>({
    revenuePapers: [],
    affidavitSection29: [],
    undertakingFormC: [],
    registerForVerification: [],
    billBook: [],
  });
  const [propertyPhotos, setPropertyPhotos] = useState<UploadedFileMetadata[]>([]);

  // Update form and documents when data loads
  useEffect(() => {
    if (data?.application) {
      const app = data.application;
      const amenities = app.amenities as any || {};
      
      // Load existing documents
      if (app.documents && Array.isArray(app.documents)) {
        const docs = app.documents as any[];
        const docsByType: Record<string, UploadedFileMetadata[]> = {
          revenuePapers: [],
          affidavitSection29: [],
          undertakingFormC: [],
          registerForVerification: [],
          billBook: [],
        };
        const photos: UploadedFileMetadata[] = [];
        
        docs.forEach((doc: any) => {
          const file: UploadedFileMetadata = {
            filePath: doc.fileUrl || doc.filePath, // Support both formats
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
      }
      
      form.reset({
        propertyName: app.propertyName,
        category: app.category as "diamond" | "gold" | "silver",
        locationType: (app.locationType as "mc" | "tcp" | "gp") || "gp",
        projectType: (app.projectType as "new_rooms" | "new_project") || "new_project",
        propertyArea: Number(app.propertyArea) || 0,
        propertyOwnership: (app.propertyOwnership as "owned" | "leased") || "owned",
        district: app.district,
        tehsil: app.tehsil || "",
        block: app.block || "",
        gramPanchayat: app.gramPanchayat || "",
        gramPanchayatOther: app.gramPanchayatOther || "",
        urbanBody: app.urbanBody || "",
        urbanBodyOther: app.urbanBodyOther || "",
        ward: app.ward || "",
        address: app.address,
        pincode: app.pincode,
        telephone: app.telephone || "",
        singleBedRooms: app.singleBedRooms || 0,
        singleBedRoomSize: Number(app.singleBedRoomSize) || undefined,
        singleBedRoomRate: Number(app.singleBedRoomRate) || undefined,
        doubleBedRooms: app.doubleBedRooms || 0,
        doubleBedRoomSize: Number(app.doubleBedRoomSize) || undefined,
        doubleBedRoomRate: Number(app.doubleBedRoomRate) || undefined,
        familySuites: app.familySuites || 0,
        familySuiteSize: Number(app.familySuiteSize) || undefined,
        familySuiteRate: Number(app.familySuiteRate) || undefined,
        attachedWashrooms: app.attachedWashrooms || 0,
        distanceAirport: Number(app.distanceAirport) || undefined,
        distanceRailway: Number(app.distanceRailway) || undefined,
        distanceCityCenter: Number(app.distanceCityCenter) || undefined,
        distanceShopping: Number(app.distanceShopping) || undefined,
        distanceBusStand: Number(app.distanceBusStand) || undefined,
        lobbyArea: Number(app.lobbyArea) || undefined,
        diningArea: Number(app.diningArea) || undefined,
        parkingArea: app.parkingArea || "",
        ecoFriendlyFacilities: app.ecoFriendlyFacilities || "",
        differentlyAbledFacilities: app.differentlyAbledFacilities || "",
        fireEquipmentDetails: app.fireEquipmentDetails || "",
        nearestHospital: app.nearestHospital || "",
        amenitiesAc: amenities.ac || false,
        amenitiesWifi: amenities.wifi || false,
        amenitiesParking: amenities.parking || false,
        amenitiesRestaurant: amenities.restaurant || false,
        amenitiesHotWater: amenities.hotWater || false,
        amenitiesTv: amenities.tv || false,
        amenitiesLaundry: amenities.laundry || false,
        amenitiesRoomService: amenities.roomService || false,
        amenitiesGarden: amenities.garden || false,
        amenitiesMountainView: amenities.mountainView || false,
        amenitiesPetFriendly: amenities.petFriendly || false,
        ownerName: app.ownerName,
        ownerGender: (app.ownerGender as "male" | "female" | "other") || "male",
        ownerMobile: app.ownerMobile,
        ownerEmail: app.ownerEmail || "",
        ownerAadhaar: app.ownerAadhaar,
        gstin: app.gstin || "",
        certificateValidityYears: app.certificateValidityYears || 1,
      });
    }
  }, [data?.application, form]);

  const updateMutation = useMutation({
    mutationFn: async (formData: UpdateFormData) => {
      // Convert amenities back to object format
      const amenities = {
        ac: formData.amenitiesAc,
        wifi: formData.amenitiesWifi,
        parking: formData.amenitiesParking,
        restaurant: formData.amenitiesRestaurant,
        hotWater: formData.amenitiesHotWater,
        tv: formData.amenitiesTv,
        laundry: formData.amenitiesLaundry,
        roomService: formData.amenitiesRoomService,
        garden: formData.amenitiesGarden,
        mountainView: formData.amenitiesMountainView,
        petFriendly: formData.amenitiesPetFriendly,
      };

      // Remove amenities fields from formData
      const { amenitiesAc, amenitiesWifi, amenitiesParking, amenitiesRestaurant, 
              amenitiesHotWater, amenitiesTv, amenitiesLaundry, amenitiesRoomService,
              amenitiesGarden, amenitiesMountainView, amenitiesPetFriendly, ...rest } = formData;

      // Convert empty/zero optional numeric fields to undefined to prevent overwriting existing data
      const cleanedData: any = { ...rest, amenities };
      
      // List of optional numeric fields that should be undefined instead of 0
      const optionalNumericFields = [
        'singleBedRoomSize', 'singleBedRoomRate',
        'doubleBedRoomSize', 'doubleBedRoomRate',
        'familySuiteSize', 'familySuiteRate',
        'distanceAirport', 'distanceRailway', 'distanceCityCenter', 
        'distanceShopping', 'distanceBusStand',
        'lobbyArea', 'diningArea'
      ];

      // Convert 0 or undefined to actual undefined for optional fields
      optionalNumericFields.forEach(field => {
        if (cleanedData[field] === 0 || cleanedData[field] === undefined || cleanedData[field] === '') {
          cleanedData[field] = undefined;
        }
      });

      // Include updated documents
      cleanedData.documents = [
        ...uploadedDocuments.revenuePapers.map(f => ({ ...f, documentType: 'revenue_papers' })),
        ...uploadedDocuments.affidavitSection29.map(f => ({ ...f, documentType: 'affidavit_section_29' })),
        ...uploadedDocuments.undertakingFormC.map(f => ({ ...f, documentType: 'undertaking_form_c' })),
        ...uploadedDocuments.registerForVerification.map(f => ({ ...f, documentType: 'register_for_verification' })),
        ...uploadedDocuments.billBook.map(f => ({ ...f, documentType: 'bill_book' })),
        ...propertyPhotos.map(f => ({ ...f, documentType: 'property_photo' })),
      ];

      return apiRequest("PATCH", `/api/applications/${applicationId}`, cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: [`/api/applications/${applicationId}`] });
      toast({
        title: "Application Resubmitted",
        description: "Your application has been updated and resubmitted for review.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data?.application) {
    return (
      <div className="bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Application not found or you don't have permission to update it.
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const application = data.application;

  if (application.status !== 'sent_back_for_corrections' && application.status !== 'reverted_to_applicant' && application.status !== 'reverted_by_dtdo') {
    return (
      <div className="bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Update</AlertTitle>
            <AlertDescription>
              This application is not in a state that can be updated. Only applications 
              sent back for corrections can be updated.
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-header"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Update Application</h1>
          <p className="text-muted-foreground">
            Application #{application.applicationNumber}
          </p>
        </div>

        {/* Officer Feedback Alert */}
        {application.clarificationRequested && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>DA Feedback - Please Address</AlertTitle>
            <AlertDescription className="mt-2 whitespace-pre-wrap">
              {application.clarificationRequested}
            </AlertDescription>
          </Alert>
        )}
        
        {/* DTDO Feedback Alert */}
        {application.dtdoRemarks && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>DTDO Feedback - Please Address</AlertTitle>
            <AlertDescription className="mt-2 whitespace-pre-wrap">
              {application.dtdoRemarks}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
            
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
                <CardDescription>Update your homestay property details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-property-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="diamond">Diamond</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mc">Municipal Corporation (MC)</SelectItem>
                            <SelectItem value="tcp">Town/City Planning (TCP)</SelectItem>
                            <SelectItem value="gp">Gram Panchayat (GP)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new_project">New Project</SelectItem>
                            <SelectItem value="new_rooms">Adding New Rooms</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Area (sq meters)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-property-area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="propertyOwnership"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Ownership</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property-ownership">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="owned">Owned</SelectItem>
                          <SelectItem value="leased">Leased</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Room Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Room Configuration (HP Homestay Rules 2025)</CardTitle>
                <CardDescription>Provide details for each room type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="font-medium">Single Bed Rooms</div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="singleBedRooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Count</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-single-rooms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="singleBedRoomSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size (sq ft)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-single-size" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="singleBedRoomRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (₹/night)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-single-rate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Double Bed Rooms</div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="doubleBedRooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Count</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-double-rooms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="doubleBedRoomSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size (sq ft)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-double-size" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="doubleBedRoomRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (₹/night)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-double-rate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Family Suites</div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="familySuites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Count</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-family-suites" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="familySuiteSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size (sq ft)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-family-size" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="familySuiteRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (₹/night)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-family-rate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="attachedWashrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attached Washrooms</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-washrooms" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle>Address Details</CardTitle>
                <CardDescription>Complete address information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-district" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tehsil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tehsil</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-tehsil" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block (for GP)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-block" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gramPanchayat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gram Panchayat (for GP)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-gram-panchayat" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urbanBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urban Body (for MC/TCP)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-urban-body" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward (for MC/TCP)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-ward" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telephone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-telephone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Distances & Public Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Distances & Public Areas</CardTitle>
                <CardDescription>Distances to key locations and public area details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="font-medium mb-2">Distances (in km)</div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distanceAirport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Airport</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-distance-airport" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distanceRailway"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Railway Station</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-distance-railway" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distanceBusStand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bus Stand</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-distance-bus" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distanceCityCenter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City Center</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-distance-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distanceShopping"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shopping Area</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-distance-shopping" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="font-medium mb-2 mt-6">Public Areas (in sq ft)</div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lobbyArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lobby Area</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lobby-area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="diningArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dining Area</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-dining-area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="parkingArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Facilities</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-parking-area" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
                <CardDescription>Select available amenities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="amenitiesAc"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-ac" />
                        </FormControl>
                        <FormLabel className="font-normal">Air Conditioning</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesWifi"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-wifi" />
                        </FormControl>
                        <FormLabel className="font-normal">WiFi</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesParking"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-parking" />
                        </FormControl>
                        <FormLabel className="font-normal">Parking</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesRestaurant"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-restaurant" />
                        </FormControl>
                        <FormLabel className="font-normal">Restaurant</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesHotWater"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-hot-water" />
                        </FormControl>
                        <FormLabel className="font-normal">Hot Water</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesTv"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-tv" />
                        </FormControl>
                        <FormLabel className="font-normal">Television</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesLaundry"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-laundry" />
                        </FormControl>
                        <FormLabel className="font-normal">Laundry</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesRoomService"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-room-service" />
                        </FormControl>
                        <FormLabel className="font-normal">Room Service</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesGarden"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-garden" />
                        </FormControl>
                        <FormLabel className="font-normal">Garden</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesMountainView"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-mountain-view" />
                        </FormControl>
                        <FormLabel className="font-normal">Mountain View</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amenitiesPetFriendly"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-pet-friendly" />
                        </FormControl>
                        <FormLabel className="font-normal">Pet Friendly</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Facilities */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Facilities</CardTitle>
                <CardDescription>Additional facility information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="ecoFriendlyFacilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eco-Friendly Facilities</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-eco-facilities" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="differentlyAbledFacilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Differently Abled Facilities</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-differently-abled" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fireEquipmentDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fire Safety Equipment</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-fire-equipment" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nearestHospital"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nearest Hospital</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-nearest-hospital" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Documents (ANNEXURE-II) */}
            <Card>
              <CardHeader>
                <CardTitle>Documents (ANNEXURE-II)</CardTitle>
                <CardDescription>Upload or update required documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Revenue Papers (Property Documents) <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Property ownership proof, title deed, or lease agreement
                  </p>
                  <ObjectUploader
                    label="Upload Revenue Papers"
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxFiles={2}
                    fileType="revenue-papers"
                    onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, revenuePapers: paths }))}
                    existingFiles={uploadedDocuments.revenuePapers}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Affidavit under Section 29 <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Sworn statement as per homestay regulations
                  </p>
                  <ObjectUploader
                    label="Upload Affidavit"
                    accept=".pdf"
                    maxFiles={1}
                    fileType="affidavit-section29"
                    onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, affidavitSection29: paths }))}
                    existingFiles={uploadedDocuments.affidavitSection29}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Undertaking in Form-C <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Signed undertaking form as per prescribed format
                  </p>
                  <ObjectUploader
                    label="Upload Form-C"
                    accept=".pdf"
                    maxFiles={1}
                    fileType="undertaking-form-c"
                    onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, undertakingFormC: paths }))}
                    existingFiles={uploadedDocuments.undertakingFormC}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Register for Verification <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Guest register or booking register
                  </p>
                  <ObjectUploader
                    label="Upload Register"
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxFiles={1}
                    fileType="register-verification"
                    onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, registerForVerification: paths }))}
                    existingFiles={uploadedDocuments.registerForVerification}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Bill Book <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Sample bill or receipt book
                  </p>
                  <ObjectUploader
                    label="Upload Bill Book"
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxFiles={1}
                    fileType="bill-book"
                    onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, billBook: paths }))}
                    existingFiles={uploadedDocuments.billBook}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Property Photographs <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Clear photos of property exterior, rooms, and facilities (minimum 2 photos)
                  </p>
                  <ObjectUploader
                    label="Upload Property Photos"
                    accept="image/*"
                    maxFiles={10}
                    fileType="property-photos"
                    onUploadComplete={(paths) => setPropertyPhotos(paths)}
                    existingFiles={propertyPhotos}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle>Owner Information</CardTitle>
                <CardDescription>Update property owner details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-owner-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerGender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender (Female owners get 5% discount)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-owner-gender">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-owner-mobile" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-owner-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ownerAadhaar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={12} data-testid="input-owner-aadhaar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* GSTIN & Validity */}
            <Card>
              <CardHeader>
                <CardTitle>GSTIN & Certificate Validity</CardTitle>
                <CardDescription>Tax and certificate details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN (Mandatory for Diamond/Gold)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-gstin" />
                      </FormControl>
                      <FormDescription>
                        GSTIN is mandatory for Diamond and Gold categories
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certificateValidityYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Validity</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-validity">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Year</SelectItem>
                          <SelectItem value="3">3 Years (10% discount on lump sum)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        3-year lump sum payment gets 10% discount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-submit"
              >
                {updateMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Save & Resubmit
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
