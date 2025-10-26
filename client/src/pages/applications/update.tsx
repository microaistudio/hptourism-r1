import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";

const updateFormSchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  category: z.enum(['diamond', 'gold', 'silver']),
  totalRooms: z.coerce.number().min(1, "At least 1 room required"),
  address: z.string().min(1, "Address is required"),
  district: z.string().min(1, "District is required"),
  pincode: z.string().min(1, "Pincode is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerMobile: z.string().min(10, "Valid mobile number required"),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  ownerAadhaar: z.string().min(12, "Valid Aadhaar number required"),
});

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
      totalRooms: 1,
      address: "",
      district: "",
      pincode: "",
      ownerName: "",
      ownerMobile: "",
      ownerEmail: "",
      ownerAadhaar: "",
    },
  });

  // Update form when data loads
  if (data?.application && !form.formState.isDirty) {
    const app = data.application;
    form.reset({
      propertyName: app.propertyName,
      category: app.category as "diamond" | "gold" | "silver",
      totalRooms: app.totalRooms,
      address: app.address,
      district: app.district,
      pincode: app.pincode,
      ownerName: app.ownerName,
      ownerMobile: app.ownerMobile,
      ownerEmail: app.ownerEmail || "",
      ownerAadhaar: app.ownerAadhaar,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (formData: UpdateFormData) => {
      return apiRequest("PATCH", `/api/applications/${applicationId}`, formData);
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
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data?.application) {
    return (
      <div className="min-h-screen bg-background p-8">
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

  if (application.status !== 'sent_back_for_corrections') {
    return (
      <div className="min-h-screen bg-background p-8">
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
    <div className="min-h-screen bg-background">
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
            <AlertTitle>Officer Feedback - Please Address</AlertTitle>
            <AlertDescription className="mt-2 whitespace-pre-wrap">
              {application.clarificationRequested}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
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
                  name="totalRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rooms</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-total-rooms" />
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
                </div>
              </CardContent>
            </Card>

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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
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
                        <Input {...field} data-testid="input-owner-aadhaar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-resubmit"
              >
                {updateMutation.isPending ? (
                  <>Resubmitting...</>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resubmit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
