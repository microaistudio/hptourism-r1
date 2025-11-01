import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowLeft, Save, Send, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, User, FileText, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const inspectionReportSchema = z.object({
  actualInspectionDate: z.string().min(1, "Inspection date is required"),
  roomCountVerified: z.boolean(),
  actualRoomCount: z.number().int().min(0).optional(),
  categoryMeetsStandards: z.boolean(),
  recommendedCategory: z.enum(['diamond', 'gold', 'silver']).optional(),
  
  // ANNEXURE-III Mandatory Checklist (18 points)
  mandatoryChecklist: z.object({
    applicationForm: z.boolean(),
    documents: z.boolean(),
    onlinePayment: z.boolean(),
    wellMaintained: z.boolean(),
    cleanRooms: z.boolean(),
    comfortableBedding: z.boolean(),
    roomSize: z.boolean(),
    cleanKitchen: z.boolean(),
    cutleryCrockery: z.boolean(),
    waterFacility: z.boolean(),
    wasteDisposal: z.boolean(),
    energySavingLights: z.boolean(),
    visitorBook: z.boolean(),
    doctorDetails: z.boolean(),
    luggageAssistance: z.boolean(),
    fireEquipment: z.boolean(),
    guestRegister: z.boolean(),
    cctvCameras: z.boolean(),
  }),
  mandatoryRemarks: z.string().optional(),
  
  // ANNEXURE-III Desirable Checklist (18 points)
  desirableChecklist: z.object({
    parking: z.boolean(),
    attachedBathroom: z.boolean(),
    toiletAmenities: z.boolean(),
    hotColdWater: z.boolean(),
    waterConservation: z.boolean(),
    diningArea: z.boolean(),
    wardrobe: z.boolean(),
    storage: z.boolean(),
    furniture: z.boolean(),
    laundry: z.boolean(),
    refrigerator: z.boolean(),
    lounge: z.boolean(),
    heatingCooling: z.boolean(),
    luggageHelp: z.boolean(),
    safeStorage: z.boolean(),
    securityGuard: z.boolean(),
    himachaliCrafts: z.boolean(),
    rainwaterHarvesting: z.boolean(),
  }),
  desirableRemarks: z.string().optional(),
  
  // Legacy fields for compatibility
  fireSafetyCompliant: z.boolean().optional(),
  structuralSafety: z.boolean().optional(),
  overallSatisfactory: z.boolean(),
  recommendation: z.enum(['approve', 'approve_with_conditions', 'raise_objections', 'reject']),
  detailedFindings: z.string().min(20, "Detailed findings must be at least 20 characters"),
  daRemarks: z.string().optional(),
});

type InspectionReportForm = z.infer<typeof inspectionReportSchema>;

type InspectionData = {
  order: {
    id: string;
    inspectionDate: string;
    inspectionAddress: string;
    specialInstructions?: string;
  };
  application: {
    id: string;
    applicationNumber: string;
    propertyName: string;
    category: string;
    totalRooms: number;
  };
  owner: {
    fullName: string;
    mobile: string;
    email: string;
  } | null;
  reportSubmitted: boolean;
  existingReport?: any;
};

