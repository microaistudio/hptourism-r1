import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Save, Send, Home, User as UserIcon, Bed, Wifi, FileText, IndianRupee, Eye, Lightbulb, AlertTriangle, Sparkles, Info, MapPin, Wind, ParkingCircle, UtensilsCrossed, Droplets, Tv, Shirt, ConciergeBell, Trees, Mountain, PawPrint, Video, Flame } from "lucide-react";
import type { User, HomestayApplication, UserProfile } from "@shared/schema";
import { ObjectUploader, type UploadedFileMetadata } from "@/components/ObjectUploader";
import { calculateHomestayFee, formatFee, suggestCategory, validateCategorySelection, CATEGORY_REQUIREMENTS, MAX_ROOMS_ALLOWED, MAX_BEDS_ALLOWED, type CategoryType, type LocationType } from "@shared/fee-calculator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApplicationStepper } from "@/components/application-stepper";
import { useLocation } from "wouter";
import { 
  getDistricts, 
  getTehsilsForDistrict, 
  getBlocksForTehsil, 
  getUrbanBodiesForDistrict, 
  getWardsForUrbanBody,
  LOCATION_TYPE_LABELS 
} from "@shared/lgd-data";
import {
  DEFAULT_UPLOAD_POLICY,
  type UploadPolicy,
} from "@shared/uploadPolicy";

const HP_DISTRICTS = getDistricts();

const LOCATION_TYPES = [
  { value: "gp", label: LOCATION_TYPE_LABELS.gp },
  { value: "mc", label: LOCATION_TYPE_LABELS.mc },
  { value: "tcp", label: LOCATION_TYPE_LABELS.tcp },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Female (5% additional discount)" },
  { value: "male", label: "Male" },
];

