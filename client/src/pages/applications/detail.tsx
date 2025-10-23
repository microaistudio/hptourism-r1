import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, CheckCircle2, XCircle, Building2, User, MapPin, Phone, Mail, Bed, IndianRupee, Calendar, FileText } from "lucide-react";
import type { HomestayApplication, User as UserType } from "@shared/schema";
import { useState } from "react";

export default function ApplicationDetail() {
  const [, params] = useRoute("/applications/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [officerComments, setOfficerComments] = useState("");

  const applicationId = params?.id;

  const { data: userData } = useQuery<{ user: UserType }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: applicationData, isLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", applicationId],
    enabled: !!applicationId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ action, comments }: { action: "approve" | "reject"; comments: string }) => {
      const response = await apiRequest("POST", `/api/applications/${applicationId}/review`, {
        action,
        comments,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: variables.action === "approve" ? "Application Approved" : "Application Rejected",
        description: `The application has been ${variables.action}d successfully.`,
      });
      setOfficerComments("");
    },
    onError: () => {
      toast({
        title: "Review failed",
        description: "Failed to process review. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!applicationData?.application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Application Not Found</CardTitle>
            <CardDescription>The application you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const app = applicationData.application;
  const user = userData?.user;
  const isDistrictOfficer = user?.role === "district_officer";
  const isStateOfficer = user?.role === "state_officer";
  
  // District officers can review pending applications
  // State officers can review applications in state_review status
  const canReview = (isDistrictOfficer && app.status === "pending") || 
                    (isStateOfficer && app.status === "state_review");

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: "Draft", variant: "outline" as const },
      pending: { label: "District Review", variant: "secondary" as const },
      state_review: { label: "State Review", variant: "secondary" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
    };
    return config[status as keyof typeof config] || config.draft;
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      diamond: { label: "Diamond", variant: "default" as const },
      gold: { label: "Gold", variant: "secondary" as const },
      silver: { label: "Silver", variant: "outline" as const },
    };
    return config[category as keyof typeof config];
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Application Details</h1>
              <p className="text-sm text-muted-foreground">{app.applicationNumber || `Application #${app.id.slice(0, 8)}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge {...getStatusBadge(app.status || 'draft')} data-testid="badge-status">
              {getStatusBadge(app.status || 'draft').label}
            </Badge>
            <Badge {...getCategoryBadge(app.category || 'silver')} data-testid="badge-category">
              {getCategoryBadge(app.category || 'silver').label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle>Property Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Property Name</Label>
                  <p className="text-lg font-medium" data-testid="text-property-name">{app.propertyName}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p data-testid="text-address">{app.address}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">District</Label>
                    <p className="flex items-center gap-2" data-testid="text-district">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {app.district}
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">PIN Code</Label>
                    <p data-testid="text-pincode">{app.pincode}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Rooms</Label>
                    <p className="flex items-center gap-2" data-testid="text-rooms">
                      <Bed className="w-4 h-4 text-muted-foreground" />
                      {app.totalRooms} rooms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>Owner Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p data-testid="text-owner-name">{app.ownerName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mobile Number</Label>
                    <p className="flex items-center gap-2" data-testid="text-owner-mobile">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {app.ownerMobile}
                    </p>
                  </div>
                </div>
                {app.ownerEmail && (
                  <div>
                    <Label className="text-muted-foreground">Email Address</Label>
                    <p className="flex items-center gap-2" data-testid="text-owner-email">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {app.ownerEmail}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Aadhaar Number</Label>
                  <p data-testid="text-owner-aadhaar">{app.ownerAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {app.amenities && typeof app.amenities === 'object' && Object.keys(app.amenities).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Amenities & Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(app.amenities)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Officer Review Section */}
            {canReview && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Application</CardTitle>
                  <CardDescription>
                    {isDistrictOfficer 
                      ? "As a District Officer, you can approve (forwards to State review) or reject this application"
                      : "As a State Officer, you can grant final approval or reject this application"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="comments">Officer Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Add your review comments here..."
                      value={officerComments}
                      onChange={(e) => setOfficerComments(e.target.value)}
                      className="mt-2"
                      rows={4}
                      data-testid="input-officer-comments"
                    />
                  </div>
                  <div className="flex gap-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          className="flex-1"
                          disabled={reviewMutation.isPending}
                          data-testid="button-approve-trigger"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve Application
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isDistrictOfficer ? (
                              <>This will approve the homestay application for <strong>{app.propertyName}</strong> and forward it to State Tourism for final review.</>
                            ) : (
                              <>This will grant final approval to <strong>{app.propertyName}</strong>. The property will be listed on the public portal.</>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-approve">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => reviewMutation.mutate({ action: "approve", comments: officerComments })}
                            data-testid="button-confirm-approve"
                          >
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={reviewMutation.isPending}
                          data-testid="button-reject-trigger"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Application
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reject the homestay application for <strong>{app.propertyName}</strong>. 
                            Please ensure you've added comments explaining the rejection.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-reject">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => reviewMutation.mutate({ action: "reject", comments: officerComments })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-reject"
                          >
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Fee Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  <CardTitle>Fee Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Fee</span>
                  <span data-testid="text-base-fee">₹{Number(app.baseFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per Room Fee ({app.totalRooms} rooms)</span>
                  <span data-testid="text-room-fee">₹{(Number(app.perRoomFee) * app.totalRooms).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span data-testid="text-gst">₹{Number(app.gstAmount).toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t flex justify-between font-semibold">
                  <span>Total Fee</span>
                  <span className="text-primary" data-testid="text-total">₹{Number(app.totalFee).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle>Timeline</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Submitted</Label>
                  <p className="text-sm" data-testid="text-submitted-date">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
                {app.updatedAt && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Last Updated</Label>
                    <p className="text-sm" data-testid="text-updated-date">
                      {new Date(app.updatedAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(app.districtNotes || app.stateNotes) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle>Officer Comments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {app.districtNotes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">District Officer</Label>
                      <p className="text-sm" data-testid="text-district-notes">{app.districtNotes}</p>
                    </div>
                  )}
                  {app.stateNotes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">State Officer</Label>
                      <p className="text-sm" data-testid="text-state-notes">{app.stateNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
