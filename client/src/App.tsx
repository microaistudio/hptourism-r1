import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DevConsole } from "@/components/dev-console";
import { ThemeProvider } from "@/contexts/theme-context";
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
import TestAPI from "@/pages/test-api";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/test-api" component={TestAPI} />
      <Route path="/properties" component={PublicProperties} />
      <Route path="/properties/:id" component={PublicPropertyDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/applications/new" component={NewApplication} />
      <Route path="/applications/:id" component={ApplicationDetail} />
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
