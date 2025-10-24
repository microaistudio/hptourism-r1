import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Mountain, 
  Home as HomeIcon, 
  FileText, 
  CheckCircle, 
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Clock,
  Award
} from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";
import heroImage from "@assets/stock_images/beautiful_himachal_p_50139e3f.jpg";

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
      setStats(prev => ({
        total: prev.total + Math.floor(Math.random() * 3) + 1,
        approved: prev.approved + Math.floor(Math.random() * 2) + 1,
        rejected: prev.rejected + (Math.random() > 0.8 ? 1 : 0),
        pending: prev.pending + Math.floor(Math.random() * 2)
      }));
    };

    incrementStats();

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/login")} data-testid="button-login">
              Sign In
            </Button>
            <Button onClick={() => setLocation("/register")} data-testid="button-register">
              Register
            </Button>
          </div>
        }
      />

      <section 
        className="relative h-[500px] flex items-center justify-center text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-4xl mx-auto text-center px-4 z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            HP Tourism eServices
          </h1>
          <p className="text-xl md:text-2xl mb-8 drop-shadow-md">
            You are just a click away from our esteemed dynamic e-services
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              variant="default"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => setLocation("/properties")} 
              data-testid="button-browse-properties"
            >
              <Mountain className="w-5 h-5 mr-2" />
              Discover Homestays
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm"
              onClick={() => setLocation("/register")} 
              data-testid="button-register-property"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              Register Your Property
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">OUR SERVICES</h2>
          <p className="text-center text-muted-foreground mb-10">
            You are just a click away from our esteemed dynamic e-services
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/register")} data-testid="card-register-tourism">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="w-8 h-8 text-red-500" />
                </div>
                <CardTitle>Registration of Tourism Unit</CardTitle>
                <CardDescription>
                  To enhance online procedure & online we are pleased to offer e-registration in an improved and simplified manner.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer" data-testid="card-essentiality">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle>Essentiality Certificates</CardTitle>
                <CardDescription>
                  A single window to handle all requirements related to essentiality certificate in tourism.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate cursor-pointer" data-testid="card-approval">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-blue-500" />
                </div>
                <CardTitle>Approval Of Projects</CardTitle>
                <CardDescription>
                  Improving quality of service by devising online information related to approval of projects.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center py-8">
            <h3 className="text-2xl font-semibold mb-4">Are You Ready To Get Started?</h3>
            <p className="text-muted-foreground mb-6">
              To explore more about tourism e-services see request you to click below.
            </p>
            <Button 
              size="lg" 
              className="bg-pink-500 hover:bg-pink-600 text-white"
              onClick={() => setLocation("/register")}
              data-testid="button-signup-now"
            >
              SIGN UP NOW
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">APPLICATION STATUS</h2>
          <p className="text-center text-muted-foreground mb-10">
            To verify the status of your application please refer below
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-total-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-8 h-8 text-red-500" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold" data-testid="stat-total">
                  {stats.total.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-approved-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-red-500" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold" data-testid="stat-approved">
                  {stats.approved.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-rejected-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <XCircle className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejected Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold" data-testid="stat-rejected">
                  {stats.rejected.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-applications">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-bold" data-testid="stat-pending">
                  {stats.pending.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-background">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card data-testid="card-application-tracking">
            <CardHeader>
              <CardTitle className="text-2xl text-center">APPLICATION TRACKING</CardTitle>
              <CardDescription className="text-center">
                To track your application enter your application number here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Enter Application Number"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                data-testid="input-application-number"
              />
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={handleTrackApplication}
                data-testid="button-check-application"
              >
                CHECK
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-certificate-verification">
            <CardHeader>
              <CardTitle className="text-2xl text-center">CERTIFICATE VERIFICATION</CardTitle>
              <CardDescription className="text-center">
                To verify certificates please enter certificate number here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Enter Certificate Number"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                data-testid="input-certificate-number"
              />
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={handleVerifyCertificate}
                data-testid="button-check-certificate"
              >
                CHECK
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">2025 Homestay Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-8 h-8 text-blue-500" />
                  <CardTitle className="text-2xl">Diamond</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Premium homestays with exceptional amenities and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• AC in all rooms</li>
                  <li>• WiFi throughout</li>
                  <li>• Restaurant facility</li>
                  <li>• Premium mountain views</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-8 h-8 text-amber-500" />
                  <CardTitle className="text-2xl">Gold</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Quality homestays with essential modern amenities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• AC in select rooms</li>
                  <li>• WiFi available</li>
                  <li>• Hot water 24/7</li>
                  <li>• Good location</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-8 h-8 text-slate-400" />
                  <CardTitle className="text-2xl">Silver</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Comfortable homestays with basic amenities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
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

      <footer className="border-t py-8 px-4 bg-background">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>© 2022 Himachal Tourism eServices. All rights reserved.</p>
          <p className="text-sm mt-2">Powered By: Netgen</p>
        </div>
      </footer>
    </div>
  );
}
