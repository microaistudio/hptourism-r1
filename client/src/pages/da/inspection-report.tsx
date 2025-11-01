import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowLeft, Save, Send, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, User, FileText } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const inspectionReportSchema = z.object({
  actualInspectionDate: z.string().min(1, "Inspection date is required"),
  roomCountVerified: z.boolean(),
  actualRoomCount: z.number().int().min(0).optional(),
  categoryMeetsStandards: z.boolean(),
  recommendedCategory: z.enum(['diamond', 'gold', 'silver']).optional(),
  fireSafetyCompliant: z.boolean(),
  fireSafetyIssues: z.string().optional(),
  structuralSafety: z.boolean(),
  structuralIssues: z.string().optional(),
  cleanlinessStandard: z.boolean(),
  cleanlinessIssues: z.string().optional(),
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
      fireSafetyCompliant: false,
      structuralSafety: false,
      cleanlinessStandard: false,
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
            Submit your field inspection findings
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

          {/* Verification Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Checklist</CardTitle>
              <CardDescription>Verify each aspect during your site visit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Room Count Verification */}
              <div className="space-y-4">
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
              </div>

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

              <Separator />

              {/* Fire Safety */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="fireSafetyCompliant"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Fire Safety Compliant</FormLabel>
                        <FormDescription>
                          Fire extinguishers, emergency exits, and signage present
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-fire-safety"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!form.watch('fireSafetyCompliant') && (
                  <FormField
                    control={form.control}
                    name="fireSafetyIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fire Safety Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe fire safety violations..."
                            {...field}
                            data-testid="textarea-fire-issues"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Structural Safety */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="structuralSafety"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Structural Safety</FormLabel>
                        <FormDescription>
                          Building structure is sound and safe
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-structural-safety"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!form.watch('structuralSafety') && (
                  <FormField
                    control={form.control}
                    name="structuralIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Structural Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe structural problems..."
                            {...field}
                            data-testid="textarea-structural-issues"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Cleanliness */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="cleanlinessStandard"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cleanliness Standard</FormLabel>
                        <FormDescription>
                          Property meets cleanliness and hygiene standards
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-cleanliness"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!form.watch('cleanlinessStandard') && (
                  <FormField
                    control={form.control}
                    name="cleanlinessIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cleanliness Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe cleanliness concerns..."
                            {...field}
                            data-testid="textarea-cleanliness-issues"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Overall Satisfaction */}
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
                              <div className="font-semibold">Approve</div>
                              <div className="text-xs text-muted-foreground">Ready for certificate</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="approve_with_conditions" id="conditions" />
                          <FormLabel htmlFor="conditions" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <div>
                              <div className="font-semibold">Approve with Conditions</div>
                              <div className="text-xs text-muted-foreground">Minor improvements needed</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="raise_objections" id="objections" />
                          <FormLabel htmlFor="objections" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <div>
                              <div className="font-semibold">Raise Objections</div>
                              <div className="text-xs text-muted-foreground">Significant issues found</div>
                            </div>
                          </FormLabel>
                        </div>

                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover-elevate">
                          <RadioGroupItem value="reject" id="reject" />
                          <FormLabel htmlFor="reject" className="flex items-center gap-2 font-normal cursor-pointer flex-1">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div>
                              <div className="font-semibold">Reject</div>
                              <div className="text-xs text-muted-foreground">Does not meet requirements</div>
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
                    <FormLabel>Additional Remarks</FormLabel>
                    <FormDescription>
                      Any other observations or comments
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Optional remarks..."
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
