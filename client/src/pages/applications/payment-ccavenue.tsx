import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle, Landmark, Globe, Shield, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { useState } from "react";

export default function PaymentCCAvenue() {
  const [, params] = useRoute("/applications/:id/payment-ccavenue");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: applicationData, isLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  const application = applicationData?.application;

  if (!application) {
    return <div>Application not found</div>;
  }

  const handleCCAvenuePayment = async () => {
    setIsProcessing(true);
    // TODO: Integrate with CCAvenue API
    console.log("Initiating CCAvenue payment...");
    
    alert("CCAvenue integration pending. Please provide CCAvenue merchant credentials to enable this payment method.");
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/applications/${id}/payment-gateway`)}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeftCircle className="h-4 w-4 mr-2" />
            Back to Payment Methods
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <Landmark className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">CCAvenue Payment</h1>
              <p className="text-muted-foreground">
                Trusted by government portals and banks across India
              </p>
            </div>
          </div>
        </div>

        {/* Test Mode Alert */}
        <Alert className="mb-6 border-yellow-500 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-500">
            <strong>Test Mode:</strong> CCAvenue integration requires merchant credentials. 
            Please contact HP Tourism Department to enable live payments.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Application Number</span>
                    <span className="font-medium">{application.applicationNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property Name</span>
                    <span className="font-medium">{application.propertyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="secondary" className="capitalize">
                      {application.category}
                    </Badge>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">₹{parseFloat(application.totalFee).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CCAvenue Features */}
            <Card>
              <CardHeader>
                <CardTitle>Why CCAvenue?</CardTitle>
                <CardDescription>Most comprehensive payment gateway in India</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">200+ Payment Options</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All cards, banks, wallets, and UPI apps
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">18 Languages</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Multi-language checkout support
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Landmark className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Govt Trusted</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Used by banks and utilities
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Since 2001</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Longest track record in India
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCCAvenuePayment}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                  data-testid="button-pay-ccavenue"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Landmark className="h-4 w-4 mr-2" />
                      Pay ₹{parseFloat(application.totalFee).toLocaleString('en-IN')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Security */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>RBI Approved Gateway</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>PCI-DSS Compliant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>256-bit Encryption</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Fraud Prevention (F.R.I.S.K.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>3D Secure Auth</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Support</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-2">
                  All major Indian and international cards accepted
                </p>
                <p className="mb-2">
                  6 card types including eZeClick
                </p>
                <p>
                  27 international currencies supported
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8">
          <Alert>
            <AlertDescription>
              You will be redirected to CCAvenue's secure payment page. After successful payment, you'll return here automatically.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