const MANDATORY_CHECKPOINTS = [
  { key: 'applicationForm', label: 'Application form as per ANNEXURE I' },
  { key: 'documents', label: 'Documents list as per ANNEXURE II' },
  { key: 'onlinePayment', label: 'Online payment facility (UPI/Net Banking/Cards)' },
  { key: 'wellMaintained', label: 'Well-maintained furnished home with quality flooring' },
  { key: 'cleanRooms', label: 'Clean, airy, pest-free rooms with external ventilation' },
  { key: 'comfortableBedding', label: 'Comfortable bedding with quality fabrics' },
  { key: 'roomSize', label: 'Minimum room & bathroom size compliance' },
  { key: 'cleanKitchen', label: 'Smoke-free, clean, hygienic, odor-free kitchen' },
  { key: 'cutleryCrockery', label: 'Good quality cutlery and crockery' },
  { key: 'waterFacility', label: 'RO/Aquaguard/Mineral water availability' },
  { key: 'wasteDisposal', label: 'Waste disposal as per municipal laws' },
  { key: 'energySavingLights', label: 'Energy-saving lights (CFL/LED) in rooms & public areas' },
  { key: 'visitorBook', label: 'Visitor book and feedback facilities' },
  { key: 'doctorDetails', label: 'Doctor names, addresses, phone numbers displayed' },
  { key: 'luggageAssistance', label: 'Lost luggage assistance facilities' },
  { key: 'fireEquipment', label: 'Basic fire equipment available' },
  { key: 'guestRegister', label: 'Guest check-in/out register (with passport details for foreigners)' },
  { key: 'cctvCameras', label: 'CCTV cameras in common areas' },
] as const;

const DESIRABLE_CHECKPOINTS = [
  { key: 'parking', label: 'Parking with adequate road width' },
  { key: 'attachedBathroom', label: 'Attached private bathroom with toiletries' },
  { key: 'toiletAmenities', label: 'Toilet with seat, lid, and toilet paper' },
  { key: 'hotColdWater', label: 'Hot & cold running water with sewage connection' },
  { key: 'waterConservation', label: 'Water conservation taps/showers' },
  { key: 'diningArea', label: 'Dining area serving fresh & hygienic food' },
  { key: 'wardrobe', label: 'Wardrobe with minimum 4 hangers in guest rooms' },
  { key: 'storage', label: 'Cabinets or drawers for storage in rooms' },
  { key: 'furniture', label: 'Quality chairs, work desk, and furniture' },
  { key: 'laundry', label: 'Washing machine/dryer or laundry services' },
  { key: 'refrigerator', label: 'Refrigerator in homestay' },
  { key: 'lounge', label: 'Lounge or sitting arrangement in lobby' },
  { key: 'heatingCooling', label: 'Heating & cooling in closed public rooms' },
  { key: 'luggageHelp', label: 'Assistance with luggage on request' },
  { key: 'safeStorage', label: 'Safe storage facilities in rooms' },
  { key: 'securityGuard', label: 'Security guard facilities' },
  { key: 'himachaliCrafts', label: 'Promotion of Himachali handicrafts & architecture' },
  { key: 'rainwaterHarvesting', label: 'Rainwater harvesting system' },
] as const;

