import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { HomestayApplication, Document } from "@shared/schema";

interface ApplicationDetailResponse {
  application: HomestayApplication;
  owner: {
    fullName: string;
    mobile: string;
    email?: string;
  } | null;
  documents: Document[];
}

export default function DAApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  if (!id) {
    setLocation("/da/dashboard");
    return null;
  }
  
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery<ApplicationDetailResponse>({
    queryKey: ["/api/da/applications", id],
  });

  const startScrutinyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/start-scrutiny`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
      toast({
        title: "Scrutiny Started",
        description: "Application is now under scrutiny",
      });
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/forward-to-dtdo`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
      toast({
        title: "Application Forwarded",
        description: "Application has been sent to DTDO for review",
      });
      setLocation("/da/dashboard");
    },
  });

  const sendBackMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/da/applications/${id}/send-back`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
      toast({
        title: "Application Sent Back",
        description: "Application has been returned to the applicant",
      });
      setLocation("/da/dashboard");
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data?.application) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Application not found</p>
        </div>
      </div>
    );
  }

  const { application, owner, documents } = data;

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, string> = {
      diamond: "bg-blue-50 dark:bg-blue-950/20",
      gold: "bg-yellow-50 dark:bg-yellow-950/20",
      silver: "bg-gray-50 dark:bg-gray-950/20",
    };
    const variant = variants[category?.toLowerCase()] || variants.silver;
    return <Badge variant="outline" className={`${variant} capitalize`}>{category}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      submitted: "bg-blue-50 dark:bg-blue-950/20",
      under_scrutiny: "bg-orange-50 dark:bg-orange-950/20",
      forwarded_to_dtdo: "bg-green-50 dark:bg-green-950/20",
      reverted_to_applicant: "bg-red-50 dark:bg-red-950/20",
    };
    const variant = variants[status] || "";
    return <Badge variant="outline" className={variant}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const canStartScrutiny = application.status === 'submitted';
  const canTakeAction = application.status === 'under_scrutiny';

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation("/da/dashboard")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{application.propertyName}</h1>
          <div className="flex gap-2">
            {getCategoryBadge(application.category || 'silver')}
            {getStatusBadge(application.status)}
          </div>
        </div>
        <p className="text-muted-foreground">Application ID: {application.id}</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        {canStartScrutiny && (
          <Button
            onClick={() => startScrutinyMutation.mutate()}
            disabled={startScrutinyMutation.isPending}
            data-testid="button-start-scrutiny"
          >
            {startScrutinyMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Scrutiny
          </Button>
        )}
        
        {canTakeAction && (
          <>
            <Button
              onClick={() => setForwardDialogOpen(true)}
              disabled={forwardMutation.isPending}
              data-testid="button-forward-dtdo"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Forward to DTDO
            </Button>
            <Button
              variant="destructive"
              onClick={() => setSendBackDialogOpen(true)}
              disabled={sendBackMutation.isPending}
              data-testid="button-send-back"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Send Back to Applicant
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Property Name" value={application.propertyName} />
            <DetailRow label="Address" value={application.address} />
            <DetailRow label="District" value={application.district} />
            <DetailRow label="Pin Code" value={application.pincode} />
            <DetailRow label="Location Type" value={application.locationType} />
            <DetailRow label="Telephone" value={application.telephone || "N/A"} />
            <DetailRow label="Category" value={application.category} />
            <DetailRow label="Project Type" value={application.projectType || "N/A"} />
            <DetailRow label="Property Area (sq m)" value={application.propertyArea?.toString() || "N/A"} />
          </CardContent>
        </Card>

        {/* Owner Details */}
        <Card>
          <CardHeader>
            <CardTitle>Owner Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Owner Name" value={owner?.fullName || "N/A"} />
            <DetailRow label="Mobile" value={owner?.mobile || "N/A"} />
            <DetailRow label="Email" value={owner?.email || "N/A"} />
          </CardContent>
        </Card>

        {/* Room Details */}
        <Card>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Single Bed Rooms" value={application.singleBedRooms?.toString() || "0"} />
            <DetailRow label="Double Bed Rooms" value={application.doubleBedRooms?.toString() || "0"} />
            <DetailRow label="Total Rooms" value={application.totalRooms?.toString() || "0"} />
            <DetailRow label="Proposed Room Rate (₹)" value={application.proposedRoomRate?.toString() || "N/A"} />
            <DetailRow label="GSTIN" value={application.gstin || "Not Provided"} />
          </CardContent>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader>
            <CardTitle>Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Base Fee (₹)" value={application.baseFee?.toString() || "N/A"} />
            <DetailRow label="Per Room Fee (₹)" value={application.perRoomFee?.toString() || "N/A"} />
            <DetailRow label="GST (₹)" value={application.gstAmount?.toString() || "N/A"} />
            <DetailRow label="Total Fee (₹)" value={application.totalFee?.toString() || "N/A"} />
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>ANNEXURE-II Documents ({documents.length})</CardTitle>
          <CardDescription>Required documents uploaded by the applicant</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forward to DTDO Dialog */}
      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward to DTDO</DialogTitle>
            <DialogDescription>
              Add your scrutiny remarks before forwarding this application to the District Tourism Development Officer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="remarks">Scrutiny Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Enter any observations or recommendations..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                data-testid="textarea-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => forwardMutation.mutate()}
              disabled={forwardMutation.isPending}
              data-testid="button-confirm-forward"
            >
              {forwardMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Forward to DTDO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back to Applicant</DialogTitle>
            <DialogDescription>
              Specify what corrections or additional information is required from the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Sending Back *</Label>
              <Textarea
                id="reason"
                placeholder="Please specify the corrections needed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                data-testid="textarea-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendBackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => sendBackMutation.mutate()}
              disabled={sendBackMutation.isPending || !reason.trim()}
              data-testid="button-confirm-send-back"
            >
              {sendBackMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value || "N/A"}</span>
    </div>
  );
}

function AmenityBadge({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-400" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function DocumentRow({ document }: { document: Document }) {
  const getDocIcon = () => {
    if (document.documentType.includes('photo') || document.fileName.match(/\.(jpg|jpeg|png)$/i)) {
      return <Eye className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          {getDocIcon()}
        </div>
        <div>
          <p className="font-medium text-sm">{document.documentType.replace(/_/g, ' ')}</p>
          <p className="text-xs text-muted-foreground">{document.fileName}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" data-testid={`button-download-${document.id}`}>
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
