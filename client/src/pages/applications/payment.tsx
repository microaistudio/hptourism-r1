import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, CreditCard, QrCode, ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { HomestayApplication, Payment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [copied, setCopied] = useState(false);

  const UPI_ID = "subhash.thakur.india@oksbi";

  const { data: applicationData, isLoading: appLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });

  const application = applicationData?.application;

  const { data: paymentsData } = useQuery<{ payments: Payment[] }>({
    queryKey: ["/api/applications", id, "payments"],
    enabled: !!id,
  });

  const existingPayment = paymentsData?.payments?.[0];

  const submitPaymentMutation = useMutation({
    mutationFn: async (data: { upiTransactionId: string }) => {
      if (existingPayment) {
        return apiRequest("PATCH", `/api/payments/${existingPayment.id}`, {
          gatewayTransactionId: data.upiTransactionId,
          paymentMethod: "upi",
          paymentStatus: "pending_verification",
        });
      } else {
        return apiRequest("POST", "/api/payments", {
          applicationId: id,
          paymentType: "registration",
          amount: application?.totalFee,
          gatewayTransactionId: data.upiTransactionId,
          paymentMethod: "upi",
          paymentStatus: "pending_verification",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Payment Submitted",
        description: "Your payment details have been submitted for verification by the officer.",
      });
      setLocation(`/dashboard`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit payment details",
        variant: "destructive",
      });
    },
  });

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    });
  };

  const handleSubmitPayment = () => {
    if (!upiTransactionId || upiTransactionId.trim().length < 10) {
      toast({
        title: "Invalid Transaction ID",
        description: "Please enter a valid UPI transaction ID (at least 10 characters)",
        variant: "destructive",
      });
      return;
    }

    submitPaymentMutation.mutate({ upiTransactionId: upiTransactionId.trim() });
  };

  if (appLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">Loading payment details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!application || application.status !== "payment_pending") {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This application is not in payment pending status or does not exist.
          </AlertDescription>
        </Alert>
        <Button onClick={() => setLocation("/dashboard")} className="mt-4" data-testid="button-back-dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const baseFee = parseFloat(application.baseFee);
  const perRoomFee = parseFloat(application.perRoomFee);
  const totalRoomsFee = perRoomFee * application.totalRooms;
  const subtotal = baseFee + totalRoomsFee;
  const gstAmount = parseFloat(application.gstAmount);
  const totalFee = parseFloat(application.totalFee);

  const isPending = existingPayment?.paymentStatus === "pending_verification";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/dashboard")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Complete Payment</h1>
          <p className="text-muted-foreground mt-2">
            Application #{application.applicationNumber} - {application.propertyName}
          </p>
        </div>

        {isPending && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your payment is pending verification by the officer. Transaction ID: <strong>{existingPayment.gatewayTransactionId}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Fee Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Fee Breakdown
              </CardTitle>
              <CardDescription>Registration fee calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="outline" className="uppercase">
                    {application.category}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Rooms</span>
                  <span className="font-medium">{application.totalRooms}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Base Fee</span>
                  <span>₹{baseFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Per Room Fee ({application.totalRooms} × ₹{perRoomFee.toLocaleString('en-IN')})</span>
                  <span>₹{totalRoomsFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">GST (18%)</span>
                  <span>₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Amount</span>
                  <span className="font-bold text-lg text-primary">₹{totalFee.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Payment Instructions
              </CardTitle>
              <CardDescription>Complete payment via UPI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <div className="text-sm font-medium mb-2">Scan QR Code or Use UPI ID</div>
                <div className="bg-white p-4 rounded-lg inline-block mb-3">
                  {/* UPI QR Code - In production, generate actual QR code */}
                  <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 mx-auto text-primary mb-2" />
                      <div className="text-xs font-mono break-all px-2">{UPI_ID}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 bg-white p-2 rounded border">
                  <code className="text-sm font-mono">{UPI_ID}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyUPI}
                    className="h-6 w-6"
                    data-testid="button-copy-upi"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Scan the QR code or copy UPI ID</li>
                    <li>Pay ₹{totalFee.toLocaleString('en-IN')} from your UPI app</li>
                    <li>Copy the UPI Transaction ID</li>
                    <li>Enter it below and submit</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="upi-txn-id">UPI Transaction ID *</Label>
                <Input
                  id="upi-txn-id"
                  placeholder="e.g., 123456789012"
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value)}
                  disabled={isPending}
                  data-testid="input-upi-transaction-id"
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your UPI app after successful payment
                </p>
              </div>

              <Button
                onClick={handleSubmitPayment}
                disabled={submitPaymentMutation.isPending || !upiTransactionId.trim() || isPending}
                className="w-full"
                data-testid="button-submit-payment"
              >
                {submitPaymentMutation.isPending ? "Submitting..." : isPending ? "Payment Pending Verification" : "I Have Completed Payment"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            After submitting your payment details, an officer will verify the transaction and approve your application. 
            You will receive your registration certificate once payment is confirmed.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
