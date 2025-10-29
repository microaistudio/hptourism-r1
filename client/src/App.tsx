import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DevConsole } from "@/components/dev-console";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthLayout } from "@/components/auth-layout";
import { getDefaultRouteForRole } from "@/config/navigation";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import NewApplication from "@/pages/applications/new";
import ApplicationDetail from "@/pages/applications/detail";
import UpdateApplication from "@/pages/applications/update";
import PaymentPage from "@/pages/applications/payment";
import HimKoshPaymentPage from "@/pages/applications/payment-himkosh";
import PublicProperties from "@/pages/public/properties";
import PublicPropertyDetail from "@/pages/public/property-detail";
import AnalyticsPage from "@/pages/analytics";
import WorkflowMonitoring from "@/pages/workflow-monitoring";
import PaymentVerification from "@/pages/payment-verification";
import AdminUsers from "@/pages/admin/users";
import TestAPI from "@/pages/test-api";
import type { User } from "@shared/schema";

interface ProtectedRouteProps {
  component: React.ComponentType;
  allowedRoles?: string[];
}

function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { data: userData, isLoading } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  // If still loading, show nothing (AuthLayout will show loading state)
  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AuthLayout>
    );
  }

  // If not logged in, redirect to login
  if (!userData?.user) {
    setLocation("/login");
    return null;
  }

  // If role restrictions exist and user doesn't have required role, redirect to their home
  if (allowedRoles && !allowedRoles.includes(userData.user.role)) {
    const homeRoute = getDefaultRouteForRole(userData.user.role);
    setLocation(homeRoute);
    return null;
  }

  return (
    <AuthLayout>
      <Component />
    </AuthLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={HomePage} />
      <Route path="/test-api" component={TestAPI} />
      <Route path="/properties" component={PublicProperties} />
      <Route path="/properties/:id" component={PublicPropertyDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes - All wrapped in AuthLayout */}
      {/* Property Owner Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/applications/new">
        {() => <ProtectedRoute component={NewApplication} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/:id/update">
        {() => <ProtectedRoute component={UpdateApplication} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/:id/payment">
        {() => <ProtectedRoute component={PaymentPage} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/:id/payment-himkosh">
        {() => <ProtectedRoute component={HimKoshPaymentPage} allowedRoles={['property_owner']} />}
      </Route>
      <Route path="/applications/:id">
        {() => <ProtectedRoute component={ApplicationDetail} />}
      </Route>
      
      {/* Officer-Only Routes */}
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsPage} allowedRoles={['district_officer', 'state_officer']} />}
      </Route>
      <Route path="/workflow-monitoring">
        {() => <ProtectedRoute component={WorkflowMonitoring} allowedRoles={['district_officer', 'state_officer']} />}
      </Route>
      <Route path="/payment-verification">
        {() => <ProtectedRoute component={PaymentVerification} allowedRoles={['district_officer', 'state_officer']} />}
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={['admin']} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <DevConsole />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
