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
import { Mountain, ArrowLeft, ArrowRight, Save, Send, Home, User as UserIcon, Bed, Wifi, FileText, IndianRupee } from "lucide-react";
import type { User } from "@shared/schema";

const HP_DISTRICTS = [
  "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu",
  "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
];

const applicationSchema = z.object({
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  district: z.string().min(1, "District is required"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter valid 6-digit pincode"),
  ownerName: z.string().min(3, "Owner name is required"),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile"),
  ownerEmail: z.string().email("Enter valid email").optional().or(z.literal("")),
  ownerAadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  totalRooms: z.number().int().min(1, "At least 1 room required").max(50, "Maximum 50 rooms allowed"),
  category: z.enum(["diamond", "gold", "silver"]),
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

const FEE_STRUCTURE = {
  diamond: { base: 5000, perRoom: 500 },
  gold: { base: 3000, perRoom: 300 },
  silver: { base: 2000, perRoom: 200 },
};

export default function NewApplication() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedAmenities, setSelectedAmenities] = useState<Record<string, boolean>>({});
  const totalSteps = 5;

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
      ownerName: userData?.user?.fullName || "",
      ownerMobile: userData?.user?.mobile || "",
      ownerEmail: userData?.user?.email || "",
      ownerAadhaar: userData?.user?.aadhaarNumber || "",
      totalRooms: 1,
      category: "silver",
    },
  });

  const category = form.watch("category");
  const totalRooms = form.watch("totalRooms");

  const calculateFee = () => {
    const feeConfig = FEE_STRUCTURE[category];
    const baseFee = feeConfig.base;
    const perRoomFee = feeConfig.perRoom * totalRooms;
    const subtotal = baseFee + perRoomFee;
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    return {
      baseFee,
      perRoomFee: perRoomFee / totalRooms,
      totalPerRoomFee: perRoomFee,
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
        perRoomFee: fees.perRoomFee.toFixed(2),
        gstAmount: fees.gstAmount.toFixed(2),
        totalFee: fees.totalFee.toFixed(2),
        status: 'pending',
        submittedAt: new Date().toISOString(),
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
    // Only allow submission on the final step
    if (step !== totalSteps) {
      if (import.meta.env.MODE === "development") {
        console.warn("Form submission blocked - not on final step");
      }
      return;
    }
    
    createApplicationMutation.mutate(data);
  };

  const nextStep = () => {
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mountain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">New Homestay Application</h1>
              <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
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
                  <FormField
                    control={form.control}
                    name="totalRooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Number of Rooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="50"
                            data-testid="input-total-rooms"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>Enter the total guest rooms available</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

            {step === 5 && (
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
                        <span className="text-muted-foreground">Per Room Fee ({totalRooms} rooms × ₹{fees.perRoomFee.toFixed(2)})</span>
                        <span className="font-medium">₹{fees.totalPerRoomFee.toFixed(2)}</span>
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
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
