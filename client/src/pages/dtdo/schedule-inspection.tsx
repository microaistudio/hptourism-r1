import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Loader2,
  ArrowLeft,
  ClipboardCheck,
  AlertCircle,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { HomestayApplication } from "@shared/schema";

interface ApplicationData {
  application: HomestayApplication;
  owner: {
    fullName: string;
    mobile: string;
    email?: string;
  };
}

interface DealingAssistant {
  id: string;
  fullName: string;
  mobile: string;
}

export default function DTDOScheduleInspection() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [inspectionDate, setInspectionDate] = useState("");
  const [assignedDA, setAssignedDA] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const { data, isLoading } = useQuery<ApplicationData>({
    queryKey: ["/api/dtdo/applications", id],
  });

  const { data: dasData } = useQuery<{ das: DealingAssistant[] }>({
    queryKey: ["/api/dtdo/available-das"],
  });

  const scheduleInspectionMutation = useMutation({
    mutationFn: async (data: {
      applicationId: string;
      inspectionDate: string;
      assignedTo: string;
      specialInstructions: string;
    }) => {
      const response = await apiRequest("POST", "/api/dtdo/schedule-inspection", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dtdo/applications"] });
      toast({
        title: "Inspection Scheduled",
        description: "The inspection order has been assigned to the DA successfully.",
      });
      setLocation("/dtdo/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule inspection. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Not Found</h3>
            <Button onClick={() => setLocation("/dtdo/dashboard")} className="mt-4" data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { application, owner } = data;

  const handleSchedule = () => {
    if (!inspectionDate) {
      toast({
        title: "Validation Error",
        description: "Please select an inspection date",
        variant: "destructive",
      });
      return;
    }

    if (!assignedDA) {
      toast({
        title: "Validation Error",
        description: "Please select a Dealing Assistant",
        variant: "destructive",
      });
      return;
    }

    // Ensure date is in the future
    const selectedDate = new Date(inspectionDate);
    if (selectedDate < new Date()) {
      toast({
        title: "Validation Error",
        description: "Inspection date must be in the future",
        variant: "destructive",
      });
      return;
    }

    scheduleInspectionMutation.mutate({
      applicationId: id!,
      inspectionDate,
      assignedTo: assignedDA,
      specialInstructions,
    });
  };

  const availableDAs = dasData?.das || [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = format(tomorrow, "yyyy-MM-dd");
  const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dtdo/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Inspection</h1>
          <p className="text-muted-foreground mt-1">
            Assign inspection order to a Dealing Assistant
          </p>
        </div>
      </div>

      {/* Application Summary */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <ClipboardCheck className="h-5 w-5" />
            Application Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Application Number</div>
              <div className="font-medium">{application.applicationNumber}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Property Name</div>
              <div className="font-medium">{application.propertyName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Owner</div>
              <div className="font-medium">{owner.fullName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Address</div>
              <div className="font-medium">{application.address}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Scheduling Form */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
          <CardDescription>
            Schedule the site inspection and assign a Dealing Assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inspectionDate" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Inspection Date
            </Label>
            <Input
              id="inspectionDate"
              type="datetime-local"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              min={minDate}
              step={FIFTEEN_MINUTES_IN_SECONDS}
              data-testid="input-inspection-date"
            />
            <p className="text-xs text-muted-foreground">
              Select date and time for the property inspection. Time picks move in 15‑minute blocks (00, 15, 30, 45) to match field visits.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedDA" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Assign to Dealing Assistant
            </Label>
            <Select value={assignedDA} onValueChange={setAssignedDA}>
              <SelectTrigger id="assignedDA" data-testid="select-da">
                <SelectValue placeholder="Select a DA" />
              </SelectTrigger>
              <SelectContent>
                {availableDAs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No DAs available in this district
                  </div>
                ) : (
                  availableDAs.map((da) => (
                    <SelectItem key={da.id} value={da.id}>
                      {da.fullName} - {da.mobile}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any specific instructions for the DA conducting the inspection..."
              rows={4}
              data-testid="textarea-instructions"
            />
            <p className="text-xs text-muted-foreground">
              Provide any specific areas to focus on or documents to verify
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSchedule}
              disabled={scheduleInspectionMutation.isPending || !inspectionDate || !assignedDA}
              data-testid="button-schedule"
            >
              {scheduleInspectionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Schedule Inspection
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/dtdo/dashboard")}
              disabled={scheduleInspectionMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
