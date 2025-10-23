import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Home, FileText, CheckCircle, Clock } from "lucide-react";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mountain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">HP Tourism eServices</h1>
              <p className="text-sm text-muted-foreground">Himachal Pradesh Government</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/login")} data-testid="button-login">
              Sign In
            </Button>
            <Button onClick={() => setLocation("/register")} data-testid="button-register">
              Register
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Welcome to HP Tourism Digital Ecosystem
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Streamlined homestay registration system implementing the 2025 Homestay Rules.
            Get your property registered in 7-15 days instead of 105 days.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation("/register")} data-testid="button-get-started">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/properties")} data-testid="button-browse">
              Browse Properties
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Easy Registration</CardTitle>
                <CardDescription>
                  Simple step-by-step application process for homestay owners
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Fast Processing</CardTitle>
                <CardDescription>
                  Applications processed in 7-15 days with automated workflows
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Digital Documents</CardTitle>
                <CardDescription>
                  Upload all required documents online with instant verification
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>
                  Track your application status at every step of the process
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">2025 Homestay Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Diamond</CardTitle>
                <CardDescription className="text-base">
                  Premium homestays with exceptional amenities and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• AC in all rooms</li>
                  <li>• WiFi throughout</li>
                  <li>• Restaurant facility</li>
                  <li>• Premium location</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Gold</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Silver</CardTitle>
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

      <footer className="border-t py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>© 2025 Government of Himachal Pradesh. All rights reserved.</p>
          <p className="text-sm mt-2">Developed under Digital Himachal Initiative</p>
        </div>
      </footer>
    </div>
  );
}
