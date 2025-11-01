import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Save, Send, Home, User as UserIcon, Bed, Wifi, FileText, IndianRupee, Eye } from "lucide-react";
import type { User, HomestayApplication } from "@shared/schema";
import { ObjectUploader, type UploadedFileMetadata } from "@/components/ObjectUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApplicationStepper } from "@/components/application-stepper";
import { 
  getDistricts, 
  getTehsilsForDistrict, 
  getBlocksForTehsil, 
  getUrbanBodiesForDistrict, 
  getWardsForUrbanBody,
  LOCATION_TYPE_LABELS 
} from "@shared/lgd-data";

const HP_DISTRICTS = getDistricts();

const LOCATION_TYPES = [
  { value: "gp", label: LOCATION_TYPE_LABELS.gp },
  { value: "mc", label: LOCATION_TYPE_LABELS.mc },
  { value: "tcp", label: LOCATION_TYPE_LABELS.tcp },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Female (10% fee discount for 3 years)" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

// District-based typical distances (user can override)
const DISTRICT_DISTANCES: Record<string, { airport: number; railway: number; cityCenter: number; shopping: number; busStand: number }> = {
  "Shimla": { airport: 23, railway: 90, cityCenter: 5, shopping: 3, busStand: 2 },
  "Kangra": { airport: 15, railway: 25, cityCenter: 8, shopping: 5, busStand: 3 },
  "Kullu": { airport: 10, railway: 125, cityCenter: 6, shopping: 4, busStand: 2 },
  "Kinnaur": { airport: 245, railway: 350, cityCenter: 12, shopping: 8, busStand: 5 },
  "Lahaul and Spiti": { airport: 250, railway: 400, cityCenter: 15, shopping: 10, busStand: 8 },
  "Mandi": { airport: 50, railway: 125, cityCenter: 7, shopping: 5, busStand: 3 },
  "Chamba": { airport: 120, railway: 100, cityCenter: 10, shopping: 6, busStand: 4 },
  "Hamirpur": { airport: 85, railway: 90, cityCenter: 6, shopping: 4, busStand: 2 },
  "Sirmaur": { airport: 60, railway: 45, cityCenter: 8, shopping: 5, busStand: 3 },
  "Solan": { airport: 65, railway: 30, cityCenter: 7, shopping: 4, busStand: 2 },
  "Una": { airport: 110, railway: 35, cityCenter: 8, shopping: 5, busStand: 3 },
  "Bilaspur": { airport: 105, railway: 95, cityCenter: 6, shopping: 4, busStand: 2 },
  "Bharmour": { airport: 180, railway: 150, cityCenter: 12, shopping: 8, busStand: 6 },
  "Dodra Kwar": { airport: 280, railway: 420, cityCenter: 20, shopping: 15, busStand: 10 },
  "Pangi": { airport: 320, railway: 450, cityCenter: 25, shopping: 18, busStand: 12 },
};

// Strict schema for final submission - all required fields
const applicationSchema = z.object({
  // Basic property info
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  locationType: z.enum(["mc", "tcp", "gp"]),
  
  // LGD Hierarchical Address
  district: z.string().min(1, "District is required"),
  tehsil: z.string().min(1, "Tehsil is required"),
  block: z.string().optional(),
  gramPanchayat: z.string().optional(),
  urbanBody: z.string().optional(),
  ward: z.string().optional(),
  address: z.string().min(10, "House/Building number and street required"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter valid 6-digit pincode"),
  
  // Contact details
  telephone: z.string().optional().or(z.literal("")),
  fax: z.string().optional().or(z.literal("")),
  ownerEmail: z.string().min(1, "Email is required").email("Enter valid email"),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile"),
  
  // Owner info
  ownerName: z.string().min(3, "Owner name is required"),
  ownerGender: z.enum(["male", "female", "other"]),
  ownerAadhaar: z.string().min(1, "Aadhaar is required").regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  
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
  
  // Public areas (lobby/dining in sq ft, parking is description)
  lobbyArea: z.number().min(0).optional(),
  diningArea: z.number().min(0).optional(),
  parkingArea: z.string().optional().or(z.literal("")),
  
  // Additional facilities
  ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
  differentlyAbledFacilities: z.string().optional().or(z.literal("")),
  fireEquipmentDetails: z.string().optional().or(z.literal("")),
  
  // GSTIN (mandatory for Diamond/Gold)
  gstin: z.string().optional().or(z.literal("")),
  
  // Nearest hospital
  nearestHospital: z.string().optional().or(z.literal("")),
});

// Fully relaxed schema for draft saves - all fields optional with no constraints
const draftSchema = z.object({
  propertyName: z.string().optional(),
  locationType: z.enum(["mc", "tcp", "gp"]).optional(),
  district: z.string().optional(),
  tehsil: z.string().optional(),
  block: z.string().optional(),
  gramPanchayat: z.string().optional(),
  urbanBody: z.string().optional(),
  ward: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  telephone: z.string().optional(),
  fax: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerMobile: z.string().optional(),
  ownerName: z.string().optional(),
  ownerGender: z.enum(["male", "female", "other"]).optional(),
  ownerAadhaar: z.string().optional(),
  category: z.enum(["diamond", "gold", "silver"]).optional(),
  proposedRoomRate: z.number().optional(),
  distanceAirport: z.number().optional(),
  distanceRailway: z.number().optional(),
  distanceCityCenter: z.number().optional(),
  distanceShopping: z.number().optional(),
  distanceBusStand: z.number().optional(),
  projectType: z.enum(["new_rooms", "new_project"]).optional(),
  propertyArea: z.number().optional(),
  singleBedRooms: z.number().optional(),
  singleBedRoomSize: z.number().optional(),
  doubleBedRooms: z.number().optional(),
  doubleBedRoomSize: z.number().optional(),
  familySuites: z.number().optional(),
  familySuiteSize: z.number().optional(),
  attachedWashrooms: z.number().optional(),
  lobbyArea: z.number().optional(),
  diningArea: z.number().optional(),
  parkingArea: z.string().optional(),
  ecoFriendlyFacilities: z.string().optional(),
  differentlyAbledFacilities: z.string().optional(),
  fireEquipmentDetails: z.string().optional(),
  gstin: z.string().optional(),
  nearestHospital: z.string().optional(),
});

type ApplicationForm = z.infer<typeof applicationSchema>;
type DraftForm = z.infer<typeof draftSchema>;

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

// Step configuration for progress tracking
const STEP_CONFIG = [
  {
    id: 1,
    label: "Property Details",
    shortLabel: "Property",
    requiredFields: ["propertyName", "address", "district", "pincode", "locationType"],
  },
  {
    id: 2,
    label: "Owner Information",
    shortLabel: "Owner Info",
    requiredFields: ["ownerName", "ownerMobile", "ownerEmail", "ownerAadhaar"],
  },
  {
    id: 3,
    label: "Rooms & Category",
    shortLabel: "Rooms",
    requiredFields: ["category", "proposedRoomRate", "projectType", "propertyArea", "attachedWashrooms"],
  },
  {
    id: 4,
    label: "Distances & Areas",
    shortLabel: "Distances",
    requiredFields: ["distanceAirport", "distanceRailway", "distanceCityCenter", "distanceShopping", "distanceBusStand"],
  },
  {
    id: 5,
    label: "Documents Upload",
    shortLabel: "Documents",
    requiredFields: [], // Handled separately with document arrays
  },
  {
    id: 6,
    label: "Amenities & Review",
    shortLabel: "Review",
    requiredFields: [], // Final review page
  },
];

export default function NewApplication() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1); // Track highest step visited
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedFileMetadata[]>>({
    revenuePapers: [],
    affidavitSection29: [],
    undertakingFormC: [],
    registerForVerification: [],
    billBook: [],
  });
  const [propertyPhotos, setPropertyPhotos] = useState<UploadedFileMetadata[]>([]);
  const totalSteps = 6;

  // Get draft ID from URL query parameter (use window.location.search to get query params)
  const draftIdFromUrl = new URLSearchParams(window.location.search).get('draft');

  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  // Load draft application if resuming
  const { data: draftData } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", draftIdFromUrl],
    enabled: !!draftIdFromUrl,
  });

  const form = useForm<ApplicationForm>({
    // No resolver - validation happens manually on next/submit to allow draft saves
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
      singleBedRoomSize: undefined,
      doubleBedRooms: 1,
      doubleBedRoomSize: undefined,
      familySuites: 0,
      familySuiteSize: undefined,
      attachedWashrooms: 1,
      gstin: "",
      distanceAirport: undefined,
      distanceRailway: undefined,
      distanceCityCenter: undefined,
      distanceShopping: undefined,
      distanceBusStand: undefined,
      lobbyArea: undefined,
      diningArea: undefined,
      parkingArea: "",
      ecoFriendlyFacilities: "",
      differentlyAbledFacilities: "",
      fireEquipmentDetails: "",
      nearestHospital: "",
    },
  });

  const category = form.watch("category");
  const locationType = form.watch("locationType");
  const district = form.watch("district");
  const singleBedRooms = form.watch("singleBedRooms") || 0;
  const doubleBedRooms = form.watch("doubleBedRooms") || 0;
  const familySuites = form.watch("familySuites") || 0;
  const totalRooms = singleBedRooms + doubleBedRooms + familySuites;

  // Load draft data into form when resuming
  useEffect(() => {
    if (draftData?.application) {
      const draft = draftData.application;
      
      // Set the draft ID for updating
      setDraftId(draft.id);

      // Populate all form fields with draft data
      form.reset({
        propertyName: draft.propertyName || "",
        address: draft.address || "",
        district: draft.district || "",
        pincode: draft.pincode || "",
        locationType: (draft.locationType as "mc" | "tcp" | "gp") || "gp",
        telephone: draft.telephone || "",
        fax: draft.fax || "",
        ownerEmail: draft.ownerEmail || "",
        ownerMobile: draft.ownerMobile || "",
        ownerName: draft.ownerName || "",
        ownerAadhaar: draft.ownerAadhaar || "",
        category: (draft.category as "diamond" | "gold" | "silver") || "silver",
        proposedRoomRate: draft.proposedRoomRate ? parseFloat(draft.proposedRoomRate.toString()) : 2000,
        projectType: (draft.projectType as "new_rooms" | "new_project") || "new_project",
        propertyArea: draft.propertyArea ? parseFloat(draft.propertyArea.toString()) : 0,
        singleBedRooms: draft.singleBedRooms ? parseInt(draft.singleBedRooms.toString()) : 0,
        singleBedRoomSize: draft.singleBedRoomSize ? parseFloat(draft.singleBedRoomSize.toString()) : undefined,
        doubleBedRooms: draft.doubleBedRooms ? parseInt(draft.doubleBedRooms.toString()) : 0,
        doubleBedRoomSize: draft.doubleBedRoomSize ? parseFloat(draft.doubleBedRoomSize.toString()) : undefined,
        familySuites: draft.familySuites ? parseInt(draft.familySuites.toString()) : 0,
        familySuiteSize: draft.familySuiteSize ? parseFloat(draft.familySuiteSize.toString()) : undefined,
        attachedWashrooms: draft.attachedWashrooms ? parseInt(draft.attachedWashrooms.toString()) : 0,
        gstin: draft.gstin || "",
        distanceAirport: draft.distanceAirport ? parseFloat(draft.distanceAirport.toString()) : undefined,
        distanceRailway: draft.distanceRailway ? parseFloat(draft.distanceRailway.toString()) : undefined,
        distanceCityCenter: draft.distanceCityCenter ? parseFloat(draft.distanceCityCenter.toString()) : undefined,
        distanceShopping: draft.distanceShopping ? parseFloat(draft.distanceShopping.toString()) : undefined,
        distanceBusStand: draft.distanceBusStand ? parseFloat(draft.distanceBusStand.toString()) : undefined,
        lobbyArea: draft.lobbyArea ? parseFloat(draft.lobbyArea.toString()) : undefined,
        diningArea: draft.diningArea ? parseFloat(draft.diningArea.toString()) : undefined,
        parkingArea: draft.parkingArea || "",
        ecoFriendlyFacilities: draft.ecoFriendlyFacilities || "",
        differentlyAbledFacilities: draft.differentlyAbledFacilities || "",
        fireEquipmentDetails: draft.fireEquipmentDetails || "",
        nearestHospital: draft.nearestHospital || "",
      });

      // Load amenities if present
      if (draft.amenities) {
        try {
          const amenities = typeof draft.amenities === 'string' 
            ? JSON.parse(draft.amenities) 
            : draft.amenities;
          setSelectedAmenities(amenities);
        } catch (e) {
          console.error("Failed to parse amenities:", e);
        }
      }

      // Load uploaded documents
      if (draft.documents && Array.isArray(draft.documents)) {
        const docs: Record<string, UploadedFileMetadata[]> = {
          revenuePapers: [],
          affidavitSection29: [],
          undertakingFormC: [],
          registerForVerification: [],
          billBook: [],
        };
        const photos: UploadedFileMetadata[] = [];

        draft.documents.forEach((doc: any) => {
          if (doc.documentType === 'property_photo') {
            photos.push(doc);
          } else if (doc.documentType === 'revenue_papers') {
            docs.revenuePapers.push(doc);
          } else if (doc.documentType === 'affidavit_section_29') {
            docs.affidavitSection29.push(doc);
          } else if (doc.documentType === 'undertaking_form_c') {
            docs.undertakingFormC.push(doc);
          } else if (doc.documentType === 'register_for_verification') {
            docs.registerForVerification.push(doc);
          } else if (doc.documentType === 'bill_book') {
            docs.billBook.push(doc);
          }
        });

        setUploadedDocuments(docs);
        setPropertyPhotos(photos);
      }

      // Restore the page/step user was on when they saved the draft
      if (draft.currentPage && draft.currentPage >= 1 && draft.currentPage <= totalSteps) {
        setStep(draft.currentPage);
        setMaxStepReached(draft.currentPage); // Allow navigation to all previously visited steps
      }

      toast({
        title: "Draft loaded",
        description: "Continue editing your application from where you left off.",
      });
    }
  }, [draftData]);

  // Auto-populate distances when district changes (user can override)
  useEffect(() => {
    if (district && DISTRICT_DISTANCES[district]) {
      const defaults = DISTRICT_DISTANCES[district];
      
      // Only auto-fill if fields are undefined (not set), allow intentional zero values
      if (form.getValues("distanceAirport") === undefined) {
        form.setValue("distanceAirport", defaults.airport);
      }
      if (form.getValues("distanceRailway") === undefined) {
        form.setValue("distanceRailway", defaults.railway);
      }
      if (form.getValues("distanceCityCenter") === undefined) {
        form.setValue("distanceCityCenter", defaults.cityCenter);
      }
      if (form.getValues("distanceShopping") === undefined) {
        form.setValue("distanceShopping", defaults.shopping);
      }
      if (form.getValues("distanceBusStand") === undefined) {
        form.setValue("distanceBusStand", defaults.busStand);
      }
    }
  }, [district]);

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

  const [draftId, setDraftId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Draft save mutation - bypasses form validation to allow partial saves
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      // Get raw form values without triggering validation
      const rawFormData = form.getValues();
      
      // Validate with relaxed draft schema (all fields optional)
      const validatedData = draftSchema.parse(rawFormData);
      
      const fees = calculateFee();
      const payload = {
        ...validatedData,
        ownerEmail: validatedData.ownerEmail || undefined,
        amenities: selectedAmenities,
        baseFee: fees.baseFee.toString(),
        perRoomFee: "0",
        gstAmount: fees.gstAmount.toFixed(2),
        totalFee: fees.totalFee.toFixed(2),
        totalRooms,
        currentPage: step, // Save the current page/step for resume functionality
        documents: [
          ...uploadedDocuments.revenuePapers.map(f => ({ ...f, documentType: 'revenue_papers' })),
          ...uploadedDocuments.affidavitSection29.map(f => ({ ...f, documentType: 'affidavit_section_29' })),
          ...uploadedDocuments.undertakingFormC.map(f => ({ ...f, documentType: 'undertaking_form_c' })),
          ...uploadedDocuments.registerForVerification.map(f => ({ ...f, documentType: 'register_for_verification' })),
          ...uploadedDocuments.billBook.map(f => ({ ...f, documentType: 'bill_book' })),
          ...propertyPhotos.map(f => ({ ...f, documentType: 'property_photo' })),
        ],
      };

      if (draftId) {
        // Update existing draft
        const response = await apiRequest("PATCH", `/api/applications/${draftId}/draft`, payload);
        return response.json();
      } else {
        // Create new draft
        const response = await apiRequest("POST", "/api/applications/draft", payload);
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (!draftId) {
        setDraftId(data.application.id);
      }
      // Invalidate and refetch to ensure dashboard shows the draft immediately
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.refetchQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Draft saved!",
        description: "Your progress has been saved. You can continue anytime.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save draft",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

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
        // Include uploaded ANNEXURE-II documents with metadata
        documents: [
          ...uploadedDocuments.revenuePapers.map(f => ({ ...f, documentType: 'revenue_papers' })),
          ...uploadedDocuments.affidavitSection29.map(f => ({ ...f, documentType: 'affidavit_section_29' })),
          ...uploadedDocuments.undertakingFormC.map(f => ({ ...f, documentType: 'undertaking_form_c' })),
          ...uploadedDocuments.registerForVerification.map(f => ({ ...f, documentType: 'register_for_verification' })),
          ...uploadedDocuments.billBook.map(f => ({ ...f, documentType: 'bill_book' })),
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

  const nextStep = async () => {
    // Step 1: Validate Property Details
    if (step === 1) {
      const isValid = await form.trigger([
        "propertyName",
        "address",
        "district",
        "pincode",
        "locationType"
      ]);
      if (!isValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in all mandatory property details before proceeding",
          variant: "destructive"
        });
        return;
      }
    }

    // Step 2: Validate Owner Information
    if (step === 2) {
      const isValid = await form.trigger([
        "ownerName",
        "ownerMobile",
        "ownerEmail",
        "ownerAadhaar"
      ]);
      if (!isValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in all mandatory owner information before proceeding",
          variant: "destructive"
        });
        return;
      }
    }

    // Step 3: Validate Room Details & Category
    if (step === 3) {
      const category = form.getValues("category");
      const fieldsToValidate: Array<keyof ApplicationForm> = [
        "category",
        "proposedRoomRate",
        "projectType",
        "propertyArea",
        "singleBedRooms",
        "doubleBedRooms",
        "familySuites",
        "attachedWashrooms"
      ];
      
      // Add GSTIN validation for Diamond/Gold categories
      if (category === "diamond" || category === "gold") {
        fieldsToValidate.push("gstin");
        
        // Check if GSTIN is filled
        const gstinValue = form.getValues("gstin");
        if (!gstinValue || gstinValue.trim() === "") {
          toast({
            title: "GSTIN is required",
            description: "GSTIN is mandatory for Diamond and Gold category properties",
            variant: "destructive"
          });
          return;
        }
      }
      
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        toast({
          title: "Please complete all required fields",
          description: "Fill in all mandatory room details before proceeding",
          variant: "destructive"
        });
        return;
      }

      // Validate total beds <= 12
      const totalBeds = (form.getValues("singleBedRooms") || 0) + 
                       (form.getValues("doubleBedRooms") || 0) * 2 + 
                       (form.getValues("familySuites") || 0) * 4;
      if (totalBeds > 12) {
        toast({
          title: "Maximum beds exceeded",
          description: "Total beds cannot exceed 12 (Single=1, Double=2, Suite=4 beds each)",
          variant: "destructive"
        });
        return;
      }
    }

    // Step 4: Validate Distances & Public Areas (all optional, can proceed)
    if (step === 4) {
      // No mandatory fields on this step, can proceed
    }

    // Step 5: Validate Documents (ANNEXURE-II)
    if (step === 5) {
      const missingDocs = [];
      if (uploadedDocuments.revenuePapers.length === 0) missingDocs.push("Revenue Papers");
      if (uploadedDocuments.affidavitSection29.length === 0) missingDocs.push("Affidavit under Section 29");
      if (uploadedDocuments.undertakingFormC.length === 0) missingDocs.push("Undertaking in Form-C");
      if (uploadedDocuments.registerForVerification.length === 0) missingDocs.push("Register for Verification");
      if (uploadedDocuments.billBook.length === 0) missingDocs.push("Bill Book");
      if (propertyPhotos.length < 2) missingDocs.push("Property Photos (minimum 2)");
      
      if (missingDocs.length > 0) {
        toast({
          title: "Required ANNEXURE-II documents missing",
          description: `Please upload: ${missingDocs.join(", ")}`,
          variant: "destructive"
        });
        return;
      }
    }
    
    if (step < totalSteps) {
      const newStep = step + 1;
      setStep(newStep);
      setMaxStepReached(Math.max(maxStepReached, newStep));
    }
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

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= maxStepReached) {
      setStep(targetStep);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <ApplicationStepper
          currentStep={step}
          maxStepReached={maxStepReached}
          totalSteps={totalSteps}
          formData={form.getValues()}
          onStepClick={handleStepClick}
          steps={STEP_CONFIG}
        />

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
                          <FormDescription>Auto-fills typical distances for your district</FormDescription>
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

                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Type (affects registration fee)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location-type">
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Required for calculating registration fees as per 2025 Rules</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="telephone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telephone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Landline number" data-testid="input-telephone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fax (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Fax number" data-testid="input-fax" {...field} />
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
                          <FormLabel>
                            Email <span className="text-destructive">*</span>
                          </FormLabel>
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
                          <FormLabel>
                            Aadhaar Number <span className="text-destructive">*</span>
                          </FormLabel>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="proposedRoomRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proposed Room Rate (per day)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter rate" 
                              data-testid="input-room-rate" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>Suggested category will appear based on rate</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-project-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new_rooms">New Rooms (adding to existing house)</SelectItem>
                              <SelectItem value="new_project">New Project (constructing new building)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="propertyArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Area (sq meters)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Total property area" 
                            data-testid="input-property-area" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Room Configuration</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="singleBedRooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Single Bed Rooms</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                data-testid="input-single-bed-rooms" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
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
                            <FormLabel>Single Room Size (sq ft)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Optional" 
                                data-testid="input-single-bed-room-size" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="doubleBedRooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Double Bed Rooms</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                data-testid="input-double-bed-rooms" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
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
                            <FormLabel>Double Room Size (sq ft)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Optional" 
                                data-testid="input-double-bed-room-size" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="familySuites"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Family Suites (max 3)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                data-testid="input-family-suites" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
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
                            <FormLabel>Suite Size (sq ft)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Optional" 
                                data-testid="input-family-suite-size" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="attachedWashrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Attached Washrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Number of washrooms" 
                              data-testid="input-attached-washrooms" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {(category === "diamond" || category === "gold") && (
                    <FormField
                      control={form.control}
                      name="gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GSTIN {category === "diamond" || category === "gold" ? "(Mandatory)" : "(Optional)"}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="15-character GSTIN" 
                              data-testid="input-gstin" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>GST registration is mandatory for Diamond and Gold categories</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distances & Public Areas</CardTitle>
                  <CardDescription>Location details and common areas (all fields optional)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Distances are auto-filled based on your district. You can modify them if your property is in a different location.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Distances from Key Locations (in km)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="distanceAirport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Airport</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Distance in km" 
                                data-testid="input-distance-airport" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
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
                              <Input 
                                type="number" 
                                placeholder="Distance in km" 
                                data-testid="input-distance-railway" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
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
                            <FormLabel>City Centre</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Distance in km" 
                                data-testid="input-distance-city-center" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
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
                            <FormLabel>Shopping Centre</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Distance in km" 
                                data-testid="input-distance-shopping" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
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
                              <Input 
                                type="number" 
                                placeholder="Distance in km" 
                                data-testid="input-distance-bus-stand" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Public Areas</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lobbyArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lobby/Lounge Area (sq ft)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Optional" 
                                data-testid="input-lobby-area" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
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
                            <FormLabel>Dining Space (sq ft)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Optional" 
                                data-testid="input-dining-area" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
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
                            <Textarea 
                              placeholder="Describe parking facilities (e.g., covered parking for 5 cars)" 
                              className="min-h-20"
                              data-testid="input-parking-area" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Optional - describe available parking</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle>Upload Documents (ANNEXURE-II)</CardTitle>
                  </div>
                  <CardDescription>Upload required documents as per 2025 Homestay Rules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Revenue Papers (Jamabandi & Tatima) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Revenue Papers (Jamabandi & Tatima) <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Land revenue records showing ownership
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

                  {/* Affidavit under Section 29 */}
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

                  {/* Undertaking in Form-C */}
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

                  {/* Register for Verification */}
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

                  {/* Bill Book */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Bill Book <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Sample billing/invoice book
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

                  {/* Property Photographs */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Property Photographs <span className="text-destructive">*</span> (Minimum 2 photos)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Clear photos of property exterior, rooms, and facilities
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
                  {(uploadedDocuments.revenuePapers.length === 0 || uploadedDocuments.affidavitSection29.length === 0 || uploadedDocuments.undertakingFormC.length === 0 || uploadedDocuments.registerForVerification.length === 0 || uploadedDocuments.billBook.length === 0 || propertyPhotos.length < 2) && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mt-4">
                      <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">Required documents missing:</p>
                      <ul className="text-sm text-orange-700 dark:text-orange-300 list-disc list-inside space-y-1">
                        {uploadedDocuments.revenuePapers.length === 0 && <li>Revenue Papers (Jamabandi & Tatima)</li>}
                        {uploadedDocuments.affidavitSection29.length === 0 && <li>Affidavit under Section 29</li>}
                        {uploadedDocuments.undertakingFormC.length === 0 && <li>Undertaking in Form-C</li>}
                        {uploadedDocuments.registerForVerification.length === 0 && <li>Register for Verification</li>}
                        {uploadedDocuments.billBook.length === 0 && <li>Bill Book</li>}
                        {propertyPhotos.length < 2 && <li>At least 2 property photos ({propertyPhotos.length}/2)</li>}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 6 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities, Facilities & Fee Summary</CardTitle>
                  <CardDescription>Final details and registration fee calculation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Amenities Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Property Amenities</h4>
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
                  </div>

                  {/* Additional Facilities Section */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Additional Facilities (Optional)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ecoFriendlyFacilities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Eco-Friendly Facilities</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Solar panels, rainwater harvesting, waste management, etc." 
                                className="min-h-20"
                                data-testid="input-eco-friendly" 
                                {...field} 
                              />
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
                              <Textarea 
                                placeholder="Ramps, wheelchair access, accessible washrooms, etc." 
                                className="min-h-20"
                                data-testid="input-differently-abled" 
                                {...field} 
                              />
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
                              <Textarea 
                                placeholder="Fire extinguishers, smoke detectors, emergency exits, etc." 
                                className="min-h-20"
                                data-testid="input-fire-equipment" 
                                {...field} 
                              />
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
                              <Input 
                                placeholder="Name and distance" 
                                data-testid="input-nearest-hospital" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fee Summary Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Registration Fee Summary</h4>
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
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap justify-between gap-4">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} data-testid="button-previous">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}

              <div className="flex-1" />

              {/* Save Draft button - available on all pages */}
              <Button 
                type="button" 
                variant="outline"
                onClick={() => saveDraftMutation.mutate()}
                disabled={saveDraftMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>

              {/* Preview button - only on final page */}
              {step === totalSteps && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  data-testid="button-preview"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}

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

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Application Preview
              </DialogTitle>
              <DialogDescription>
                Review all details before final submission
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-120px)] pr-4">
              <div className="space-y-6">
                {/* Page 1: Property Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Property Name:</span> <span className="font-medium">{form.watch("propertyName") || "—"}</span></div>
                    <div><span className="text-muted-foreground">District:</span> <span className="font-medium">{form.watch("district") || "—"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{form.watch("address") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Pincode:</span> <span className="font-medium">{form.watch("pincode") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Location Type:</span> <span className="font-medium">{LOCATION_TYPES.find(t => t.value === form.watch("locationType"))?.label || "—"}</span></div>
                    <div><span className="text-muted-foreground">Telephone:</span> <span className="font-medium">{form.watch("telephone") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Fax:</span> <span className="font-medium">{form.watch("fax") || "—"}</span></div>
                  </CardContent>
                </Card>

                {/* Page 2: Owner Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Owner Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Owner Name:</span> <span className="font-medium">{form.watch("ownerName") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{form.watch("ownerMobile") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{form.watch("ownerEmail") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Aadhaar:</span> <span className="font-medium">{form.watch("ownerAadhaar") || "—"}</span></div>
                  </CardContent>
                </Card>

                {/* Page 3: Room Details & Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Room Details & Category</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Category:</span> <Badge className="ml-2">{form.watch("category")?.toUpperCase() || "—"}</Badge></div>
                    <div><span className="text-muted-foreground">Room Rate:</span> <span className="font-medium">₹{form.watch("proposedRoomRate") || 0}/day</span></div>
                    <div><span className="text-muted-foreground">Project Type:</span> <span className="font-medium">{form.watch("projectType") === "new_project" ? "New Project" : "New Rooms"}</span></div>
                    <div><span className="text-muted-foreground">Property Area:</span> <span className="font-medium">{form.watch("propertyArea") || 0} sq m</span></div>
                    <div><span className="text-muted-foreground">Single Bed Rooms:</span> <span className="font-medium">{form.watch("singleBedRooms") || 0}</span></div>
                    <div><span className="text-muted-foreground">Double Bed Rooms:</span> <span className="font-medium">{form.watch("doubleBedRooms") || 0}</span></div>
                    <div><span className="text-muted-foreground">Family Suites:</span> <span className="font-medium">{form.watch("familySuites") || 0}</span></div>
                    <div><span className="text-muted-foreground">Total Rooms:</span> <span className="font-medium">{totalRooms}</span></div>
                    <div><span className="text-muted-foreground">Attached Washrooms:</span> <span className="font-medium">{form.watch("attachedWashrooms") || 0}</span></div>
                    <div><span className="text-muted-foreground">GSTIN:</span> <span className="font-medium">{form.watch("gstin") || "Not provided"}</span></div>
                  </CardContent>
                </Card>

                {/* Page 4: Distances & Public Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distances & Public Areas</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Airport:</span> <span className="font-medium">{form.watch("distanceAirport") || 0} km</span></div>
                    <div><span className="text-muted-foreground">Railway Station:</span> <span className="font-medium">{form.watch("distanceRailway") || 0} km</span></div>
                    <div><span className="text-muted-foreground">City Center:</span> <span className="font-medium">{form.watch("distanceCityCenter") || 0} km</span></div>
                    <div><span className="text-muted-foreground">Shopping Area:</span> <span className="font-medium">{form.watch("distanceShopping") || 0} km</span></div>
                    <div><span className="text-muted-foreground">Bus Stand:</span> <span className="font-medium">{form.watch("distanceBusStand") || 0} km</span></div>
                    <div><span className="text-muted-foreground">Lobby Area:</span> <span className="font-medium">{form.watch("lobbyArea") || "—"} sq ft</span></div>
                    <div><span className="text-muted-foreground">Dining Area:</span> <span className="font-medium">{form.watch("diningArea") || "—"} sq ft</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Parking:</span> <span className="font-medium">{form.watch("parkingArea") || "—"}</span></div>
                  </CardContent>
                </Card>

                {/* Page 5: Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Uploaded Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Revenue Papers:</span> <span className="font-medium">{uploadedDocuments.revenuePapers.length} file(s)</span></div>
                    <div><span className="text-muted-foreground">Affidavit Section 29:</span> <span className="font-medium">{uploadedDocuments.affidavitSection29.length} file(s)</span></div>
                    <div><span className="text-muted-foreground">Undertaking Form-C:</span> <span className="font-medium">{uploadedDocuments.undertakingFormC.length} file(s)</span></div>
                    <div><span className="text-muted-foreground">Register for Verification:</span> <span className="font-medium">{uploadedDocuments.registerForVerification.length} file(s)</span></div>
                    <div><span className="text-muted-foreground">Bill Book:</span> <span className="font-medium">{uploadedDocuments.billBook.length} file(s)</span></div>
                    <div><span className="text-muted-foreground">Property Photos:</span> <span className="font-medium">{propertyPhotos.length} file(s)</span></div>
                  </CardContent>
                </Card>

                {/* Page 6: Amenities & Fees */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Amenities & Fee Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Selected Amenities:</p>
                      <div className="flex flex-wrap gap-2">
                        {AMENITIES.filter(a => selectedAmenities[a.id]).map(a => (
                          <Badge key={a.id} variant="secondary">{a.label}</Badge>
                        ))}
                        {AMENITIES.filter(a => selectedAmenities[a.id]).length === 0 && (
                          <span className="text-sm text-muted-foreground">None selected</span>
                        )}
                      </div>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Fee:</span>
                        <span className="font-medium">₹{calculateFee().baseFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">GST (18%):</span>
                        <span className="font-medium">₹{calculateFee().gstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total Fee:</span>
                        <span className="text-primary">₹{calculateFee().totalFee.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Facilities */}
                {(form.watch("ecoFriendlyFacilities") || form.watch("differentlyAbledFacilities") || form.watch("fireEquipmentDetails") || form.watch("nearestHospital")) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Facilities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {form.watch("ecoFriendlyFacilities") && (
                        <div><span className="text-muted-foreground">Eco-Friendly:</span> <p className="mt-1">{form.watch("ecoFriendlyFacilities")}</p></div>
                      )}
                      {form.watch("differentlyAbledFacilities") && (
                        <div><span className="text-muted-foreground">Differently-Abled Facilities:</span> <p className="mt-1">{form.watch("differentlyAbledFacilities")}</p></div>
                      )}
                      {form.watch("fireEquipmentDetails") && (
                        <div><span className="text-muted-foreground">Fire Equipment:</span> <p className="mt-1">{form.watch("fireEquipmentDetails")}</p></div>
                      )}
                      {form.watch("nearestHospital") && (
                        <div><span className="text-muted-foreground">Nearest Hospital:</span> <p className="mt-1">{form.watch("nearestHospital")}</p></div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
