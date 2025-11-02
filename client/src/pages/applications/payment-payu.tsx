import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle, Wallet, Zap, Shield, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { useState } from "react";

export default function PaymentPayU() {
  const [, params] = useRoute("/applications/:id/payment-payu");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: applicationData, isLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
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

  const handlePayUPayment = async () => {
    setIsProcessing(true);
    // TODO: Integrate with PayU API
    console.log("Initiating PayU payment...");
    
    alert("PayU integration pending. Please provide PayU merchant credentials to enable this payment method.");
    setIsProcessing(false);
  };

  return (
    <div className="bg-background">
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
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">PayU Payment</h1>
              <p className="text-muted-foreground">
                Enterprise-grade payment gateway with smart routing
              </p>
            </div>
          </div>
        </div>

        {/* Test Mode Alert */}
        <Alert className="mb-6 border-yellow-500 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-500">
            <strong>Test Mode:</strong> PayU integration requires merchant credentials. 
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
                      <span className="text-primary">₹{parseFloat(application.totalFee || '0').toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PayU Features */}
            <Card>
              <CardHeader>
                <CardTitle>Why PayU?</CardTitle>
                <CardDescription>Smart routing for high success rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Smart Routing</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher success rates in Tier-2/3 cities
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">150+ Payment Modes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cards, UPI, wallets, EMI, QR codes
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">500,000+ Merchants</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Trusted by enterprises & NBFCs
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Instant Refunds</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quick refund processing
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handlePayUPayment}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                  data-testid="button-pay-payu"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Pay ₹{parseFloat(application.totalFee || '0').toLocaleString('en-IN')}
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
                    <span>PCI-DSS Level 1 Compliant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Advanced Fraud Prevention</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Native OTP Feature</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>100+ Currency Support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Fee</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-2">
                  2% + GST for domestic cards/UPI
                </p>
                <p className="mb-2">
                  3% + GST for international cards
                </p>
                <p>
                  Competitive rates for high-volume merchants
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8">
          <Alert>
            <AlertDescription>
              PayU's smart routing engine ensures the highest success rate for your payment, especially in tier-2 and tier-3 cities.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