const normalizeGender = (value: unknown): "male" | "female" => {
  return value === "female" ? "female" : "male";
};

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
const OWNERSHIP_LABELS: Record<"owned" | "leased", string> = {
  owned: "Owned",
  leased: "Lease Deed",
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[index]}`;
};

const applicationSchema = z.object({
  // Basic property info
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  locationType: z.enum(["mc", "tcp", "gp"]),
  
  // LGD Hierarchical Address
  district: z.string().min(1, "District is required"),
  tehsil: z.string().optional(),
  tehsilOther: z.string().optional().or(z.literal("")),
  block: z.string().optional(),
  blockOther: z.string().optional().or(z.literal("")),
  gramPanchayat: z.string().optional(),
  gramPanchayatOther: z.string().optional().or(z.literal("")),
  urbanBody: z.string().optional(),
  urbanBodyOther: z.string().optional().or(z.literal("")),
  ward: z.string().optional(),
  address: z.string().min(10, "House/Building number and street required"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter valid 6-digit pincode"),
  
  // Contact details
  telephone: z.string().optional().or(z.literal("")),
  ownerEmail: z.string().min(1, "Email is required").email("Enter valid email"),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile"),
  
  // Owner info
  ownerName: z.string().min(3, "Owner name is required"),
  ownerFirstName: z.string().min(1, "First name is required").regex(/^[A-Za-z\s'-]+$/, "First name can only contain letters"),
  ownerLastName: z.string().min(1, "Last name is required").regex(/^[A-Za-z\s'-]+$/, "Last name can only contain letters"),
  ownerGender: z.enum(["male", "female", "other"]),
  ownerAadhaar: z.string().min(1, "Aadhaar is required").regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  propertyOwnership: z.enum(["owned", "leased"]),
  
  // Category & room rate
  category: z.enum(["diamond", "gold", "silver"]),
  proposedRoomRate: z.number().optional(), // Legacy field for backward compatibility
  
  // Per-room-type rates (2025 Rules - Form-A Certificate Requirement)
  singleBedRoomRate: z.number().min(0).optional(),
  doubleBedRoomRate: z.number().min(0).optional(),
  familySuiteRate: z.number().min(0).optional(),
  
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
  singleBedBeds: z.number().int().min(0).default(1),
  singleBedRoomSize: z.number().min(0).optional(),
  doubleBedRooms: z.number().int().min(0).default(0),
  doubleBedBeds: z.number().int().min(0).default(2),
  doubleBedRoomSize: z.number().min(0).optional(),
  familySuites: z.number().int().min(0).max(3, "Maximum 3 family suites").default(0),
  familySuiteBeds: z.number().int().min(0).default(4),
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
  
  // 2025 Rules - Certificate Validity
  certificateValidityYears: z.enum(["1", "3"]).default("1"),
  
  // Nearest hospital
  nearestHospital: z.string().optional().or(z.literal("")),
});

// Fully relaxed schema for draft saves - all fields optional with no constraints
const draftSchema = z.object({
  propertyName: z.string().optional(),
  locationType: z.enum(["mc", "tcp", "gp"]).optional(),
  district: z.string().optional(),
  tehsil: z.string().optional(),
  tehsilOther: z.string().optional(),
  block: z.string().optional(),
  blockOther: z.string().optional(),
  gramPanchayat: z.string().optional(),
  gramPanchayatOther: z.string().optional(),
  urbanBody: z.string().optional(),
  urbanBodyOther: z.string().optional(),
  ward: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  telephone: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerMobile: z.string().optional(),
  ownerName: z.string().optional(),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  ownerGender: z.enum(["male", "female", "other"]).optional(),
  ownerAadhaar: z.string().optional(),
  propertyOwnership: z.enum(["owned", "leased"]).optional(),
  category: z.enum(["diamond", "gold", "silver"]).optional(),
  proposedRoomRate: z.number().optional(),
  singleBedRoomRate: z.number().optional(),
  doubleBedRoomRate: z.number().optional(),
  familySuiteRate: z.number().optional(),
  distanceAirport: z.number().optional(),
  distanceRailway: z.number().optional(),
  distanceCityCenter: z.number().optional(),
  distanceShopping: z.number().optional(),
  distanceBusStand: z.number().optional(),
  projectType: z.enum(["new_rooms", "new_project"]).optional(),
  propertyArea: z.number().optional(),
  singleBedRooms: z.number().optional(),
  singleBedBeds: z.number().optional(),
  singleBedRoomSize: z.number().optional(),
  doubleBedRooms: z.number().optional(),
  doubleBedBeds: z.number().optional(),
  doubleBedRoomSize: z.number().optional(),
  familySuites: z.number().optional(),
  familySuiteBeds: z.number().optional(),
  familySuiteSize: z.number().optional(),
  attachedWashrooms: z.number().optional(),
  lobbyArea: z.number().optional(),
  diningArea: z.number().optional(),
  parkingArea: z.string().optional(),
  ecoFriendlyFacilities: z.string().optional(),
  differentlyAbledFacilities: z.string().optional(),
  fireEquipmentDetails: z.string().optional(),
  gstin: z.string().optional(),
  certificateValidityYears: z.enum(["1", "3"]).optional(),
  nearestHospital: z.string().optional(),
});

type ApplicationForm = z.infer<typeof applicationSchema>;
type DraftForm = z.infer<typeof draftSchema>;

const splitFullName = (fullName?: string | null) => {
  if (!fullName) {
    return { firstName: "", lastName: "" };
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(" ") };
};

const sanitizeNamePart = (value: string) =>
  value.replace(/[^A-Za-z\s'-]/g, "").replace(/\s{2,}/g, " ");

  const sanitizeDigits = (value: string, maxLength?: number) => {
    let digitsOnly = value.replace(/\D/g, "");
    if (typeof maxLength === "number") {
      digitsOnly = digitsOnly.slice(0, maxLength);
    }
  return digitsOnly;
};

const preventDigitKey = (event: KeyboardEvent<HTMLInputElement>) => {
  if (
    event.key.length === 1 &&
    /\d/.test(event.key) &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  ) {
    event.preventDefault();
  }
};

const coerceNumber = (value: unknown, fallback: number | undefined = undefined) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const normalizeOptionalString = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const generateClientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return nanoid();
};

const AMENITIES = [
  { id: "ac", label: "Air Conditioning", icon: Wind },
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { id: "hotWater", label: "Hot Water 24/7", icon: Droplets },
  { id: "tv", label: "Television", icon: Tv },
  { id: "laundry", label: "Laundry Service", icon: Shirt },
  { id: "roomService", label: "Room Service", icon: ConciergeBell },
  { id: "garden", label: "Garden", icon: Trees },
  { id: "mountainView", label: "Mountain View", icon: Mountain },
  { id: "petFriendly", label: "Pet Friendly", icon: PawPrint },
  { id: "cctv", label: "CCTV Surveillance", icon: Video },
  { id: "fireSafety", label: "Fire Safety Equipment", icon: Flame },
];

const MANDATORY_AMENITY_IDS = new Set(["cctv", "fireSafety"]);

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
    icon: Home,
    requiredFields: ["propertyName", "address", "district", "tehsil", "pincode", "locationType"],
  },
  {
    id: 2,
    label: "Owner Information",
    shortLabel: "Owner Info",
    icon: UserIcon,
    requiredFields: [
      "ownerFirstName",
      "ownerLastName",
      "ownerName",
      "ownerMobile",
      "ownerEmail",
      "ownerAadhaar",
      "ownerGender",
      "propertyOwnership",
    ],
  },
  {
    id: 3,
    label: "Rooms & Category",
    shortLabel: "Rooms",
    icon: Bed,
    requiredFields: ["category", "proposedRoomRate", "projectType", "propertyArea", "attachedWashrooms"],
  },
  {
    id: 4,
    label: "Distances & Areas",
    shortLabel: "Distances",
    icon: MapPin,
    requiredFields: ["distanceAirport", "distanceRailway", "distanceCityCenter", "distanceShopping", "distanceBusStand"],
  },
  {
    id: 5,
    label: "Documents Upload",
    shortLabel: "Documents",
    icon: FileText,
    requiredFields: ["revenuePapers", "affidavitSection29", "undertakingFormC", "registerForVerification", "billBook", "propertyPhotos"],
  },
  {
    id: 6,
    label: "Amenities & Review",
    shortLabel: "Review",
    icon: Eye,
    requiredFields: [], // Final review page
  },
];

export default function NewApplication() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
const { data: uploadPolicyData } = useQuery<UploadPolicy>({
  queryKey: ["/api/settings/upload-policy"],
  staleTime: 5 * 60 * 1000,
});
const uploadPolicy = uploadPolicyData ?? DEFAULT_UPLOAD_POLICY;
const isCategoryEnforced = false;
const maxTotalUploadBytes = uploadPolicy.totalPerApplicationMB * 1024 * 1024;
const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1); // Track highest step visited
const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>({
  cctv: false,
  fireSafety: false,
});
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedFileMetadata[]>>({
    revenuePapers: [],
    affidavitSection29: [],
    undertakingFormC: [],
    registerForVerification: [],
    billBook: [],
  });
const [propertyPhotos, setPropertyPhotos] = useState<UploadedFileMetadata[]>([]);
const totalSteps = 6;
const guardrailToastShownRef = useRef(false);

// Get draft ID and correction ID from URL query parameters
const searchParams = new URLSearchParams(window.location.search);
const draftIdFromUrl = searchParams.get('draft');
const correctionIdFromUrl = searchParams.get('application');
const [draftId, setDraftId] = useState<string | null>(draftIdFromUrl);
const [correctionId, setCorrectionId] = useState<string | null>(correctionIdFromUrl);
const [showPreview, setShowPreview] = useState(false);

const [, navigate] = useLocation();
const isCorrectionMode = Boolean(correctionId);

const { data: userData } = useQuery<{ user: User }>({
  queryKey: ["/api/auth/me"],
});

const { data: applicationsData } = useQuery<{ applications: HomestayApplication[] }>({
  queryKey: ["/api/applications"],
  enabled: !!userData?.user,
  staleTime: 30_000,
});

useEffect(() => {
  if (isCorrectionMode) {
    return;
  }
  if (!applicationsData?.applications) return;
  const apps = applicationsData.applications;
  if (apps.length === 0) {
    return;
  }

  const draftApplication = apps.find((app) => app.status === "draft");
  if (draftApplication) {
    if (!draftId || draftId !== draftApplication.id) {
      const url = new URL(window.location.href);
      url.searchParams.set("draft", draftApplication.id);
      window.history.replaceState(null, "", url.pathname + url.search);
      setDraftId(draftApplication.id);
    }
    return;
  }

  const activeApplication = apps[0];
  if (!guardrailToastShownRef.current) {
    guardrailToastShownRef.current = true;
    toast({
      title: "Application already in progress",
      description: "You already have an application in process. You’ll be redirected to continue it.",
    });
  }
  setLocation(`/applications/${activeApplication.id}`);
  }, [applicationsData, draftId, setLocation, toast, isCorrectionMode]);

  // Fetch user profile for auto-population
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: !!userData?.user,
    retry: false,
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return res.json();
    },
  });

  // Load draft application if resuming
const { data: draftData } = useQuery<{ application: HomestayApplication }>({
  queryKey: ["/api/applications", draftIdFromUrl],
  enabled: !!draftIdFromUrl,
});

const { data: correctionData } = useQuery<{ application: HomestayApplication }>({
  queryKey: ["/api/applications", correctionIdFromUrl],
  enabled: !!correctionIdFromUrl,
});

  const defaultOwnerNameParts = splitFullName(userData?.user?.fullName || "");

  const form = useForm<ApplicationForm>({
    // No resolver - validation happens manually on next/submit to allow draft saves
    defaultValues: {
      propertyName: "",
      address: "",
      district: "",
      pincode: "",
      locationType: "gp",
      telephone: "",
      tehsilOther: "",
      ownerEmail: userData?.user?.email || "",
      ownerMobile: userData?.user?.mobile || "",
      ownerName: userData?.user?.fullName || "",
      ownerFirstName: defaultOwnerNameParts.firstName,
      ownerLastName: defaultOwnerNameParts.lastName,
      ownerAadhaar: userData?.user?.aadhaarNumber || "",
      ownerGender: normalizeGender((userData?.user as any)?.gender) as "male" | "female" | "other",
      propertyOwnership: "owned",
      category: "silver",
      proposedRoomRate: 2000,
      singleBedRoomRate: 0,
      doubleBedRoomRate: 2000,
      familySuiteRate: 0,
      projectType: "new_project",
      propertyArea: 0,
      singleBedRooms: 0,
      singleBedBeds: 1,
      singleBedRoomSize: undefined,
      doubleBedRooms: 1,
      doubleBedBeds: 2,
      doubleBedRoomSize: undefined,
      familySuites: 0,
      familySuiteBeds: 4,
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
      certificateValidityYears: "1",
      nearestHospital: "",
    },
  });

  const category = form.watch("category");
  const locationType = form.watch("locationType");
  const district = form.watch("district");
  const tehsil = form.watch("tehsil");
  const tehsilOther = form.watch("tehsilOther");
  const ownerFirstName = form.watch("ownerFirstName");
  const ownerLastName = form.watch("ownerLastName");
  const ownerGender = form.watch("ownerGender");
  const propertyOwnership = form.watch("propertyOwnership") as "owned" | "leased" | undefined;
  const certificateValidityYears = form.watch("certificateValidityYears");
  const isLeaseBlocked = step === 2 && propertyOwnership === "leased";
  const submitButtonLabel = isCorrectionMode ? "Resubmit Application" : "Submit Application";
  const isHydratingDraft = useRef(false);
  const trimmedTehsilOther = tehsilOther?.trim() || "";
  const displayTehsil = tehsil === "__other" ? (trimmedTehsilOther || "—") : (tehsil || "—");
  const tehsilForRules = tehsil === "__other" ? trimmedTehsilOther : tehsil;

  useEffect(() => {
    if (isHydratingDraft.current) {
      return;
    }
    if (!district) {
      if (tehsil || tehsilOther) {
        form.setValue("tehsil", "", { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    const tehsilOptions = getTehsilsForDistrict(district);
    const hasOptions = tehsilOptions.length > 0;

    if (tehsil === "__other") {
      if (tehsilOther && tehsilOther.trim().length > 0) {
        return;
      }
      if (hasOptions) {
        form.setValue("tehsil", tehsilOptions[0], { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    if (!hasOptions) {
      if (tehsil !== "__other") {
        const manualValue = tehsil?.trim() ?? "";
        form.setValue("tehsil", "__other", { shouldDirty: false, shouldValidate: step >= 1 });
        form.setValue("tehsilOther", manualValue, { shouldDirty: false, shouldValidate: step >= 1 });
      }
      return;
    }

    if (!tehsil) {
      form.setValue("tehsil", tehsilOptions[0], { shouldDirty: false, shouldValidate: step >= 1 });
      form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
      return;
    }

    if (!tehsilOptions.includes(tehsil)) {
      form.setValue("tehsil", "__other", { shouldDirty: false, shouldValidate: step >= 1 });
      form.setValue("tehsilOther", tehsil, { shouldDirty: false, shouldValidate: step >= 1 });
      return;
    }

    if (tehsilOther) {
      form.setValue("tehsilOther", "", { shouldDirty: false, shouldValidate: step >= 1 });
    }
  }, [district, tehsil, tehsilOther, form, step]);

  const hydrateFormFromSource = (source: Partial<HomestayApplication> | DraftForm | null | undefined) => {
    if (!source) return;
    const defaults = form.getValues();
    const explicitFirst = (source as any).ownerFirstName as string | undefined;
    const explicitLast = (source as any).ownerLastName as string | undefined;
    const nameParts = splitFullName(source.ownerName ?? defaults.ownerName);
    const resolvedFirstName = explicitFirst ?? nameParts.firstName ?? defaults.ownerFirstName ?? "";
    const resolvedLastName = explicitLast ?? nameParts.lastName ?? defaults.ownerLastName ?? "";
    const resolvedCertificateYears =
      (source as any).certificateValidityYears !== undefined && (source as any).certificateValidityYears !== null
        ? String((source as any).certificateValidityYears)
        : defaults.certificateValidityYears;

    const districtValue = (source as any).district ?? defaults.district ?? "";
    let incomingTehsilRaw = (source as any).tehsil ?? defaults.tehsil ?? "";
    const incomingTehsilOtherRaw = (source as any).tehsilOther ?? defaults.tehsilOther ?? "";

    if (typeof incomingTehsilRaw === "string" && incomingTehsilRaw.trim() === "Not Provided") {
      incomingTehsilRaw = "";
    }

    const tehsilOptions = districtValue ? getTehsilsForDistrict(districtValue) : [];
    const trimmedTehsil = typeof incomingTehsilRaw === "string" ? incomingTehsilRaw.trim() : "";
    const trimmedTehsilOther = typeof incomingTehsilOtherRaw === "string" ? incomingTehsilOtherRaw.trim() : "";

    let resolvedTehsil: string;
    let resolvedTehsilOther: string;

    if (trimmedTehsil && tehsilOptions.includes(trimmedTehsil)) {
      resolvedTehsil = trimmedTehsil;
      resolvedTehsilOther = "";
    } else if (trimmedTehsil) {
      resolvedTehsil = "__other";
      resolvedTehsilOther = trimmedTehsil;
    } else if (trimmedTehsilOther) {
      resolvedTehsil = "__other";
      resolvedTehsilOther = trimmedTehsilOther;
    } else if (tehsilOptions.length > 0) {
      resolvedTehsil = tehsilOptions[0];
      resolvedTehsilOther = "";
    } else {
      resolvedTehsil = "";
      resolvedTehsilOther = "";
    }

    isHydratingDraft.current = true;
    form.reset({
      ...defaults,
      propertyName: source.propertyName ?? defaults.propertyName ?? "",
      address: source.address ?? defaults.address ?? "",
      district: districtValue,
      tehsil: resolvedTehsil,
      tehsilOther: resolvedTehsilOther,
      block: (source as any).block ?? defaults.block ?? "",
      gramPanchayat: (source as any).gramPanchayat ?? defaults.gramPanchayat ?? "",
      urbanBody: (source as any).urbanBody ?? defaults.urbanBody ?? "",
      ward: (source as any).ward ?? defaults.ward ?? "",
      pincode: (source as any).pincode ?? defaults.pincode ?? "",
      locationType: ((source.locationType as "mc" | "tcp" | "gp") || defaults.locationType || "gp"),
      telephone: (source as any).telephone ?? defaults.telephone ?? "",
      ownerEmail: source.ownerEmail ?? defaults.ownerEmail ?? "",
      ownerMobile: source.ownerMobile ?? defaults.ownerMobile ?? "",
      ownerName: source.ownerName ?? defaults.ownerName ?? "",
      ownerFirstName: resolvedFirstName,
      ownerLastName: resolvedLastName,
      ownerGender: normalizeGender(
        (source.ownerGender as "male" | "female" | "other") ?? defaults.ownerGender,
      ) as "male" | "female" | "other",
      ownerAadhaar: source.ownerAadhaar ?? defaults.ownerAadhaar ?? "",
      propertyOwnership: ((source as any).propertyOwnership as "owned" | "leased") ?? defaults.propertyOwnership ?? "owned",
      category: (source.category as "diamond" | "gold" | "silver") ?? defaults.category ?? "silver",
      proposedRoomRate: coerceNumber((source as any).proposedRoomRate, defaults.proposedRoomRate ?? 0) ?? 0,
      singleBedRoomRate: coerceNumber((source as any).singleBedRoomRate, defaults.singleBedRoomRate ?? 0) ?? 0,
      doubleBedRoomRate: coerceNumber((source as any).doubleBedRoomRate, defaults.doubleBedRoomRate ?? 0) ?? 0,
      familySuiteRate: coerceNumber((source as any).familySuiteRate, defaults.familySuiteRate ?? 0) ?? 0,
      projectType: (source.projectType as "new_rooms" | "new_project") ?? defaults.projectType ?? "new_project",
      propertyArea: coerceNumber((source as any).propertyArea, defaults.propertyArea ?? 0) ?? 0,
      singleBedRooms: coerceNumber((source as any).singleBedRooms, defaults.singleBedRooms ?? 0) ?? 0,
      singleBedBeds: coerceNumber((source as any).singleBedBeds, defaults.singleBedBeds ?? 1) ?? 1,
      singleBedRoomSize: coerceNumber((source as any).singleBedRoomSize),
      doubleBedRooms: coerceNumber((source as any).doubleBedRooms, defaults.doubleBedRooms ?? 0) ?? 0,
      doubleBedBeds: coerceNumber((source as any).doubleBedBeds, defaults.doubleBedBeds ?? 2) ?? 2,
      doubleBedRoomSize: coerceNumber((source as any).doubleBedRoomSize),
      familySuites: coerceNumber((source as any).familySuites, defaults.familySuites ?? 0) ?? 0,
      familySuiteBeds: coerceNumber((source as any).familySuiteBeds, defaults.familySuiteBeds ?? 4) ?? 4,
      familySuiteSize: coerceNumber((source as any).familySuiteSize),
      attachedWashrooms: coerceNumber((source as any).attachedWashrooms, defaults.attachedWashrooms ?? 0) ?? 0,
      gstin: (source as any).gstin ?? defaults.gstin ?? "",
      distanceAirport: coerceNumber((source as any).distanceAirport),
      distanceRailway: coerceNumber((source as any).distanceRailway),
      distanceCityCenter: coerceNumber((source as any).distanceCityCenter),
      distanceShopping: coerceNumber((source as any).distanceShopping),
      distanceBusStand: coerceNumber((source as any).distanceBusStand),
      lobbyArea: coerceNumber((source as any).lobbyArea),
      diningArea: coerceNumber((source as any).diningArea),
      parkingArea: (source as any).parkingArea ?? defaults.parkingArea ?? "",
      ecoFriendlyFacilities: (source as any).ecoFriendlyFacilities ?? defaults.ecoFriendlyFacilities ?? "",
      differentlyAbledFacilities: (source as any).differentlyAbledFacilities ?? defaults.differentlyAbledFacilities ?? "",
      fireEquipmentDetails: (source as any).fireEquipmentDetails ?? defaults.fireEquipmentDetails ?? "",
      certificateValidityYears: (resolvedCertificateYears === "3" ? "3" : "1"),
      nearestHospital: (source as any).nearestHospital ?? defaults.nearestHospital ?? "",
    });

    const amenitiesSource = (source as any).amenities;
    if (amenitiesSource) {
      try {
        const parsedAmenities =
          typeof amenitiesSource === "string" ? JSON.parse(amenitiesSource) : amenitiesSource;
        setSelectedAmenities(parsedAmenities || {});
      } catch {
        setSelectedAmenities({});
      }
    }

    const documentsSource = Array.isArray((source as any).documents) ? (source as any).documents : [];
    if (documentsSource.length > 0) {
      const docs: Record<string, UploadedFileMetadata[]> = {
        revenuePapers: [],
        affidavitSection29: [],
        undertakingFormC: [],
        registerForVerification: [],
        billBook: [],
      };
      const photos: UploadedFileMetadata[] = [];
      documentsSource.forEach((doc: any) => {
        const base: UploadedFileMetadata = {
          id: doc.id,
          filePath: doc.fileUrl || doc.filePath,
          fileName: doc.fileName || doc.name || "document",
          fileSize: doc.fileSize || 0,
          mimeType: doc.mimeType || doc.type || "application/octet-stream",
        };
        switch (doc.documentType) {
          case "revenue_papers":
            docs.revenuePapers.push(base);
            break;
          case "affidavit_section_29":
            docs.affidavitSection29.push(base);
            break;
          case "undertaking_form_c":
            docs.undertakingFormC.push(base);
            break;
          case "register_for_verification":
            docs.registerForVerification.push(base);
            break;
          case "bill_book":
            docs.billBook.push(base);
            break;
          case "property_photo":
            photos.push(base);
            break;
          default:
            break;
        }
      });
    setUploadedDocuments(docs);
      setPropertyPhotos(photos);
    } else {
      setUploadedDocuments({
        revenuePapers: [],
        affidavitSection29: [],
        undertakingFormC: [],
        registerForVerification: [],
        billBook: [],
      });
      setPropertyPhotos([]);
    }
    setTimeout(() => {
      isHydratingDraft.current = false;
    }, 0);
  };

  const buildDocumentsPayload = () => {
    const normalize = (files: UploadedFileMetadata[], type: string) =>
      files.map((file) => ({
        id: file.id || generateClientId(),
        fileName: file.fileName,
        filePath: file.filePath,
        fileUrl: file.filePath,
        documentType: type,
        fileSize: file.fileSize ?? 0,
        mimeType: file.mimeType || "application/octet-stream",
        name: file.fileName,
        type,
        url: file.filePath,
      }));

    return [
      ...normalize(uploadedDocuments.revenuePapers, "revenue_papers"),
      ...normalize(uploadedDocuments.affidavitSection29, "affidavit_section_29"),
      ...normalize(uploadedDocuments.undertakingFormC, "undertaking_form_c"),
      ...normalize(uploadedDocuments.registerForVerification, "register_for_verification"),
      ...normalize(uploadedDocuments.billBook, "bill_book"),
      ...normalize(propertyPhotos, "property_photo"),
    ];
  };

  useEffect(() => {
    const normalizedFirst = sanitizeNamePart(ownerFirstName || "").trim();
    const normalizedLast = sanitizeNamePart(ownerLastName || "").trim();
    const combined = [normalizedFirst, normalizedLast].filter(Boolean).join(" ");
    const currentFullName = form.getValues("ownerName");

    if (combined !== currentFullName) {
      form.setValue("ownerName", combined, {
        shouldValidate: step >= 2,
        shouldDirty: Boolean(normalizedFirst || normalizedLast),
      });
    }
  }, [ownerFirstName, ownerLastName, form, step]);

  const singleBedRooms = form.watch("singleBedRooms") || 0;
  const doubleBedRooms = form.watch("doubleBedRooms") || 0;
  const familySuites = form.watch("familySuites") || 0;
  const singleBedBeds = form.watch("singleBedBeds") || 0;
  const doubleBedBeds = form.watch("doubleBedBeds") || 0;
  const familySuiteBeds = form.watch("familySuiteBeds") || 0;
  const attachedWashroomsValue = form.watch("attachedWashrooms") || 0;
  const proposedRoomRate = form.watch("proposedRoomRate") || 0;
  const singleBedRoomRate = form.watch("singleBedRoomRate") || 0;
  const doubleBedRoomRate = form.watch("doubleBedRoomRate") || 0;
  const familySuiteRate = form.watch("familySuiteRate") || 0;
  const totalRooms = singleBedRooms + doubleBedRooms + familySuites;
  const totalBeds =
    singleBedRooms * singleBedBeds +
    doubleBedRooms * doubleBedBeds +
    familySuites * familySuiteBeds;
  const roomLimitExceeded = totalRooms > MAX_ROOMS_ALLOWED;
  const bedLimitExceeded = totalBeds > MAX_BEDS_ALLOWED;
  const bathroomsBelowRooms = totalRooms > 0 && attachedWashroomsValue < totalRooms;

  // Calculate weighted average rate (2025 Rules - based on total revenue)
  const calculateWeightedAverageRate = (): number => {
    if (totalRooms === 0) return 0;
    
    const totalRevenue = 
      (singleBedRooms * singleBedRoomRate) +
      (doubleBedRooms * doubleBedRoomRate) +
      (familySuites * familySuiteRate);
    
    return Math.round(totalRevenue / totalRooms);
  };

  // Use weighted average if per-room-type rates are set, otherwise fall back to proposedRoomRate (legacy)
  const hasPerRoomTypeRates = singleBedRoomRate > 0 || doubleBedRoomRate > 0 || familySuiteRate > 0;
  const effectiveRate = hasPerRoomTypeRates ? calculateWeightedAverageRate() : proposedRoomRate;
  const calculatedHighestRoomRate = Math.max(
    singleBedRooms > 0 ? singleBedRoomRate : 0,
    doubleBedRooms > 0 ? doubleBedRoomRate : 0,
    familySuites > 0 ? familySuiteRate : 0,
    !hasPerRoomTypeRates ? proposedRoomRate : 0
  );
  const highestRoomRate = calculatedHighestRoomRate > 0 ? calculatedHighestRoomRate : proposedRoomRate;
  const categoryBlocked = isCategoryEnforced && categoryValidation && !categoryValidation.isValid;
  const isNextDisabled =
    isLeaseBlocked || roomLimitExceeded || bedLimitExceeded || bathroomsBelowRooms || categoryBlocked;

  // Smart category suggestion based on room count + weighted average rate
  const suggestedCategoryValue = totalRooms > 0 && highestRoomRate > 0 
    ? suggestCategory(totalRooms, highestRoomRate) 
    : null;

  // Validate selected category against room specs
  const categoryValidation = category && totalRooms > 0 && highestRoomRate > 0
    ? validateCategorySelection(category as CategoryType, totalRooms, highestRoomRate)
    : null;

  // Load draft data into form when resuming
  useEffect(() => {
    if (!draftData?.application) return;
    const draft = draftData.application;
    setDraftId(draft.id);
    hydrateFormFromSource(draft);

    if (draft.currentPage && draft.currentPage >= 1 && draft.currentPage <= totalSteps) {
      setStep(draft.currentPage);
      setMaxStepReached(draft.currentPage);
    } else {
      setStep(1);
      setMaxStepReached(1);
    }

    toast({
      title: "Draft loaded",
      description: "Continue editing your application from where you left off.",
    });
  }, [draftData]);

  // Load existing application for corrections
  useEffect(() => {
    if (!correctionData?.application) return;
    const application = correctionData.application;

    if (!['sent_back_for_corrections', 'reverted_to_applicant', 'reverted_by_dtdo'].includes((application.status || '') as string)) {
      toast({
        title: "Application not editable",
        description: "This application is no longer awaiting corrections.",
        variant: "destructive",
      });
      setLocation(`/applications/${application.id}`);
      return;
    }

    setCorrectionId(application.id);
    hydrateFormFromSource(application);
    setDraftId(null);
    setStep(1);
    setMaxStepReached(totalSteps);

    const url = new URL(window.location.href);
    url.searchParams.set("application", application.id);
    url.searchParams.delete("draft");
    window.history.replaceState(null, "", url.pathname + url.search);

    toast({
      title: "Continue with corrections",
      description: "Review each step, update details, and resubmit when ready.",
    });
  }, [correctionData, toast, setLocation]);

  // Auto-populate owner details from user profile (only for new applications, not drafts)
  useEffect(() => {
    if (!userProfile || draftIdFromUrl || correctionIdFromUrl || form.formState.isDirty) {
      return;
    }

    const profileNameParts = splitFullName(userProfile.fullName || "");
    const profileDistrict = userProfile.district || "";
    const profileTehsil = (userProfile.tehsil || "").trim();
    const profileTehsilOptions = profileDistrict ? getTehsilsForDistrict(profileDistrict) : [];
    let defaultTehsilValue = "";
    let defaultTehsilOtherValue = "";

    if (profileTehsil && profileTehsilOptions.includes(profileTehsil)) {
      defaultTehsilValue = profileTehsil;
    } else if (profileTehsil) {
      defaultTehsilValue = "__other";
      defaultTehsilOtherValue = profileTehsil;
    } else if (profileTehsilOptions.length > 0) {
      defaultTehsilValue = profileTehsilOptions[0];
    }

    form.reset({
      propertyName: "",
      locationType: "gp",
      category: "silver",
      proposedRoomRate: 2000,
      singleBedRoomRate: 0,
      doubleBedRoomRate: 2000,
      familySuiteRate: 0,
      projectType: "new_project",
      propertyArea: 0,
      singleBedRooms: 0,
      singleBedBeds: 1,
      singleBedRoomSize: undefined,
      doubleBedRooms: 1,
      doubleBedBeds: 2,
      doubleBedRoomSize: undefined,
      familySuites: 0,
      familySuiteBeds: 4,
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
      certificateValidityYears: "1",
      nearestHospital: "",
      ownerName: userProfile.fullName || "",
      ownerFirstName: profileNameParts.firstName || "",
      ownerLastName: profileNameParts.lastName || "",
        ownerGender: normalizeGender(userProfile.gender as string) as "male" | "female" | "other",
      ownerMobile: userProfile.mobile || "",
      ownerEmail: userProfile.email || "",
      ownerAadhaar: userProfile.aadhaarNumber || "",
      district: profileDistrict,
      tehsil: defaultTehsilValue,
      tehsilOther: defaultTehsilOtherValue,
      block: userProfile.block || "",
      gramPanchayat: userProfile.gramPanchayat || "",
      urbanBody: userProfile.urbanBody || "",
      ward: userProfile.ward || "",
      address: userProfile.address || "",
      pincode: userProfile.pincode || "",
      telephone: userProfile.telephone || "",
    });
  }, [userProfile, draftIdFromUrl, correctionIdFromUrl, form]);

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
    // Detect Pangi sub-division (Chamba district, Pangi tehsil)
  const isPangiSubDivision = district === "Chamba" && tehsilForRules === "Pangi";
    
    // Use new 2025 fee calculator
    const feeBreakdown = calculateHomestayFee({
      category: category as CategoryType,
      locationType: locationType as LocationType,
      validityYears: parseInt(certificateValidityYears) as 1 | 3,
      ownerGender: (ownerGender || "male") as "male" | "female" | "other",
      isPangiSubDivision,
    });

    return {
      baseFee: feeBreakdown.baseFee,
      totalBeforeDiscounts: feeBreakdown.totalBeforeDiscounts,
      validityDiscount: feeBreakdown.validityDiscount,
      femaleOwnerDiscount: feeBreakdown.femaleOwnerDiscount,
      pangiDiscount: feeBreakdown.pangiDiscount,
      totalDiscount: feeBreakdown.totalDiscount,
      totalFee: feeBreakdown.finalFee,
      savingsAmount: feeBreakdown.savingsAmount,
      savingsPercentage: feeBreakdown.savingsPercentage,
      // Legacy fields for backward compatibility
      gstAmount: 0,
      perRoomFee: 0,
    };
  };

  // Draft save mutation - bypasses form validation to allow partial saves
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (isCorrectionMode) {
        toast({
          title: "Drafts unavailable",
          description: "Use final submission instead. Draft saving is disabled while updating an existing application.",
        });
        return null;
      }
      // Get raw form values without triggering validation
      const rawFormData = form.getValues();
      
      // Validate with relaxed draft schema (all fields optional)
      const validatedData = draftSchema.parse(rawFormData);
      
      const fees = calculateFee();
      const draftTehsilOtherTrimmed = typeof validatedData.tehsilOther === "string" ? validatedData.tehsilOther.trim() : "";
      const resolvedDraftTehsil =
        validatedData.tehsil === "__other"
          ? draftTehsilOtherTrimmed
          : (validatedData.tehsil ?? "");
      const resolvedDraftTehsilOther =
        validatedData.tehsil === "__other" ? draftTehsilOtherTrimmed : "";
      const documentsPayload = buildDocumentsPayload();
      const totalDocumentBytes = documentsPayload.reduce(
        (sum, doc) => sum + (doc.fileSize ?? 0),
        0,
      );
      if (totalDocumentBytes > maxTotalUploadBytes) {
        throw new Error(
          `Combined document size ${formatBytes(totalDocumentBytes)} exceeds ${uploadPolicy.totalPerApplicationMB} MB limit`,
        );
      }
      const payload = {
        ...validatedData,
        tehsil: resolvedDraftTehsil,
        tehsilOther: resolvedDraftTehsilOther || "",
        ownerEmail: validatedData.ownerEmail || undefined,
        amenities: selectedAmenities,
        // 2025 Fee Structure
        baseFee: fees.baseFee.toString(),
        totalBeforeDiscounts: fees.totalBeforeDiscounts?.toString() || "0",
        validityDiscount: fees.validityDiscount?.toFixed(2) || "0",
        femaleOwnerDiscount: fees.femaleOwnerDiscount?.toFixed(2) || "0",
        pangiDiscount: fees.pangiDiscount?.toFixed(2) || "0",
        totalDiscount: fees.totalDiscount?.toFixed(2) || "0",
        totalFee: fees.totalFee.toFixed(2),
        // Legacy fields for backward compatibility
        perRoomFee: "0",
        gstAmount: "0",
        totalRooms,
        certificateValidityYears: parseInt(certificateValidityYears),
        isPangiSubDivision: district === "Chamba" && resolvedDraftTehsil === "Pangi",
        currentPage: step, // Save the current page/step for resume functionality
        documents: documentsPayload,
      };

      if (draftId) {
        // Update existing draft
        const response = await apiRequest("PATCH", `/api/applications/${draftId}/draft`, payload);
        return response.json();
      } else {
        // Create new draft
        const response = await fetch("/api/applications/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (response.status === 409) {
          const data = await response.json().catch(() => ({}));
          const error = new Error(data?.message || "An application already exists for this owner.");
          (error as any).status = 409;
          (error as any).data = data;
          throw error;
        }

        if (!response.ok) {
          const text = (await response.text()) || response.statusText;
          throw new Error(text);
        }

        return response.json();
      }
    },
    onSuccess: (data) => {
      if (!data?.application) {
        return;
      }
      if (!draftId) {
        setDraftId(data.application.id);
        const url = new URL(window.location.href);
        url.searchParams.set("draft", data.application.id);
        window.history.replaceState(null, "", url.pathname + url.search);
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
      if (error?.status === 409) {
        toast({
          title: "Existing application found",
          description: error?.data?.message || "You already have an application on file. Please continue with the existing application.",
        });
        const existingId = error?.data?.existingApplicationId;
        if (existingId) {
          navigate(`/applications/${existingId}`);
        }
        return;
      }
      toast({
        title: "Failed to save draft",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (formData: ApplicationForm) => {
      const fees = calculateFee();
      const documentsPayload = buildDocumentsPayload();
      const totalDocumentBytes = documentsPayload.reduce(
        (sum, doc) => sum + (doc.fileSize ?? 0),
        0,
      );
      if (totalDocumentBytes > maxTotalUploadBytes) {
        throw new Error(
          `Combined document size ${formatBytes(totalDocumentBytes)} exceeds ${uploadPolicy.totalPerApplicationMB} MB limit`,
        );
      }
      const tehsilOtherTrimmed = typeof formData.tehsilOther === "string" ? formData.tehsilOther.trim() : "";
      const resolvedTehsil =
        formData.tehsil === "__other"
          ? tehsilOtherTrimmed
          : formData.tehsil;
      const normalizedTehsilOther = formData.tehsil === "__other" ? tehsilOtherTrimmed : "";

      if (!resolvedTehsil) {
        throw new Error("Tehsil is required");
      }

      const totalRoomsCount =
        (formData.singleBedRooms || 0) +
        (formData.doubleBedRooms || 0) +
        (formData.familySuites || 0);
      const totalBedsCalculated =
        (formData.singleBedRooms || 0) * (formData.singleBedBeds || 0) +
        (formData.doubleBedRooms || 0) * (formData.doubleBedBeds || 0) +
        (formData.familySuites || 0) * (formData.familySuiteBeds || 0);
      if (totalRoomsCount > MAX_ROOMS_ALLOWED) {
        throw new Error(`Total rooms cannot exceed ${MAX_ROOMS_ALLOWED}.`);
      }

      if (totalBedsCalculated > MAX_BEDS_ALLOWED) {
        throw new Error(`Total beds cannot exceed ${MAX_BEDS_ALLOWED}. Please adjust the bed counts per room type.`);
      }
      if (totalRoomsCount > 0 && (formData.attachedWashrooms || 0) < totalRoomsCount) {
        throw new Error("Ensure the number of attached washrooms is at least equal to the total rooms.");
      }

      if (isCategoryEnforced && categoryValidation && !categoryValidation.isValid) {
        throw new Error(
          categoryValidation.errors.join(" ") ||
            "Category selection must meet the required thresholds before submission.",
        );
      }

      if (isCorrectionMode && correctionId) {
        const normalizedBlock = normalizeOptionalString(formData.block);
        const normalizedBlockOther = normalizeOptionalString(formData.blockOther);
        const normalizedGramPanchayat = normalizeOptionalString(formData.gramPanchayat);
        const normalizedGramPanchayatOther = normalizeOptionalString(formData.gramPanchayatOther);
        const normalizedUrbanBody = normalizeOptionalString(formData.urbanBody);
        const normalizedUrbanBodyOther = normalizeOptionalString(formData.urbanBodyOther);
        const normalizedWard = normalizeOptionalString(formData.ward);

        const correctionPayload = {
          propertyName: formData.propertyName,
          locationType: formData.locationType,
          district: formData.district,
          tehsil: resolvedTehsil,
          tehsilOther: normalizedTehsilOther || "",
          block: normalizedBlock ?? "",
          blockOther: normalizedBlockOther ?? "",
          gramPanchayat: normalizedGramPanchayat ?? "",
          gramPanchayatOther: normalizedGramPanchayatOther ?? "",
          urbanBody: normalizedUrbanBody ?? "",
          urbanBodyOther: normalizedUrbanBodyOther ?? "",
          ward: normalizedWard ?? "",
          address: formData.address,
          pincode: formData.pincode,
          telephone: normalizeOptionalString(formData.telephone) ?? undefined,
          ownerName: formData.ownerName,
          ownerFirstName: formData.ownerFirstName,
          ownerLastName: formData.ownerLastName,
          ownerGender: formData.ownerGender,
          ownerMobile: formData.ownerMobile,
          ownerEmail: normalizeOptionalString(formData.ownerEmail) ?? undefined,
          ownerAadhaar: formData.ownerAadhaar,
          propertyOwnership: formData.propertyOwnership,
          category: formData.category,
          proposedRoomRate: formData.proposedRoomRate,
          singleBedRoomRate: formData.singleBedRoomRate,
          doubleBedRoomRate: formData.doubleBedRoomRate,
          familySuiteRate: formData.familySuiteRate,
          projectType: formData.projectType,
          propertyArea: formData.propertyArea,
          singleBedRooms: formData.singleBedRooms,
          singleBedBeds: formData.singleBedBeds,
          singleBedRoomSize: formData.singleBedRoomSize,
          doubleBedRooms: formData.doubleBedRooms,
          doubleBedBeds: formData.doubleBedBeds,
          doubleBedRoomSize: formData.doubleBedRoomSize,
          familySuites: formData.familySuites,
          familySuiteBeds: formData.familySuiteBeds,
          familySuiteSize: formData.familySuiteSize,
          attachedWashrooms: formData.attachedWashrooms,
          gstin: normalizeOptionalString(formData.gstin) ?? undefined,
          certificateValidityYears: parseInt(certificateValidityYears),
          isPangiSubDivision: district === "Chamba" && resolvedTehsil === "Pangi",
          distanceAirport: formData.distanceAirport,
          distanceRailway: formData.distanceRailway,
          distanceCityCenter: formData.distanceCityCenter,
          distanceShopping: formData.distanceShopping,
          distanceBusStand: formData.distanceBusStand,
          lobbyArea: formData.lobbyArea,
          diningArea: formData.diningArea,
          parkingArea: normalizeOptionalString(formData.parkingArea) ?? undefined,
          ecoFriendlyFacilities: normalizeOptionalString(formData.ecoFriendlyFacilities) ?? undefined,
          differentlyAbledFacilities: normalizeOptionalString(formData.differentlyAbledFacilities) ?? undefined,
          fireEquipmentDetails: normalizeOptionalString(formData.fireEquipmentDetails) ?? undefined,
          nearestHospital: normalizeOptionalString(formData.nearestHospital) ?? undefined,
          amenities: selectedAmenities,
          baseFee: fees.baseFee,
          totalBeforeDiscounts: fees.totalBeforeDiscounts,
          validityDiscount: fees.validityDiscount,
          femaleOwnerDiscount: fees.femaleOwnerDiscount,
          pangiDiscount: fees.pangiDiscount,
          totalDiscount: fees.totalDiscount,
          totalFee: fees.totalFee,
          perRoomFee: 0,
          gstAmount: 0,
          totalRooms,
          documents: documentsPayload,
        };

        const response = await apiRequest("PATCH", `/api/applications/${correctionId}` , correctionPayload);
        return response.json();
      }

      const normalizedFormData = {
        ...formData,
        tehsil: resolvedTehsil,
        tehsilOther: normalizedTehsilOther || "",
      };

      const normalizedBlock = normalizeOptionalString(formData.block);
      const normalizedBlockOther = normalizeOptionalString(formData.blockOther);
      const normalizedGramPanchayat = normalizeOptionalString(formData.gramPanchayat);
      const normalizedGramPanchayatOther = normalizeOptionalString(formData.gramPanchayatOther);
      const normalizedUrbanBody = normalizeOptionalString(formData.urbanBody);
      const normalizedUrbanBodyOther = normalizeOptionalString(formData.urbanBodyOther);
      const normalizedWard = normalizeOptionalString(formData.ward);

      const payload = {
        ...normalizedFormData,
        ownerEmail: normalizeOptionalString(formData.ownerEmail) || undefined,
        telephone: normalizeOptionalString(formData.telephone) || undefined,
        block: normalizedBlock ?? undefined,
        blockOther: normalizedBlockOther ?? undefined,
        gramPanchayat: normalizedGramPanchayat ?? undefined,
        gramPanchayatOther: normalizedGramPanchayatOther ?? undefined,
        urbanBody: normalizedUrbanBody ?? undefined,
        urbanBodyOther: normalizedUrbanBodyOther ?? undefined,
        ward: normalizedWard ?? undefined,
        propertyOwnership: formData.propertyOwnership,
        parkingArea: normalizeOptionalString(formData.parkingArea) || undefined,
        ecoFriendlyFacilities: normalizeOptionalString(formData.ecoFriendlyFacilities) || undefined,
        differentlyAbledFacilities: normalizeOptionalString(formData.differentlyAbledFacilities) || undefined,
        fireEquipmentDetails: normalizeOptionalString(formData.fireEquipmentDetails) || undefined,
        nearestHospital: normalizeOptionalString(formData.nearestHospital) || undefined,
        amenities: selectedAmenities,
        baseFee: fees.baseFee.toString(),
        totalBeforeDiscounts: fees.totalBeforeDiscounts?.toString() || "0",
        validityDiscount: fees.validityDiscount?.toFixed(2) || "0",
        femaleOwnerDiscount: fees.femaleOwnerDiscount?.toFixed(2) || "0",
        pangiDiscount: fees.pangiDiscount?.toFixed(2) || "0",
        totalDiscount: fees.totalDiscount?.toFixed(2) || "0",
        totalFee: fees.totalFee.toFixed(2),
        perRoomFee: "0",
        gstAmount: "0",
        totalRooms,
        certificateValidityYears: parseInt(certificateValidityYears),
        isPangiSubDivision: district === "Chamba" && resolvedTehsil === "Pangi",
        status: "submitted",
        submittedAt: new Date().toISOString(),
        documents: documentsPayload,
      };

      const response = await apiRequest("POST", "/api/applications", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: isCorrectionMode ? "Application resubmitted" : "Application submitted successfully!",
        description: isCorrectionMode
          ? "Your updates were sent back to the department for review."
          : "Your homestay application has been submitted for review.",
      });
      if (isCorrectionMode && correctionId) {
        setLocation(`/applications/${correctionId}`);
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: isCorrectionMode ? "Failed to resubmit application" : "Failed to create application",
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
    submitApplicationMutation.mutate(data);
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

      const selectedTehsil = form.getValues("tehsil");
      if (selectedTehsil === "__other") {
        const isOtherValid = await form.trigger("tehsilOther");
        if (!isOtherValid) {
          toast({
            title: "Enter tehsil name",
            description: "Provide the tehsil or sub-division name when using the manual option",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Step 2: Validate Owner Information
    if (step === 2) {
      const isValid = await form.trigger([
        "ownerFirstName",
        "ownerLastName",
        "ownerName",
        "ownerMobile",
        "ownerEmail",
        "ownerAadhaar",
        "ownerGender",
        "propertyOwnership"
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
        "singleBedBeds",
        "doubleBedRooms",
        "doubleBedBeds",
        "familySuites",
        "familySuiteBeds",
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
      const singleRooms = form.getValues("singleBedRooms") || 0;
      const doubleRooms = form.getValues("doubleBedRooms") || 0;
      const suiteRooms = form.getValues("familySuites") || 0;
      const totalRoomsCurrent = singleRooms + doubleRooms + suiteRooms;
      if (totalRoomsCurrent > MAX_ROOMS_ALLOWED) {
        toast({
          title: "Room limit exceeded",
          description: `HP Homestay Rules permit a maximum of ${MAX_ROOMS_ALLOWED} rooms. You currently have ${totalRoomsCurrent}.`,
          variant: "destructive"
        });
        return;
      }

      const totalBeds = (singleRooms * (form.getValues("singleBedBeds") || 0)) +
                        (doubleRooms * (form.getValues("doubleBedBeds") || 0)) +
                        (suiteRooms * (form.getValues("familySuiteBeds") || 0));
      if (totalBeds > MAX_BEDS_ALLOWED) {
        toast({
          title: "Maximum beds exceeded",
          description: `Total beds across all room types cannot exceed ${MAX_BEDS_ALLOWED}. Please adjust the bed counts.`,
          variant: "destructive"
        });
        return;
      }

      const attachedBaths = form.getValues("attachedWashrooms") || 0;
      if (totalRoomsCurrent > 0 && attachedBaths < totalRoomsCurrent) {
        toast({
          title: "Attached washrooms required",
          description: "Ensure each room has an attached washroom before proceeding.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedAmenities.cctv || !selectedAmenities.fireSafety) {
        toast({
          title: "Mandatory safety items missing",
          description: "Install CCTV coverage and fire-safety equipment before continuing.",
          variant: "destructive",
        });
        return;
      }

      if (isCategoryEnforced && categoryValidation && !categoryValidation.isValid) {
        toast({
          title: "Category requirements not met",
          description:
            categoryValidation.errors.join(" ") ||
            "Adjust tariffs or selected category to satisfy the mandatory criteria.",
          variant: "destructive",
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

  // Combine form data with uploaded documents for progress tracking
  const combinedFormData = {
    ...form.getValues(),
    revenuePapers: uploadedDocuments.revenuePapers,
    affidavitSection29: uploadedDocuments.affidavitSection29,
    undertakingFormC: uploadedDocuments.undertakingFormC,
    registerForVerification: uploadedDocuments.registerForVerification,
    billBook: uploadedDocuments.billBook,
    propertyPhotos: propertyPhotos,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {isCorrectionMode && correctionId && (
          <div className="mb-6 border border-amber-200 bg-amber-50/80 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <p className="font-semibold text-amber-800">You are updating application #{(correctionId?.slice(0, 8) || '').toUpperCase()}…</p>
            </div>
            <p className="text-sm text-amber-700">
              All previous details are pre-filled. Review each step, upload corrected documents, and resubmit to continue the approval workflow.
            </p>
          </div>
        )}

        <ApplicationStepper
          currentStep={step}
          maxStepReached={maxStepReached}
          totalSteps={totalSteps}
          formData={combinedFormData}
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
                    rules={{ required: "Property name is required" }}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          Property Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Himalayan View Homestay"
                            data-testid="input-property-name"
                            aria-invalid={fieldState.invalid}
                            className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Choose a memorable name for your property</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationType"
                    rules={{ required: "Location type is required" }}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          Location Type (affects registration fee) <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger
                              data-testid="select-location-type"
                              className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                              aria-invalid={fieldState.invalid}
                            >
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
                        <FormDescription>Rural (GP) or Urban (MC/TCP) - Required for fee calculation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* LGD Hierarchical Address - Step 1: District & Tehsil */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="district"
                    rules={{ required: "District is required" }}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          District <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset dependent fields when district changes
                              form.setValue('block', '');
                              form.setValue('gramPanchayat', '');
                              form.setValue('urbanBody', '');
                              form.setValue('ward', '');

                              const tehsilOptions = getTehsilsForDistrict(value);
                              const defaultTehsil = tehsilOptions[0] ?? '__other';
                              form.setValue('tehsil', defaultTehsil, {
                                shouldDirty: false,
                                shouldValidate: step >= 1,
                              });
                              form.setValue('tehsilOther', '', {
                                shouldDirty: false,
                                shouldValidate: step >= 1,
                              });
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                data-testid="select-district"
                                className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                aria-invalid={fieldState.invalid}
                              >
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
                          <FormDescription>Select your district first</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <FormField
                    control={form.control}
                    name="tehsil"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          Tehsil / Sub-Division <span className="text-destructive">*</span>
                          </FormLabel>
                          {(() => {
                            const districtValue = form.watch('district') || '';
                            const tehsilOptions = getTehsilsForDistrict(districtValue);
                            const currentTehsil = field.value;
                            const includeCurrentValue =
                              currentTehsil &&
                              typeof currentTehsil === "string" &&
                              !tehsilOptions.includes(currentTehsil);
                            
                            return (
                              <Select 
                                onValueChange={(value) => {
                                  const previousTehsil = form.getValues('tehsil');
                                  field.onChange(value);

                                  const tehsilChanged = value !== previousTehsil;
                                  if (!isHydratingDraft.current && tehsilChanged) {
                                    form.setValue('block', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                    form.setValue('gramPanchayat', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                  }

                                  if (!isHydratingDraft.current && value !== '__other') {
                                    form.setValue('tehsilOther', '', { shouldDirty: false, shouldValidate: step >= 1 });
                                  }
                                }} 
                            value={field.value}
                            disabled={!districtValue}
                          >
                            <FormControl>
                              <SelectTrigger
                                data-testid="select-tehsil"
                                className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                                aria-invalid={fieldState.invalid}
                              >
                                <SelectValue placeholder="Select tehsil" />
                              </SelectTrigger>
                            </FormControl>
                              <SelectContent>
                                {tehsilOptions.map((tehsil) => (
                                  <SelectItem key={tehsil} value={tehsil}>
                                    {tehsil}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__other">Other (Manual Entry)</SelectItem>
                                {includeCurrentValue && (
                                  <SelectItem key={currentTehsil} value={currentTehsil}>
                                    {currentTehsil}
                                  </SelectItem>
                                )}
                              </SelectContent>
                              </Select>
                              );
                            })()}
                            <FormDescription>Select tehsil after district</FormDescription>
                            <FormMessage />
                            {form.watch('tehsil') === '__other' && (
                              <FormField
                                control={form.control}
                                name="tehsilOther"
                                rules={{ required: "Please enter the tehsil name" }}
                                render={({ field, fieldState }) => (
                                  <FormItem className="mt-3">
                                    <FormLabel>Manual Tehsil Entry <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Type tehsil or sub-division name"
                                        data-testid="input-tehsil-other"
                                        value={field.value ?? ""}
                                        onChange={(event) => field.onChange(event.target.value)}
                                        aria-invalid={fieldState.invalid}
                                      />
                                    </FormControl>
                                    <FormDescription>Provide the correct tehsil if it is not listed above.</FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                  {/* Conditional: Rural Address (Gram Panchayat) */}
                  {form.watch('locationType') === 'gp' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="block"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Block / Development Block</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!tehsil || tehsil === '__other'}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-block">
                                  <SelectValue placeholder="Select block" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(tehsil && tehsil !== '__other' ? getBlocksForTehsil(district, tehsil) : []).map((block) => (
                                  <SelectItem key={block} value={block}>
                                    {block}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Rural development block</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gramPanchayat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gram Panchayat / Village</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Gram Panchayat name" 
                                data-testid="input-gram-panchayat" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>Your village/gram panchayat name</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Conditional: Urban Address (MC/TCP) */}
                  {(form.watch('locationType') === 'mc' || form.watch('locationType') === 'tcp') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="urbanBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Municipal Corporation / Nagar Panchayat</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('ward', '');
                              }} 
                              value={field.value}
                              disabled={!form.watch('district')}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-urban-body">
                                  <SelectValue placeholder="Select urban body" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getUrbanBodiesForDistrict(form.watch('district')).map((ub) => (
                                  <SelectItem key={ub.name} value={ub.name}>
                                    {ub.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>MC/TCP/Nagar Panchayat</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ward Number</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!form.watch('urbanBody')}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-ward">
                                  <SelectValue placeholder="Select ward" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getWardsForUrbanBody(form.watch('district'), form.watch('urbanBody') || '').map((ward) => (
                                  <SelectItem key={ward} value={ward}>
                                    {ward}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Your ward number</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="address"
                    rules={{ required: "Address is required" }}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          House/Building Number, Street & Locality <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
          <Textarea 
            placeholder="e.g., House No. 123, Main Road, Near Post Office" 
            className={`min-h-20 ${fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            data-testid="input-address"
                            aria-invalid={fieldState.invalid}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>Specific address details with landmarks</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pincode"
                    rules={{
                      required: "PIN code is required",
                      validate: (value) => (/^[1-9]\d{5}$/.test(value) ? true : "Enter a valid 6-digit PIN code"),
                    }}
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>
                          PIN Code <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="6-digit PIN code"
                            data-testid="input-pincode"
                            aria-invalid={fieldState.invalid}
                            className={fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                            value={field.value ?? ""}
                            onChange={(event) => {
                              const nextValue = sanitizeDigits(event.target.value, 6);
                              field.onChange(nextValue);
                            }}
                            onBlur={(event) => {
                              const trimmed = sanitizeDigits(event.target.value, 6);
                              field.onChange(trimmed);
                              field.onBlur();
                            }}
                          />
                        </FormControl>
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
                      name="ownerFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            First Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              ref={field.ref}
                              name={field.name}
                              value={field.value ?? ""}
                              placeholder="First name"
                              autoComplete="given-name"
                              autoCapitalize="words"
                              data-testid="input-owner-first-name"
                              onKeyDown={preventDigitKey}
                              onChange={(event) => field.onChange(sanitizeNamePart(event.target.value))}
                              onBlur={(event) => {
                                field.onChange(sanitizeNamePart(event.target.value).trim());
                                field.onBlur();
                              }}
                            />
                          </FormControl>
                          <FormDescription>Letters only; digits are blocked automatically.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Last Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              ref={field.ref}
                              name={field.name}
                              value={field.value ?? ""}
                              placeholder="Last name"
                              autoComplete="family-name"
                              autoCapitalize="words"
                              data-testid="input-owner-last-name"
                              onKeyDown={preventDigitKey}
                              onChange={(event) => field.onChange(sanitizeNamePart(event.target.value))}
                              onBlur={(event) => {
                                field.onChange(sanitizeNamePart(event.target.value).trim());
                                field.onBlur();
                              }}
                            />
                          </FormControl>
                          <FormDescription>Only alphabets, spaces, hyphen or apostrophe are allowed.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Full Name (auto-filled)</FormLabel>
                        <FormControl>
                          <Input
                            ref={field.ref}
                            name={field.name}
                            value={field.value ?? ""}
                            readOnly
                            data-testid="input-owner-name"
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormDescription>Generated from first and last name for application records.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender (affects registration fee)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-owner-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GENDER_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Female owners receive an additional 5% fee discount</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Mobile Number <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              ref={field.ref}
                              name={field.name}
                              value={field.value ?? ""}
                              placeholder="10-digit mobile"
                              autoComplete="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={10}
                              data-testid="input-owner-mobile"
                              onChange={(event) => field.onChange(sanitizeDigits(event.target.value, 10))}
                              onBlur={(event) => {
                                field.onChange(sanitizeDigits(event.target.value, 10));
                                field.onBlur();
                              }}
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
                      name="ownerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              ref={field.ref}
                              name={field.name}
                              type="email"
                              value={field.value ?? ""}
                              placeholder="your@email.com"
                              data-testid="input-owner-email"
                              onChange={(event) => field.onChange(event.target.value)}
                              onBlur={(event) => {
                                field.onChange(event.target.value.trim());
                                field.onBlur();
                              }}
                            />
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
                            <Input
                              ref={field.ref}
                              name={field.name}
                              value={field.value ?? ""}
                              placeholder="12-digit Aadhaar"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={12}
                              data-testid="input-owner-aadhaar"
                              onChange={(event) => field.onChange(sanitizeDigits(event.target.value, 12))}
                              onBlur={(event) => {
                                field.onChange(sanitizeDigits(event.target.value, 12));
                                field.onBlur();
                              }}
                            />
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
                        <FormLabel>
                          Property Ownership <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                            data-testid="radio-property-ownership"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="owned" id="owned" data-testid="radio-ownership-owned" />
                              <label htmlFor="owned" className="text-sm font-medium cursor-pointer">
                                Owned
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="leased" id="leased" data-testid="radio-ownership-leased" />
                              <label htmlFor="leased" className="text-sm font-medium cursor-pointer">
                                {OWNERSHIP_LABELS.leased}
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Specify whether you own the property or have it on lease
                        </FormDescription>
                        {propertyOwnership === "leased" && (
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mt-3" data-testid="alert-lease-not-allowed">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 mt-0.5" />
                              <div className="space-y-1">
                                <p className="font-medium text-sm text-orange-700 dark:text-orange-200">
                                  Lease Deed Applications Not Accepted
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  The tourism department currently processes homestay registrations only for properties under clear ownership. Applications submitted on lease or sale deeds are not entertained.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Please proceed with an owned property to continue your registration.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Discount Preview for Female Owners */}
                  {ownerGender === "female" && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4" data-testid="alert-female-discount">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-green-600 dark:text-green-500">Special Discount Eligible!</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            As a female property owner, you qualify for an additional <strong>5% discount</strong> on registration fees.
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            This discount will be automatically applied to your final fee calculation.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

{step === 3 && (
              <>
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
                    <p className="text-sm font-medium mb-2">
                      Total Rooms: {totalRooms} / {MAX_ROOMS_ALLOWED} allowed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      HP Homestay Rules 2025 permit up to {MAX_ROOMS_ALLOWED} rooms and {MAX_BEDS_ALLOWED} beds across all room types.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total beds configured: {totalBeds}
                    </p>
                  </div>

                  {/* Nightly Rate Summary */}
                  {highestRoomRate > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium text-sm">Highest Nightly Rate</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                            ₹{highestRoomRate.toLocaleString('en-IN')}/night
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Used to determine category per HP Homestay Rules 2025.
                          </p>
                          {hasPerRoomTypeRates && effectiveRate > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Weighted average (for reference): ₹{effectiveRate.toLocaleString('en-IN')}/night across {totalRooms} {totalRooms === 1 ? "room" : "rooms"}.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Smart Category Suggestion */}
                  {suggestedCategoryValue && totalRooms > 0 && highestRoomRate > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4" data-testid="alert-category-suggestion">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">Recommended Category</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Based on {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'} with highest nightly rate ₹{highestRoomRate.toLocaleString('en-IN')}.
                          </p>
                          <div className="mt-3 flex items-center gap-3">
                            <Badge variant={getCategoryBadge(suggestedCategoryValue).variant} className="text-base px-3 py-1">
                              {getCategoryBadge(suggestedCategoryValue).label}
                            </Badge>
                            {category !== suggestedCategoryValue && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                data-testid="button-apply-suggested-category"
                                onClick={() => form.setValue("category", suggestedCategoryValue)}
                              >
                                Use this category
                              </Button>
                            )}
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            <p className="font-medium mb-1">Category Criteria:</p>
                            <ul className="space-y-0.5">
                              <li>• Tariff: {CATEGORY_REQUIREMENTS[suggestedCategoryValue].tariffLabel}</li>
                              <li>• Capacity: Up to {MAX_ROOMS_ALLOWED} rooms / {MAX_BEDS_ALLOWED} beds (applies to all categories)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Category</FormLabel>
                        <FormDescription className="mb-4">
                          Category is determined by nightly tariff per HP Homestay Rules 2025.
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
                                <div className="flex items-center justify-between mb-3">
                                  <Badge variant={getCategoryBadge(cat).variant}>
                                    {getCategoryBadge(cat).label}
                                  </Badge>
                                  {field.value === cat && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  <li>{CATEGORY_REQUIREMENTS[cat].tariffLabel}</li>
                                  <li>Capacity: Up to {MAX_ROOMS_ALLOWED} rooms / {MAX_BEDS_ALLOWED} beds</li>
                                </ul>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category Validation Warnings */}
                  {categoryValidation && !categoryValidation.isValid && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4" data-testid="alert-category-validation">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-destructive">Category Criteria Not Met</p>
                          <ul className="mt-2 space-y-1 text-sm text-destructive/90">
                            {categoryValidation.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                          {isCategoryEnforced && (
                            <p className="mt-3 text-xs text-destructive/80">
                              Category enforcement is active. Please adjust room tariffs or selected category to meet the required criteria before continuing.
                            </p>
                          )}
                          {categoryValidation.suggestedCategory && (
                            <div className="mt-3 pt-3 border-t border-destructive/20">
                              <p className="text-sm text-muted-foreground">Suggested: 
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="ml-2"
                                  data-testid="button-use-suggested-category"
                                  onClick={() => form.setValue("category", categoryValidation.suggestedCategory!)}
                                >
                                  Switch to {categoryValidation.suggestedCategory.charAt(0).toUpperCase() + categoryValidation.suggestedCategory.slice(1)}
                                </Button>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {categoryValidation && categoryValidation.warnings.length > 0 && categoryValidation.isValid && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4" data-testid="alert-category-warnings">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-yellow-600 dark:text-yellow-500">Category Recommendations</p>
                          <ul className="mt-2 space-y-1 text-sm text-yellow-600/90 dark:text-yellow-500/90">
                            {categoryValidation.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    {/* Single Bed Rooms Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        name="singleBedBeds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beds per Single Room</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                min={0}
                                data-testid="input-single-bed-count"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Maximum total beds across all room types is {MAX_BEDS_ALLOWED}.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="singleBedRoomRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Single Room Rate (₹/night)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Rate per night" 
                                data-testid="input-single-bed-rate" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

                    {/* Double Bed Rooms Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        name="doubleBedBeds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beds per Double Room</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2"
                                min={0}
                                data-testid="input-double-bed-count"
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
                        name="doubleBedRoomRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Double Room Rate (₹/night)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Rate per night" 
                                data-testid="input-double-bed-rate" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

                    {/* Family Suites Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        name="familySuiteBeds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beds per Suite</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="4"
                                min={0}
                                data-testid="input-family-suite-bed-count"
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
                        name="familySuiteRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Family Suite Rate (₹/night)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Rate per night" 
                                data-testid="input-family-suite-rate" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

                    {roomLimitExceeded && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-red-700 dark:text-red-200">
                              Room limit exceeded
                            </p>
                            <p className="text-sm text-red-700/80 dark:text-red-200/80">
                              HP Homestay Rules permit a maximum of {MAX_ROOMS_ALLOWED} rooms. Please reduce the number of rooms to continue.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {bedLimitExceeded && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-red-700 dark:text-red-200">
                              Total bed capacity exceeded
                            </p>
                            <p className="text-sm text-red-700/80 dark:text-red-200/80">
                              You currently have {totalBeds} beds configured. Homestay registrations allow a maximum of {MAX_BEDS_ALLOWED} beds across all room types.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {bathroomsBelowRooms && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-red-700 dark:text-red-200">
                              Attached washrooms below requirement
                            </p>
                            <p className="text-sm text-red-700/80 dark:text-red-200/80">
                              Each room must have an attached washroom. Increase the attached washrooms to at least {totalRooms} to continue.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                        <FormDescription>Cannot exceed the total number of rooms configured above.</FormDescription>
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
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    <CardTitle>Mandatory Safety Checklist</CardTitle>
                  </div>
                  <CardDescription>
                    Confirm these baseline safety requirements before inspections.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    CCTV coverage and fire-safety equipment (extinguishers, alarms, emergency exits) must be installed and working before your site inspection. Check both boxes to acknowledge compliance.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {["cctv", "fireSafety"].map((id) => {
                      const amenity = AMENITIES.find((a) => a.id === id)!;
                      const IconComponent = amenity.icon;
                      return (
                        <label
                          key={id}
                          className="flex items-start gap-3 border rounded-lg p-3 bg-muted/30 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedAmenities[id] || false}
                            onCheckedChange={(checked) =>
                              setSelectedAmenities((prev) => ({
                                ...prev,
                                [id]: !!checked,
                              }))
                            }
                          />
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-primary" />
                              {amenity.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Required before approval and inspection.
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {(!selectedAmenities.cctv || !selectedAmenities.fireSafety) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Please confirm both CCTV and fire-safety measures to proceed.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              </>
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
                      multiple={true}
                      maxFiles={10}
                      fileType="property-photo"
                      category="photos"
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
                    <p className="text-sm text-muted-foreground">
                      CCTV surveillance and fire-safety equipment remain locked because you confirmed them in the safety checklist. Other amenities are optional.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {AMENITIES.map((amenity) => {
                        const IconComponent = amenity.icon;
                        const isMandatory = MANDATORY_AMENITY_IDS.has(amenity.id);
                        const isChecked = selectedAmenities[amenity.id] || false;
                        return (
                          <div
                            key={amenity.id}
                            className={`flex items-center space-x-3 p-3 border rounded-lg hover-elevate ${isMandatory ? "opacity-90 border-dashed bg-muted/50 cursor-not-allowed" : ""}`}
                            data-testid={`checkbox-amenity-${amenity.id}`}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={isMandatory}
                              onCheckedChange={(checked) => 
                                !isMandatory && setSelectedAmenities(prev => ({ ...prev, [amenity.id]: !!checked }))
                              }
                            />
                            <label 
                              className={`flex items-center gap-2 flex-1 ${isMandatory ? "cursor-not-allowed" : "cursor-pointer"}`}
                              onClick={() => {
                                if (isMandatory) return;
                                setSelectedAmenities(prev => ({ ...prev, [amenity.id]: !prev[amenity.id] }));
                              }}
                            >
                              <IconComponent className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">{amenity.label}</span>
                              {isMandatory && (
                                <Badge variant="outline" className="text-[10px] uppercase ml-auto">
                                  Mandatory
                                </Badge>
                              )}
                            </label>
                          </div>
                        );
                      })}
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

                  {/* Certificate Validity Selection */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Certificate Validity Period</h4>
                    <FormField
                      control={form.control}
                      name="certificateValidityYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <div className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover-elevate ${field.value === "1" ? "border-primary bg-primary/5" : "border-border"}`}>
                                <RadioGroupItem value="1" id="validity-1" className="mt-1" />
                                <label htmlFor="validity-1" className="flex-1 cursor-pointer">
                                  <div className="font-medium mb-1">1 Year (Standard)</div>
                                  <div className="text-sm text-muted-foreground">
                                    Annual fee: ₹{fees.baseFee.toFixed(0)}
                                  </div>
                                </label>
                              </div>
                              <div className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover-elevate ${field.value === "3" ? "border-primary bg-primary/5" : "border-border"}`}>
                                <RadioGroupItem value="3" id="validity-3" className="mt-1" />
                                <label htmlFor="validity-3" className="flex-1 cursor-pointer">
                                  <div className="font-medium mb-1 flex items-center gap-2">
                                    3 Years (Lump Sum)
                                    <Badge variant="default" className="text-xs">10% OFF</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Save ₹{((fees.baseFee * 3 * 0.10)).toFixed(0)} with 3-year payment
                                  </div>
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            Choose certificate validity period. 3-year lump sum payment receives 10% discount
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Fee Summary Section */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Registration Fee Summary</h4>
                    <div className="bg-primary/5 p-6 rounded-lg border-2 border-primary/20">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Category</span>
                        <Badge variant={getCategoryBadge(category).variant}>
                          {getCategoryBadge(category).label}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Location Type</span>
                        <span className="font-medium text-sm">{LOCATION_TYPE_LABELS[locationType]}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Certificate Validity</span>
                        <span className="font-medium">{certificateValidityYears} {certificateValidityYears === "1" ? "year" : "years"}</span>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Fee (Annual)</span>
                          <span className="font-medium">₹{fees.baseFee.toFixed(0)}</span>
                        </div>
                        {certificateValidityYears === "3" && (
                          <div className="flex justify-between mt-2">
                            <span className="text-muted-foreground">Total ({certificateValidityYears} years)</span>
                            <span className="font-medium">₹{(fees.baseFee * 3).toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                      {(fees.validityDiscount > 0 || fees.femaleOwnerDiscount > 0 || fees.pangiDiscount > 0) && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Discounts Applied:</div>
                          {fees.validityDiscount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">3-year lump sum (10%)</span>
                              <span className="text-green-600 dark:text-green-400">-₹{fees.validityDiscount.toFixed(0)}</span>
                            </div>
                          )}
                          {fees.femaleOwnerDiscount > 0 && (
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-muted-foreground">Female owner (5%)</span>
                              <span className="text-green-600 dark:text-green-400">-₹{fees.femaleOwnerDiscount.toFixed(0)}</span>
                            </div>
                          )}
                          {fees.pangiDiscount > 0 && (
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-muted-foreground">Pangi sub-division (50%)</span>
                              <span className="text-green-600 dark:text-green-400">-₹{fees.pangiDiscount.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="pt-3 border-t flex justify-between text-lg">
                        <span className="font-semibold">Total Payable</span>
                        <span className="font-bold text-primary" data-testid="text-total-fee">₹{fees.totalFee.toFixed(0)}</span>
                      </div>
                      {fees.savingsAmount > 0 && (
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            ✨ You save ₹{fees.savingsAmount.toFixed(0)} ({fees.savingsPercentage.toFixed(1)}%)
                          </p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        💡 GST (18%) is already included in the fees
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

              {/* Save Draft button - only for new applications */}
              {!isCorrectionMode && (
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
              )}

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
                  disabled={isNextDisabled}
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={submitApplicationMutation.isPending}
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
                  {submitApplicationMutation.isPending ? "Submitting..." : submitButtonLabel}
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
                    <div><span className="text-muted-foreground">Tehsil:</span> <span className="font-medium">{displayTehsil}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{form.watch("address") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Pincode:</span> <span className="font-medium">{form.watch("pincode") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Location Type:</span> <span className="font-medium">{LOCATION_TYPES.find(t => t.value === form.watch("locationType"))?.label || "—"}</span></div>
                    <div><span className="text-muted-foreground">Telephone:</span> <span className="font-medium">{form.watch("telephone") || "—"}</span></div>
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
                    <div><span className="text-muted-foreground">Ownership Type:</span> <span className="font-medium">{propertyOwnership ? OWNERSHIP_LABELS[propertyOwnership] : "—"}</span></div>
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
                    <div><span className="text-muted-foreground">Single Bed Rooms:</span> <span className="font-medium">{form.watch("singleBedRooms") || 0} (Beds/room: {singleBedBeds})</span></div>
                    <div><span className="text-muted-foreground">Double Bed Rooms:</span> <span className="font-medium">{form.watch("doubleBedRooms") || 0} (Beds/room: {doubleBedBeds})</span></div>
                    <div><span className="text-muted-foreground">Family Suites:</span> <span className="font-medium">{form.watch("familySuites") || 0} (Beds/room: {familySuiteBeds})</span></div>
                    <div><span className="text-muted-foreground">Total Rooms:</span> <span className="font-medium">{totalRooms}</span></div>
                    <div><span className="text-muted-foreground">Total Beds:</span> <span className="font-medium">{totalBeds}</span></div>
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
