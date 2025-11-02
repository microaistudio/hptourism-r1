import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftCircle, CreditCard, QrCode, Building2, Landmark, Wallet } from "lucide-react";
import type { HomestayApplication } from "@shared/schema";

export default function PaymentGatewaySelect() {
  const [, params] = useRoute("/applications/:id/payment-gateway");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const { data: applicationData, isLoading } = useQuery<{ application: HomestayApplication }>({
    queryKey: ["/api/applications", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  const application = applicationData?.application;

  if (!application) {
    return <div>Application not found</div>;
  }

  const paymentGateways = [
    {
      id: 'himkosh',
      name: 'HimKosh (HP CTP)',
      description: 'HP Government Cyber Treasury Portal - Official government payment gateway',
      icon: Building2,
      badge: 'Recommended',
      badgeVariant: 'default' as const,
      features: ['Government Portal', 'Direct to HP Treasury', 'Secure Encryption', 'Official Receipt'],
      route: `/applications/${id}/payment-himkosh`,
    },
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Credit/Debit Cards, UPI, Net Banking, Wallets - 100+ payment options',
      icon: CreditCard,
      badge: 'Popular',
      badgeVariant: 'secondary' as const,
      features: ['All Cards (Visa, Mastercard, RuPay)', 'UPI (GPay, PhonePe)', 'Net Banking (58+ banks)', 'Wallets (Paytm, etc.)'],
      route: `/applications/${id}/payment-razorpay`,
    },
    {
      id: 'ccavenue',
      name: 'CCAvenue',
      description: 'Comprehensive payment gateway with 200+ payment options',
      icon: Landmark,
      badge: 'Govt Trusted',
      badgeVariant: 'outline' as const,
      features: ['200+ Payment Options', '18 Languages', 'Government Portals', 'International Cards'],
      route: `/applications/${id}/payment-ccavenue`,
    },
    {
      id: 'payu',
      name: 'PayU',
      description: 'Enterprise payment gateway with smart routing for high success rates',
      icon: Wallet,
      badge: 'Enterprise',
      badgeVariant: 'outline' as const,
      features: ['150+ Payment Modes', 'Smart Routing', 'High Success Rate', 'Instant Refunds'],
      route: `/applications/${id}/payment-payu`,
    },
    {
      id: 'upi_qr',
      name: 'UPI QR Code',
      description: 'Scan & pay using any UPI app - Manual verification required',
      icon: QrCode,
      badge: 'Simple',
      badgeVariant: 'outline' as const,
      features: ['All UPI Apps', 'No Registration', 'Instant Payment', 'Manual Entry Required'],
      route: `/applications/${id}/payment`,
    },
  ];

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/applications/${id}`)}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeftCircle className="h-4 w-4 mr-2" />
            Back to Application
          </Button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Select Payment Method</h1>
              <p className="text-muted-foreground">
                Choose your preferred payment gateway to complete the registration fee
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Application Number</p>
              <p className="font-semibold">{application.applicationNumber}</p>
              <p className="text-sm text-muted-foreground mt-2">Amount to Pay</p>
              <p className="text-2xl font-bold text-primary">₹{parseFloat(application.totalFee || '0').toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Payment Gateway Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paymentGateways.map((gateway) => {
            const Icon = gateway.icon;
            return (
              <Card key={gateway.id} className="hover-elevate transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{gateway.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {gateway.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={gateway.badgeVariant} data-testid={`badge-${gateway.id}`}>
                      {gateway.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Features */}
                    <div>
                      <p className="text-sm font-medium mb-2">Features:</p>
                      <ul className="space-y-1">
                        {gateway.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => setLocation(gateway.route)}
                      className="w-full"
                      variant={gateway.id === 'himkosh' ? 'default' : 'outline'}
                      data-testid={`button-select-${gateway.id}`}
                    >
                      {gateway.id === 'himkosh' ? 'Pay with ' : 'Choose '}
                      {gateway.name}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security Notice */}
        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Payment Security Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>All payment gateways are RBI approved and PCI-DSS compliant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Your card/bank details are encrypted using 128-bit SSL</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>HP Tourism Department does not store your banking credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>After successful payment, your certificate will be generated automatically</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact HP Tourism Department at{' '}
            <a href="mailto:tourism@hp.gov.in" className="text-primary hover:underline">
              tourism@hp.gov.in
            </a>
            {' '}or call{' '}
            <a href="tel:01772621952" className="text-primary hover:underline">
              0177-2621952
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
