import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, CreditCard, ArrowLeft, ShieldCheck, Building2, Smartphone, Banknote, Landmark } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import type { HomestayApplication } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HimKoshPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [paymentData, setPaymentData] = useState<{
    paymentUrl: string;
    merchantCode: string;
    encdata: string;
    appRefNo: string;
    totalAmount: number;
    isConfigured: boolean;
  } | null>(null);

  const { data: applicationData, isLoading: appLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });

  const application = applicationData?.application;

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/himkosh/initiate", {
        applicationId: id,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('[himkosh-frontend] Received payment data:', data);
      console.log('[himkosh-frontend] isConfigured:', data.isConfigured, typeof data.isConfigured);
      setPaymentData(data);
      
      if (!data.isConfigured) {
        toast({
          title: "Test Mode",
          description: "HimKosh integration is using test configuration. Awaiting CTP credentials.",
          variant: "default",
        });
      } else {
        console.log('[himkosh-frontend] Configuration valid - will auto-redirect to HimKosh portal');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  // Auto-submit form when payment data is ready
  useEffect(() => {
    console.log('[himkosh-frontend] useEffect triggered:', {
      hasPaymentData: !!paymentData,
      hasFormRef: !!formRef.current,
      isConfigured: paymentData?.isConfigured,
    });
    
    if (paymentData && formRef.current && paymentData.isConfigured) {
      console.log('[himkosh-frontend] Auto-submitting form to HimKosh portal...');
      formRef.current.submit();
    }
  }, [paymentData]);

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

  if (!application || (application.status !== "payment_pending" && application.status !== "verified_for_payment")) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This application is not ready for payment or does not exist.
          </AlertDescription>
        </Alert>
        <Button onClick={() => setLocation("/dashboard")} className="mt-4" data-testid="button-back-dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // 2025 Fee Structure - All fees are pre-calculated and stored
  const baseFee = parseFloat(application.baseFee || '0');
  const totalBeforeDiscounts = parseFloat(application.totalBeforeDiscounts || '0');
  const validityDiscount = parseFloat(application.validityDiscount || '0');
  const femaleOwnerDiscount = parseFloat(application.femaleOwnerDiscount || '0');
  const pangiDiscount = parseFloat(application.pangiDiscount || '0');
  const totalDiscount = parseFloat(application.totalDiscount || '0');
  const totalFee = parseFloat(application.totalFee || '0');
  const certificateValidityYears = application.certificateValidityYears || 1;
  
  const hasDiscounts = totalDiscount > 0;

  return (
    <div className="bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation("/dashboard")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Complete Payment via HimKosh</h1>
          <p className="text-muted-foreground mt-2">
            Application #{application.applicationNumber} - {application.propertyName}
          </p>
        </div>

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
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Certificate Validity</span>
                  <Badge variant="secondary">{certificateValidityYears} {certificateValidityYears === 1 ? 'Year' : 'Years'}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Base Fee (Annual)</span>
                  <span>₹{baseFee.toLocaleString('en-IN')}</span>
                </div>
                {certificateValidityYears > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total for {certificateValidityYears} Years</span>
                    <span>₹{totalBeforeDiscounts.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {hasDiscounts && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs font-medium text-muted-foreground">Discounts Applied:</div>
                    {validityDiscount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">3-Year Lump Sum (10%)</span>
                        <span>-₹{validityDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {femaleOwnerDiscount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">Female Owner (5%)</span>
                        <span>-₹{femaleOwnerDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {pangiDiscount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">Pangi Sub-Division (50%)</span>
                        <span>-₹{pangiDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-medium text-green-600">
                      <span className="text-sm">Total Savings</span>
                      <span>-₹{totalDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Amount</span>
                  <span className="font-bold text-lg text-primary">₹{totalFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  * GST included in the fee (HP Homestay Rules 2025)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HimKosh Payment Gateway */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Government Payment Gateway
              </CardTitle>
              <CardDescription>Secure payment via HimKosh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-lg border border-teal-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-3 rounded-full">
                    <ShieldCheck className="h-8 w-8 text-teal-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-teal-900">HimKosh</div>
                    <div className="text-sm text-teal-700">HP Cyber Treasury Portal</div>
                  </div>
                </div>
                <p className="text-sm text-teal-800 mb-4">
                  Official payment gateway of Himachal Pradesh Government for secure online transactions.
                </p>
                
                {/* Payment Methods Supported */}
                <div className="bg-white rounded-lg p-4 border border-teal-100">
                  <div className="text-xs font-medium text-teal-900 mb-3">Payment Methods Available on HimKosh:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-xs text-teal-800">
                      <CreditCard className="h-4 w-4 text-teal-600" />
                      <span>Credit/Debit Cards</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-teal-800">
                      <Smartphone className="h-4 w-4 text-teal-600" />
                      <span>UPI (GPay, PhonePe)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-teal-800">
                      <Landmark className="h-4 w-4 text-teal-600" />
                      <span>Net Banking</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-teal-800">
                      <Banknote className="h-4 w-4 text-teal-600" />
                      <span>Wallets & More</span>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium text-sm mb-2">How it works:</div>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click "Proceed to Payment" below</li>
                    <li>You'll be redirected to HimKosh portal</li>
                    <li>Choose your payment method (Card/UPI/Net Banking)</li>
                    <li>Complete payment and return for certificate</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {!paymentData && (
                <Button
                  onClick={() => initiateMutation.mutate()}
                  disabled={initiateMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-initiate-payment"
                >
                  {initiateMutation.isPending ? "Initiating..." : "Proceed to Payment"}
                </Button>
              )}

              {paymentData && !paymentData.isConfigured && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 space-y-2">
                    <p className="font-medium">Test Mode: Awaiting CTP Credentials</p>
                    <p className="text-sm">Payment initiated with test configuration. Transaction ID: <span className="font-mono">{paymentData.appRefNo}</span></p>
                    <p className="text-xs">Contact CTP team to obtain production credentials for live payments.</p>
                  </AlertDescription>
                </Alert>
              )}

              {paymentData && paymentData.isConfigured && (
                <div className="text-center text-sm text-muted-foreground">
                  Redirecting to HimKosh payment gateway...
                </div>
              )}

              {/* Hidden form for HimKosh POST */}
              {paymentData && (
                <form
                  ref={formRef}
                  method="POST"
                  action={paymentData.paymentUrl}
                  className="hidden"
                >
                  {/* CORRECT FORMAT: Only encdata and merchant_code (checksum is inside encrypted data) */}
                  <input type="hidden" name="encdata" value={paymentData.encdata} />
                  <input type="hidden" name="merchant_code" value={paymentData.merchantCode} />
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your payment is secured by HP Government's Cyber Treasury Portal. After successful payment, 
            your certificate will be automatically generated and available for download.
          </AlertDescription>
        </Alert>
        </div>
      </div>
    </div>
  );
}
