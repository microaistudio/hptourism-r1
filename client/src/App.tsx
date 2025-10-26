import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DevConsole } from "@/components/dev-console";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthLayout } from "@/components/auth-layout";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import NewApplication from "@/pages/applications/new";
import ApplicationDetail from "@/pages/applications/detail";
import PublicProperties from "@/pages/public/properties";
import PublicPropertyDetail from "@/pages/public/property-detail";
import AnalyticsPage from "@/pages/analytics";
import WorkflowMonitoring from "@/pages/workflow-monitoring";
import TestAPI from "@/pages/test-api";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
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
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={AnalyticsPage} />}
      </Route>
      <Route path="/workflow-monitoring">
        {() => <ProtectedRoute component={WorkflowMonitoring} />}
      </Route>
      <Route path="/applications/new">
        {() => <ProtectedRoute component={NewApplication} />}
      </Route>
      <Route path="/applications/:id">
        {() => <ProtectedRoute component={ApplicationDetail} />}
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