export default function DAInspectionReport() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading} = useQuery<InspectionData>({
    queryKey: [`/api/da/inspections/${id}`],
    enabled: !!id,
  });

  const form = useForm<InspectionReportForm>({
    resolver: zodResolver(inspectionReportSchema),
    defaultValues: {
      actualInspectionDate: format(new Date(), 'yyyy-MM-dd'),
      roomCountVerified: false,
      categoryMeetsStandards: false,
      mandatoryChecklist: {
        applicationForm: false,
        documents: false,
        onlinePayment: false,
        wellMaintained: false,
        cleanRooms: false,
        comfortableBedding: false,
        roomSize: false,
        cleanKitchen: false,
        cutleryCrockery: false,
        waterFacility: false,
        wasteDisposal: false,
        energySavingLights: false,
        visitorBook: false,
        doctorDetails: false,
        luggageAssistance: false,
        fireEquipment: false,
        guestRegister: false,
        cctvCameras: false,
      },
      mandatoryRemarks: '',
      desirableChecklist: {
        parking: false,
        attachedBathroom: false,
        toiletAmenities: false,
        hotColdWater: false,
        waterConservation: false,
        diningArea: false,
        wardrobe: false,
        storage: false,
        furniture: false,
        laundry: false,
        refrigerator: false,
        lounge: false,
        heatingCooling: false,
        luggageHelp: false,
        safeStorage: false,
        securityGuard: false,
        himachaliCrafts: false,
        rainwaterHarvesting: false,
      },
      desirableRemarks: '',
      fireSafetyCompliant: false,
      structuralSafety: false,
      overallSatisfactory: false,
      recommendation: 'approve',
      detailedFindings: '',
      daRemarks: '',
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: async (reportData: InspectionReportForm) => {
      return await apiRequest('POST', `/api/da/inspections/${id}/submit-report`, reportData);
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your inspection report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/da/inspections'] });
      setLocation('/da/inspections');
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: InspectionReportForm) => {
    submitReportMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data || data.reportSubmitted) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            {data?.reportSubmitted ? (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-medium">Report Already Submitted</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You have already submitted a report for this inspection.
                </p>
                <Button className="mt-4" onClick={() => setLocation('/da/inspections')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Inspections
                </Button>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Inspection Not Found</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  The inspection order you're looking for doesn't exist.
                </p>
                <Button className="mt-4" onClick={() => setLocation('/da/inspections')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Inspections
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { order, application, owner } = data;

  // Calculate compliance percentages
  const mandatoryValues = Object.values(form.watch('mandatoryChecklist') || {});
  const mandatoryCompliance = mandatoryValues.length > 0 
    ? Math.round((mandatoryValues.filter(Boolean).length / mandatoryValues.length) * 100)
    : 0;
    
  const desirableValues = Object.values(form.watch('desirableChecklist') || {});
  const desirableCompliance = desirableValues.length > 0
    ? Math.round((desirableValues.filter(Boolean).length / desirableValues.length) * 100)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/da/inspections')}
            className="mb-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inspections
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Inspection Report</h1>
          <p className="text-muted-foreground mt-1">
            Submit ANNEXURE-III compliant inspection findings
          </p>
        </div>
      </div>

      {/* Property Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Property Name</span>
              <p className="font-medium">{application?.propertyName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Application Number</span>
              <p className="font-medium">{application?.applicationNumber}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Category</span>
              <div>
                <Badge variant="outline">{application?.category?.toUpperCase()}</Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Owner</span>
              <p className="font-medium">{owner?.fullName} • {owner?.mobile}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-sm text-muted-foreground">Inspection Address</span>
              <p className="font-medium flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                {order.inspectionAddress}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Scheduled Date</span>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {format(new Date(order.inspectionDate), 'PPP')}
              </p>
            </div>
            {order.specialInstructions && (
              <div className="md:col-span-2">
                <span className="text-sm text-orange-600 font-medium">Special Instructions</span>
                <p className="mt-1 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">{order.specialInstructions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inspection Report Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Inspection Date */}
          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="actualInspectionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Inspection Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-inspection-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Basic Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Verification</CardTitle>
              <CardDescription>Verify room count and category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Room Count Verification */}
              <FormField
                control={form.control}
                name="roomCountVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Room Count Matches</FormLabel>
                      <FormDescription>
                        Does the actual room count match the application? (Applied: {application?.totalRooms} rooms)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-room-count"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!form.watch('roomCountVerified') && (
                <FormField
                  control={form.control}
                  name="actualRoomCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Room Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-actual-room-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* Category Verification */}
              <FormField
                control={form.control}
                name="categoryMeetsStandards"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Category Meets Standards</FormLabel>
                      <FormDescription>
                        Does the property meet the standards for {application?.category?.toUpperCase()} category?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-category-standards"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!form.watch('categoryMeetsStandards') && (
                <FormField
                  control={form.control}
                  name="recommendedCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Category</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="diamond" id="diamond" />
                            <FormLabel htmlFor="diamond" className="font-normal cursor-pointer">Diamond</FormLabel>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gold" id="gold" />
                            <FormLabel htmlFor="gold" className="font-normal cursor-pointer">Gold</FormLabel>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="silver" id="silver" />
                            <FormLabel htmlFor="silver" className="font-normal cursor-pointer">Silver</FormLabel>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* ANNEXURE-III Compliance Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                ANNEXURE-III Compliance Checklist
              </CardTitle>
              <CardDescription>
                HP Homestay Rules 2025 - Official Inspection Requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="mandatory" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mandatory" className="flex items-center gap-2" data-testid="tab-mandatory">
                    <Shield className="w-4 h-4" />
                    <span>Section A: Mandatory</span>
                    <Badge variant="secondary" className="ml-auto">{mandatoryCompliance}%</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="desirable" className="flex items-center gap-2" data-testid="tab-desirable">
                    <Star className="w-4 h-4" />
                    <span>Section B: Desirable</span>
                    <Badge variant="secondary" className="ml-auto">{desirableCompliance}%</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mandatory" className="space-y-4 mt-6">
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      <Shield className="w-4 h-4 inline mr-2" />
                      All 18 mandatory requirements must be met for homestay approval
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {MANDATORY_CHECKPOINTS.map((checkpoint, index) => (
                      <FormField
                        key={checkpoint.key}
                        control={form.control}
                        name={`mandatoryChecklist.${checkpoint.key}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover-elevate">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid={`switch-mandatory-${checkpoint.key}`}
                              />
                            </FormControl>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                <FormLabel className="text-base font-normal cursor-pointer">
                                  {checkpoint.label}
                                </FormLabel>
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="mandatoryRemarks"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Mandatory Section Remarks</FormLabel>
                        <FormDescription>
                          Add any notes about mandatory requirements
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Any observations or issues with mandatory requirements..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-mandatory-remarks"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="desirable" className="space-y-4 mt-6">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      <Star className="w-4 h-4 inline mr-2" />
                      Desirable requirements enhance guest experience and property rating
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {DESIRABLE_CHECKPOINTS.map((checkpoint, index) => (
                      <FormField
                        key={checkpoint.key}
                        control={form.control}
                        name={`desirableChecklist.${checkpoint.key}`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover-elevate">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid={`switch-desirable-${checkpoint.key}`}
                              />
                            </FormControl>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                <FormLabel className="text-base font-normal cursor-pointer">
                                  {checkpoint.label}
                                </FormLabel>
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="desirableRemarks"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Desirable Section Remarks</FormLabel>
                        <FormDescription>
                          Add any notes about desirable amenities
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="Any observations about desirable amenities..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-desirable-remarks"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Overall Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="overallSatisfactory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold">Overall Satisfactory</FormLabel>
                      <FormDescription>
                        Property meets all requirements for homestay operation
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-overall-satisfactory"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Findings and Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle>Findings & Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="detailedFindings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Findings *</FormLabel>
                    <FormDescription>
                      Comprehensive report of your inspection (minimum 20 characters)
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your findings in detail..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="textarea-detailed-findings"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Recommendation *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        data-testid="radio-recommendation"
                      >
                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="approve" id="approve" />
                          <FormLabel htmlFor="approve" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <div className="font-medium">Approve</div>
                              <div className="text-xs text-muted-foreground">Meets all requirements</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="approve_with_conditions" id="approve_with_conditions" />
                          <FormLabel htmlFor="approve_with_conditions" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <div>
                              <div className="font-medium">Approve with Conditions</div>
                              <div className="text-xs text-muted-foreground">Minor issues to address</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="raise_objections" id="raise_objections" />
                          <FormLabel htmlFor="raise_objections" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <div>
                              <div className="font-medium">Raise Objections</div>
                              <div className="text-xs text-muted-foreground">Issues need resolution</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="reject" id="reject" />
                          <FormLabel htmlFor="reject" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div>
                              <div className="font-medium">Reject</div>
                              <div className="text-xs text-muted-foreground">Does not meet standards</div>
                            </div>
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daRemarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional comments or recommendations..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-da-remarks"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/da/inspections')}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitReportMutation.isPending}
              data-testid="button-submit-report"
            >
              {submitReportMutation.isPending ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
