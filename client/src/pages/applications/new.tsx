import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Save, Send, Home, User as UserIcon, Bed, Wifi, FileText, IndianRupee } from "lucide-react";
import type { User } from "@shared/schema";
import { ObjectUploader, type UploadedFileMetadata } from "@/components/ObjectUploader";

const HP_DISTRICTS = [
  "Bharmour", "Bilaspur", "Chamba", "Dodra Kwar", "Hamirpur", "Kangra", 
  "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Pangi", "Shimla", 
  "Sirmaur", "Solan", "Una"
];

const LOCATION_TYPES = [
  { value: "mc", label: "Municipal Corporation (MC)" },
  { value: "tcp", label: "Town & Country Planning / SADA / Nagar Panchayat" },
  { value: "gp", label: "Gram Panchayat" },
];

const applicationSchema = z.object({
  // Basic property info
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  district: z.string().min(1, "District is required"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter valid 6-digit pincode"),
  locationType: z.enum(["mc", "tcp", "gp"]),
  
  // Contact details
  telephone: z.string().optional().or(z.literal("")),
  fax: z.string().optional().or(z.literal("")),
  ownerEmail: z.string().email("Enter valid email").optional().or(z.literal("")),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile"),
  
  // Owner info
  ownerName: z.string().min(3, "Owner name is required"),
  ownerAadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  
  // Category & room rate
  category: z.enum(["diamond", "gold", "silver"]),
  proposedRoomRate: z.number().min(100, "Room rate must be positive"),
  
  // Distance from key locations (in km)
  distanceAirport: z.number().min(0).optional(),
  distanceRailway: z.number().min(0).optional(),
  distanceCityCenter: z.number().min(0).optional(),
  distanceShopping: z.number().min(0).optional(),
  distanceBusStand: z.number().min(0).optional(),
  
  // Project type
  projectType: z.enum(["new_rooms", "new_project"]),
  
  // Property details
  propertyArea: z.number().min(1, "Property area required"),
  
  // Room configuration (single/double/suite)
  singleBedRooms: z.number().int().min(0).default(0),
  singleBedRoomSize: z.number().min(0).optional(),
  doubleBedRooms: z.number().int().min(0).default(0),
  doubleBedRoomSize: z.number().min(0).optional(),
  familySuites: z.number().int().min(0).max(3, "Maximum 3 family suites").default(0),
  familySuiteSize: z.number().min(0).optional(),
  attachedWashrooms: z.number().int().min(0),
  
  // Public areas (sq ft)
  lobbyArea: z.number().min(0).optional(),
  diningArea: z.number().min(0).optional(),
  parkingArea: z.number().min(0).optional(),
  
  // Additional facilities
  ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
  differentlyAbledFacilities: z.string().optional().or(z.literal("")),
  fireEquipmentDetails: z.string().optional().or(z.literal("")),
  
  // GSTIN (mandatory for Diamond/Gold)
  gstin: z.string().optional().or(z.literal("")),
  
  // Nearest hospital
  nearestHospital: z.string().optional().or(z.literal("")),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

const AMENITIES = [
  { id: "ac", label: "Air Conditioning", icon: "❄️" },
  { id: "wifi", label: "WiFi", icon: "📶" },
  { id: "parking", label: "Parking", icon: "🅿️" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "hotWater", label: "Hot Water 24/7", icon: "🚿" },
  { id: "tv", label: "Television", icon: "📺" },
  { id: "laundry", label: "Laundry Service", icon: "👕" },
  { id: "roomService", label: "Room Service", icon: "🛎️" },
  { id: "garden", label: "Garden", icon: "🌳" },
  { id: "mountainView", label: "Mountain View", icon: "🏔️" },
  { id: "petFriendly", label: "Pet Friendly", icon: "🐕" },
];

// Fee structure as per ANNEXURE-I (location-based)
const FEE_STRUCTURE = {
  diamond: { mc: 18000, tcp: 12000, gp: 10000 },
  gold: { mc: 12000, tcp: 8000, gp: 6000 },
  silver: { mc: 8000, tcp: 5000, gp: 3000 },
};

// Room rate thresholds for categories (as per official document)
const ROOM_RATE_THRESHOLDS = {
  diamond: { min: 10000, label: "Higher than ₹10,000 per room per day" },
  gold: { min: 3000, max: 10000, label: "₹3,000 to ₹10,000 per room per day" },
  silver: { max: 3000, label: "Less than ₹3,000 per room per day" },
};

export default function NewApplication() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedFileMetadata[]>>({
    revenuePapers: [],
    affidavitSection29: [],
    undertakingFormC: [],
    registerForVerification: [],
    billBook: [],
    aadhaarCard: [],
    fireSafetyNOC: [],
    pollutionClearance: [],
    buildingPlan: [],
  });
  const [propertyPhotos, setPropertyPhotos] = useState<UploadedFileMetadata[]>([]);
  const totalSteps = 6;

  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      propertyName: "",
      address: "",
      district: "",
      pincode: "",
      locationType: "gp",
      telephone: "",
      fax: "",
      ownerEmail: userData?.user?.email || "",
      ownerMobile: userData?.user?.mobile || "",
      ownerName: userData?.user?.fullName || "",
      ownerAadhaar: userData?.user?.aadhaarNumber || "",
      category: "silver",
      proposedRoomRate: 2000,
      projectType: "new_project",
      propertyArea: 0,
      singleBedRooms: 0,
      doubleBedRooms: 1,
      familySuites: 0,
      attachedWashrooms: 1,
      gstin: "",
    },
  });

  const category = form.watch("category");
  const locationType = form.watch("locationType");
  const singleBedRooms = form.watch("singleBedRooms") || 0;
  const doubleBedRooms = form.watch("doubleBedRooms") || 0;
  const familySuites = form.watch("familySuites") || 0;
  const totalRooms = singleBedRooms + doubleBedRooms + familySuites;

  const calculateFee = () => {
    const baseFee = FEE_STRUCTURE[category][locationType];
    const gst = baseFee * 0.18;
    const total = baseFee + gst;

    return {
      baseFee,
      gstAmount: gst,
      totalFee: total,
    };
  };

  const createApplicationMutation = useMutation({
    mutationFn: async (data: ApplicationForm) => {
      const fees = calculateFee();
      const payload = {
        ...data,
        ownerEmail: data.ownerEmail || undefined,
        amenities: selectedAmenities,
        baseFee: fees.baseFee.toString(),
        perRoomFee: "0",
        gstAmount: fees.gstAmount.toFixed(2),
        totalFee: fees.totalFee.toFixed(2),
        totalRooms,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        // Include uploaded documents with metadata
        documents: [
          ...uploadedDocuments.ownershipProof.map(f => ({ ...f, documentType: 'ownership_proof' })),
          ...uploadedDocuments.aadhaarCard.map(f => ({ ...f, documentType: 'aadhaar_card' })),
          ...uploadedDocuments.panCard.map(f => ({ ...f, documentType: 'pan_card' })),
          ...uploadedDocuments.gstCertificate.map(f => ({ ...f, documentType: 'gst_certificate' })),
          ...propertyPhotos.map(f => ({ ...f, documentType: 'property_photo' })),
        ],
      };

      const response = await apiRequest("POST", "/api/applications", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Application submitted successfully!",
        description: "Your homestay application has been submitted for review.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create application",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplicationForm) => {
    console.log("onSubmit called - Step:", step, "Total Steps:", totalSteps);
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    
    // Only allow submission on the final step
    if (step !== totalSteps) {
      console.warn("Form submission blocked - not on final step");
      return;
    }
    
    console.log("Submitting application...");
    createApplicationMutation.mutate(data);
  };

  const nextStep = () => {
    // Validate Step 4 (Documents) before moving forward
    if (step === 4) {
      if (uploadedDocuments.ownershipProof.length === 0 || uploadedDocuments.aadhaarCard.length === 0 || propertyPhotos.length < 5) {
        toast({
          title: "Required documents missing",
          description: "Please upload all mandatory documents before proceeding.",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const getCategoryBadge = (cat: string) => {
    const config = {
      diamond: { label: "Diamond", variant: "default" as const },
      gold: { label: "Gold", variant: "secondary" as const },
      silver: { label: "Silver", variant: "outline" as const },
    };
    return config[cat as keyof typeof config];
  };

  if (!userData?.user) {
    return null;
  }

  const fees = calculateFee();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-5 h-5 text-primary" />
                    <CardTitle>Property Details</CardTitle>
                  </div>
                  <CardDescription>Basic information about your homestay property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="propertyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Himalayan View Homestay" data-testid="input-property-name" {...field} />
                        </FormControl>
                        <FormDescription>Choose a memorable name for your property</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complete Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter full address with landmarks" 
                            className="min-h-20"
                            data-testid="input-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-district">
                                <SelectValue placeholder="Select district" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HP_DISTRICTS.map((district) => (
                                <SelectItem key={district} value={district}>
                                  {district}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN Code</FormLabel>
                          <FormControl>
                            <Input placeholder="6-digit PIN code" data-testid="input-pincode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-5 h-5 text-primary" />
                    <CardTitle>Owner Information</CardTitle>
                  </div>
                  <CardDescription>Details of the property owner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name" data-testid="input-owner-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit mobile" data-testid="input-owner-mobile" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" data-testid="input-owner-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerAadhaar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhaar Number</FormLabel>
                          <FormControl>
                            <Input placeholder="12-digit Aadhaar" data-testid="input-owner-aadhaar" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Bed className="w-5 h-5 text-primary" />
                    <CardTitle>Rooms & Category</CardTitle>
                  </div>
                  <CardDescription>Number of rooms and property category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Total Rooms: {totalRooms}</p>
                    <p className="text-xs text-muted-foreground">Maximum 12 beds across all rooms</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Category</FormLabel>
                        <FormDescription className="mb-4">
                          Select based on amenities and services offered
                        </FormDescription>
                        <FormControl>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(["diamond", "gold", "silver"] as const).map((cat) => (
                              <div
                                key={cat}
                                onClick={() => field.onChange(cat)}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover-elevate ${
                                  field.value === cat ? "border-primary bg-primary/5" : "border-border"
                                }`}
                                data-testid={`option-category-${cat}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant={getCategoryBadge(cat).variant}>
                                    {getCategoryBadge(cat).label}
                                  </Badge>
                                  {field.value === cat && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {cat === "diamond" && "Premium amenities & exceptional service"}
                                  {cat === "gold" && "Quality amenities & good service"}
                                  {cat === "silver" && "Essential amenities & comfort"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle>Upload Documents</CardTitle>
                  </div>
                  <CardDescription>Upload required documents for verification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Ownership Proof */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Property Ownership Proof <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Sale deed, mutation certificate, or property tax receipt
                    </p>
                    <ObjectUploader
                      label="Upload Ownership Proof"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="ownership-proof"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, ownershipProof: paths }))}
                      existingFiles={uploadedDocuments.ownershipProof}
                    />
                  </div>

                  {/* Aadhaar Card */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Aadhaar Card <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Owner's Aadhaar card (both sides if applicable)
                    </p>
                    <ObjectUploader
                      label="Upload Aadhaar Card"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="aadhaar-card"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, aadhaarCard: paths }))}
                      existingFiles={uploadedDocuments.aadhaarCard}
                    />
                  </div>

                  {/* PAN Card (Optional) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      PAN Card <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Required if annual revenue exceeds ₹2.5 lakhs
                    </p>
                    <ObjectUploader
                      label="Upload PAN Card"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="pan-card"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, panCard: paths }))}
                      existingFiles={uploadedDocuments.panCard}
                    />
                  </div>

                  {/* GST Certificate (Optional) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      GST Certificate <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Required if registered under GST
                    </p>
                    <ObjectUploader
                      label="Upload GST Certificate"
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      fileType="gst-certificate"
                      onUploadComplete={(paths) => setUploadedDocuments(prev => ({ ...prev, gstCertificate: paths }))}
                      existingFiles={uploadedDocuments.gstCertificate}
                    />
                  </div>

                  {/* Property Photos */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Property Photos <span className="text-destructive">*</span> (Minimum 5 photos)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Clear photos of exterior, rooms, bathrooms, and key amenities
                    </p>
                    <ObjectUploader
                      label="Upload Property Photos"
                      accept=".jpg,.jpeg,.png"
                      multiple={true}
                      maxFiles={10}
                      fileType="property-photo"
                      onUploadComplete={(paths) => setPropertyPhotos(paths)}
                      existingFiles={propertyPhotos}
                    />
                  </div>

                  {/* Validation Messages */}
                  {(uploadedDocuments.ownershipProof.length === 0 || uploadedDocuments.aadhaarCard.length === 0 || propertyPhotos.length < 5) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-orange-800 font-medium mb-2">Required documents missing:</p>
                      <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                        {uploadedDocuments.ownershipProof.length === 0 && <li>Property Ownership Proof</li>}
                        {uploadedDocuments.aadhaarCard.length === 0 && <li>Aadhaar Card</li>}
                        {propertyPhotos.length < 5 && <li>At least 5 property photos ({propertyPhotos.length}/5)</li>}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="w-5 h-5 text-primary" />
                    <CardTitle>Amenities</CardTitle>
                  </div>
                  <CardDescription>Select all amenities available at your property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AMENITIES.map((amenity) => (
                      <div
                        key={amenity.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover-elevate"
                        data-testid={`checkbox-amenity-${amenity.id}`}
                      >
                        <Checkbox
                          checked={selectedAmenities[amenity.id] || false}
                          onCheckedChange={(checked) => 
                            setSelectedAmenities(prev => ({ ...prev, [amenity.id]: !!checked }))
                          }
                        />
                        <label 
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedAmenities(prev => ({ ...prev, [amenity.id]: !prev[amenity.id] }))}
                        >
                          <span className="mr-2">{amenity.icon}</span>
                          <span className="text-sm font-medium">{amenity.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 6 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    <CardTitle>Fee Summary</CardTitle>
                  </div>
                  <CardDescription>Registration fee breakdown as per 2025 Homestay Rules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-primary/5 p-6 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Category</span>
                        <Badge variant={getCategoryBadge(category).variant}>
                          {getCategoryBadge(category).label}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Fee</span>
                        <span className="font-medium">₹{fees.baseFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST (18%)</span>
                        <span className="font-medium">₹{fees.gstAmount.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t flex justify-between text-lg">
                        <span className="font-semibold">Total Fee</span>
                        <span className="font-bold text-primary" data-testid="text-total-fee">₹{fees.totalFee.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Application Summary</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Property:</span> {form.watch("propertyName")}</p>
                      <p><span className="text-muted-foreground">Location:</span> {form.watch("district")}</p>
                      <p><span className="text-muted-foreground">Owner:</span> {form.watch("ownerName")}</p>
                      <p><span className="text-muted-foreground">Rooms:</span> {totalRooms}</p>
                      <p><span className="text-muted-foreground">Amenities:</span> {Object.values(selectedAmenities).filter(Boolean).length} selected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between gap-4">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} data-testid="button-previous">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}

              <div className="flex-1" />

              {step < totalSteps ? (
                <Button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault();
                    nextStep();
                  }} 
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createApplicationMutation.isPending}
                  data-testid="button-submit-application"
                  onClick={async () => {
                    console.log("Submit button clicked");
                    const isValid = await form.trigger();
                    console.log("Form is valid:", isValid);
                    console.log("Form errors:", form.formState.errors);
                    
                    if (!isValid) {
                      toast({
                        title: "Form validation failed",
                        description: "Please check all fields are filled correctly.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
