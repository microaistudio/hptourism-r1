import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle, CreditCard, Smartphone, Building2, Wallet, AlertCircle, Shield, CheckCircle } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";
import { useState } from "react";

export default function PaymentRazorpay() {
  const [, params] = useRoute("/applications/:id/payment-razorpay");
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

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    // TODO: Integrate with Razorpay API
    // Will implement after getting Razorpay credentials
    console.log("Initiating Razorpay payment...");
    
    // Placeholder for Razorpay integration
    alert("Razorpay integration pending. Please provide Razorpay API credentials to enable this payment method.");
    setIsProcessing(false);
  };

  const paymentMethods = [
    {
      icon: CreditCard,
      title: 'Credit/Debit Cards',
      description: 'Visa, Mastercard, RuPay, Amex, Diners',
    },
    {
      icon: Smartphone,
      title: 'UPI',
      description: 'GPay, PhonePe, Paytm, BHIM, etc.',
    },
    {
      icon: Building2,
      title: 'Net Banking',
      description: '58+ banks supported',
    },
    {
      icon: Wallet,
      title: 'Wallets',
      description: 'Paytm, PhonePe, Mobikwik, etc.',
    },
  ];

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
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Razorpay Payment</h1>
              <p className="text-muted-foreground">
                Pay using cards, UPI, net banking, or wallets
              </p>
            </div>
          </div>
        </div>

        {/* Test Mode Alert */}
        <Alert className="mb-6 border-yellow-500 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-500">
            <strong>Test Mode:</strong> Razorpay integration requires API credentials. 
            Please contact HP Tourism Department to enable live payments.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Payment Methods */}
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

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Choose Payment Method</CardTitle>
                <CardDescription>Select from 100+ payment options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.title} className="p-4 border rounded-lg hover-elevate">
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">{method.title}</p>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={handleRazorpayPayment}
                  disabled={isProcessing}
                  className="w-full mt-6"
                  size="lg"
                  data-testid="button-pay-razorpay"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay ₹{parseFloat(application.totalFee || '0').toLocaleString('en-IN')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Security Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Secure Payment</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>RBI Approved Payment Aggregator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>PCI-DSS Level 1 Compliant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>128-bit SSL Encryption</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>3D Secure Authentication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Instant Payment Confirmation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Fee</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  2% + GST convenience fee applies for card payments. 
                  UPI and net banking have lower fees.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8">
          <Alert>
            <AlertDescription>
              After successful payment, your homestay certificate will be generated automatically and sent to your registered email.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
