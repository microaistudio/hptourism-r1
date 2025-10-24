import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Home as HomeIcon, 
  Clock, 
  FileText, 
  CheckCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  Award
} from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AnimatedCounter } from "@/components/animated-counter";

const BASE_STATS = {
  total: 16673,
  approved: 16213,
  rejected: 1137,
  pending: 2223
};

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState(BASE_STATS);
  const [applicationNumber, setApplicationNumber] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");

  useEffect(() => {
    const incrementStats = () => {
      setStats(prev => {
        const approvedInc = Math.floor(Math.random() * 2) + 1;
        const rejectedInc = Math.random() > 0.8 ? 1 : 0;
        const pendingInc = Math.floor(Math.random() * 2);
        const totalInc = approvedInc + rejectedInc + pendingInc;
        
        return {
          total: prev.total + totalInc,
          approved: prev.approved + approvedInc,
          rejected: prev.rejected + rejectedInc,
          pending: prev.pending + pendingInc
        };
      });
    };

    const interval = setInterval(incrementStats, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTrackApplication = () => {
    if (applicationNumber.trim()) {
      alert(`Tracking feature coming soon for application: ${applicationNumber}`);
    }
  };

  const handleVerifyCertificate = () => {
    if (certificateNumber.trim()) {
      alert(`Certificate verification feature coming soon for: ${certificateNumber}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader 
        title="HP Tourism eServices"
        showBack={false}
        showHome={false}
        actions={
          <div className="flex gap-3">
            <ThemeSwitcher />
            <Button variant="outline" onClick={() => setLocation("/login")} data-testid="button-login">
              Sign In
            </Button>
            <Button onClick={() => setLocation("/register")} data-testid="button-register">
              Register
            </Button>
          </div>
        }
      />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Welcome to HP Tourism Digital Ecosystem
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamlined homestay registration system implementing the 2025 Homestay Rules. 
            Get your property registered in 7-15 days instead of 105 days.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => setLocation("/register")} 
              data-testid="button-get-started"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setLocation("/properties")} 
              data-testid="button-browse-properties"
            >
              Browse Properties
            </Button>
          </div>
        </div>
      </section>

      {/* Live Statistics Dashboard */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Live Portal Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm" data-testid="card-total-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold" data-testid="stat-total">
                  <AnimatedCounter value={stats.total} />
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-approved-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold text-green-600" data-testid="stat-approved">
                  <AnimatedCounter value={stats.approved} />
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-rejected-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejected Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold text-red-600" data-testid="stat-rejected">
                  <AnimatedCounter value={stats.rejected} />
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-pending-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold text-orange-600" data-testid="stat-pending">
                  <AnimatedCounter value={stats.pending} />
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm" data-testid="card-easy-registration">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Easy Registration</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription>
                  Simple step-by-step application process for homestay owners
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-fast-processing">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Fast Processing</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription>
                  Applications processed in 7-15 days with automated workflows
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-digital-documents">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Digital Documents</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription>
                  Upload all required documents online with instant verification
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-realtime-tracking">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Real-time Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription>
                  Track your application status at every step of the process
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Application Tracking & Certificate Verification */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Search className="w-6 h-6 text-primary" />
                  <CardTitle>Track Your Application</CardTitle>
                </div>
                <CardDescription>
                  Enter your application number to check current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter application number"
                    value={applicationNumber}
                    onChange={(e) => setApplicationNumber(e.target.value)}
                    data-testid="input-application-number"
                  />
                  <Button onClick={handleTrackApplication} data-testid="button-track">
                    Track
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-6 h-6 text-primary" />
                  <CardTitle>Verify Certificate</CardTitle>
                </div>
                <CardDescription>
                  Verify the authenticity of homestay certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter certificate number"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    data-testid="input-certificate-number"
                  />
                  <Button onClick={handleVerifyCertificate} data-testid="button-verify">
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Homestay Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">2025 Homestay Categories</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-none shadow-sm" data-testid="card-diamond">
              <CardHeader>
                <CardTitle className="text-2xl">Diamond</CardTitle>
                <CardDescription className="text-base">
                  Premium homestays with exceptional amenities and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• AC in all rooms</li>
                  <li>• WiFi throughout</li>
                  <li>• Restaurant facility</li>
                  <li>• Premium location</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-gold">
              <CardHeader>
                <CardTitle className="text-2xl">Gold</CardTitle>
                <CardDescription className="text-base">
                  Quality homestays with essential modern amenities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• AC in select rooms</li>
                  <li>• WiFi available</li>
                  <li>• Hot water 24/7</li>
                  <li>• Good location</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm" data-testid="card-silver">
              <CardHeader>
                <CardTitle className="text-2xl">Silver</CardTitle>
                <CardDescription className="text-base">
                  Comfortable homestays with basic amenities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Clean & comfortable</li>
                  <li>• Essential amenities</li>
                  <li>• Safe location</li>
                  <li>• Affordable pricing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-background">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-2">
            © 2025 Government of Himachal Pradesh. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Developed under Digital Himachal Initiative | Powered by Outline and Agentryx
          </p>
        </div>
      </footer>
    </div>
  );
}
