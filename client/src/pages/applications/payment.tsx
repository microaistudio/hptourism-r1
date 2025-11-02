import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, CreditCard, QrCode, ArrowLeft, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import type { HomestayApplication, Payment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRCodeLib from "qrcode";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const UPI_ID = "subhash.thakur.india@oksbi"; // TEST MODE: Using test UPI ID for verification

  const { data: applicationData, isLoading: appLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });

  const { data: paymentData, isLoading: paymentLoading } = useQuery<{ payment: Payment | null }>({
    queryKey: ["/api/applications", id, "payment"],
    enabled: !!id,
  });

  const application = applicationData?.application;
  const existingPayment = paymentData?.payment;

  // Generate UPI QR Code
  useEffect(() => {
    if (application && application.totalFee) {
      const totalFee = parseFloat(application.totalFee);
      const upiString = `upi://pay?pa=${UPI_ID}&pn=HP%20Tourism&am=${totalFee}&cu=INR&tn=Homestay%20Registration%20${application.applicationNumber}`;
      
      QRCodeLib.toDataURL(upiString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url: string) => setQrCodeDataUrl(url))
        .catch((err: Error) => console.error('QR Code generation error:', err));
    }
  }, [application]);

  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/applications/${id}/payment`, {
        upiTransactionId: upiTransactionId.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "payment"] });
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for verification.",
      });
      setUpiTransactionId("");
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "Failed to submit payment. Please try again.",
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
    if (!upiTransactionId.trim()) {
      toast({
        title: "Transaction ID required",
        description: "Please enter the UPI Transaction ID",
        variant: "destructive",
      });
      return;
    }
    submitPaymentMutation.mutate();
  };

  if (appLoading || paymentLoading) {
    return (
      <div className="bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Application Not Found</CardTitle>
            <CardDescription>Unable to load application details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/dashboard")} data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (application.status !== "payment_pending") {
    return (
      <div className="bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Payment Not Required</CardTitle>
            <CardDescription>
              This application is not in payment pending status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation(`/applications/${id}`)} data-testid="button-back">
              Back to Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate fees (2025 Fee Structure)
  const category = application.category || 'silver';
  const totalRooms = parseInt(String(application.totalRooms || '0'));
  
  // Get fee breakdown from application (2025 structure) with null guards
  const baseFee = application.baseFee ? parseFloat(application.baseFee) : 0;
  const totalBeforeDiscounts = application.totalBeforeDiscounts ? parseFloat(application.totalBeforeDiscounts) : 0;
  const validityDiscount = application.validityDiscount ? parseFloat(application.validityDiscount) : 0;
  const femaleOwnerDiscount = application.femaleOwnerDiscount ? parseFloat(application.femaleOwnerDiscount) : 0;
  const pangiDiscount = application.pangiDiscount ? parseFloat(application.pangiDiscount) : 0;
  const totalDiscount = application.totalDiscount ? parseFloat(application.totalDiscount) : 0;
  const totalFee = application.totalFee ? parseFloat(application.totalFee) : 0;
  const certificateValidityYears = application.certificateValidityYears || 1;
  
  const hasDiscounts = validityDiscount > 0 || femaleOwnerDiscount > 0 || pangiDiscount > 0;
  
  // Check if fee data is missing (legacy applications)
  const hasFeeData = baseFee > 0 && totalFee > 0;

  const isPending = existingPayment?.paymentStatus === "pending_verification";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/dashboard")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
        <p className="text-muted-foreground">
          Application #{application.applicationNumber} - {application.propertyName}
        </p>
      </div>

      {isPending && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your payment is pending verification by district officer. You will be notified once verified.
          </AlertDescription>
        </Alert>
      )}

      {!hasFeeData && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Fee information is missing for this application. Please contact the tourism department for assistance.
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
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Category</span>
                <Badge variant="outline" className="uppercase">{category}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Rooms</span>
                <span>{totalRooms}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Certificate Validity</span>
                <span>{certificateValidityYears} {certificateValidityYears === 1 ? 'year' : 'years'}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm">Base Fee (Annual)</span>
                <span>₹{baseFee.toLocaleString('en-IN')}</span>
              </div>
              {certificateValidityYears > 1 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total ({certificateValidityYears} years)</span>
                  <span>₹{totalBeforeDiscounts.toLocaleString('en-IN')}</span>
                </div>
              )}
              {hasDiscounts && (
                <>
                  <Separator />
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">Discounts Applied:</div>
                  {validityDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">3-year lump sum (10%)</span>
                      <span className="text-green-600 dark:text-green-400">-₹{validityDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {femaleOwnerDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Female owner (5%)</span>
                      <span className="text-green-600 dark:text-green-400">-₹{femaleOwnerDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {pangiDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pangi sub-division (50%)</span>
                      <span className="text-green-600 dark:text-green-400">-₹{pangiDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-lg text-primary">₹{totalFee.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                💡 GST (18%) is already included in the fees
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
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="UPI Payment QR Code" 
                    className="w-48 h-48"
                    data-testid="img-upi-qr"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-primary" />
                  </div>
                )}
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
    </div>
  );
}
