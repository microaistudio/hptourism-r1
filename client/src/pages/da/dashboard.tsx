import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { HomestayApplication } from "@shared/schema";

interface ApplicationWithOwner extends HomestayApplication {
  ownerName: string;
  ownerMobile: string;
}

export default function DADashboard() {
  const [activeTab, setActiveTab] = useState("new");
  
  const { data: applications, isLoading } = useQuery<ApplicationWithOwner[]>({
    queryKey: ["/api/da/applications"],
  });

  const { data: user } = useQuery<{ user: { id: string; fullName: string; role: string; district?: string } }>({
    queryKey: ["/api/auth/me"],
  });

  // Group applications by status
  const newApplications = applications?.filter(app => app.status === 'submitted') || [];
  const underScrutiny = applications?.filter(app => app.status === 'under_scrutiny') || [];
  const forwarded = applications?.filter(app => app.status === 'forwarded_to_dtdo') || [];
  const reverted = applications?.filter(app => app.status === 'reverted_to_applicant') || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "New Applications",
      value: newApplications.length,
      description: "Awaiting scrutiny",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      tabValue: "new",
    },
    {
      title: "Under Scrutiny",
      value: underScrutiny.length,
      description: "Being reviewed",
      icon: Search,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      tabValue: "scrutiny",
    },
    {
      title: "Forwarded to DTDO",
      value: forwarded.length,
      description: "Sent to officer",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      tabValue: "forwarded",
    },
    {
      title: "Sent Back",
      value: reverted.length,
      description: "Reverted to applicant",
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      tabValue: "reverted",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dealing Assistant Dashboard</h1>
        <p className="text-muted-foreground">
          {user?.user?.district || 'District'} - Application Scrutiny & Verification
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title}
              className="cursor-pointer transition-all hover-elevate active-elevate-2"
              onClick={() => setActiveTab(stat.tabValue)}
              data-testid={`card-${stat.tabValue}`}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Application Queue Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="new" data-testid="tab-new">
            New ({newApplications.length})
          </TabsTrigger>
          <TabsTrigger value="scrutiny" data-testid="tab-scrutiny">
            Under Scrutiny ({underScrutiny.length})
          </TabsTrigger>
          <TabsTrigger value="forwarded" data-testid="tab-forwarded">
            Forwarded ({forwarded.length})
          </TabsTrigger>
          <TabsTrigger value="reverted" data-testid="tab-reverted">
            Sent Back ({reverted.length})
          </TabsTrigger>
        </TabsList>

        {/* New Applications Tab */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>New Applications Awaiting Scrutiny</CardTitle>
              <CardDescription>
                Applications submitted by property owners requiring initial review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {newApplications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No new applications at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newApplications.map((app) => (
                    <ApplicationRow 
                      key={app.id} 
                      application={app} 
                      actionLabel="Start Scrutiny"
                      applicationIds={newApplications.map(a => a.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Under Scrutiny Tab */}
        <TabsContent value="scrutiny">
          <Card>
            <CardHeader>
              <CardTitle>Applications Under Scrutiny</CardTitle>
              <CardDescription>
                Applications currently being reviewed by you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {underScrutiny.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No applications under scrutiny</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {underScrutiny.map((app) => (
                    <ApplicationRow 
                      key={app.id} 
                      application={app} 
                      actionLabel="Continue Review"
                      applicationIds={underScrutiny.map(a => a.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forwarded Tab */}
        <TabsContent value="forwarded">
          <Card>
            <CardHeader>
              <CardTitle>Forwarded to DTDO</CardTitle>
              <CardDescription>
                Applications you've approved and sent to District Officer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forwarded.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No forwarded applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {forwarded.map((app) => (
                    <ApplicationRow 
                      key={app.id} 
                      application={app} 
                      actionLabel="View Details"
                      applicationIds={forwarded.map(a => a.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reverted Tab */}
        <TabsContent value="reverted">
          <Card>
            <CardHeader>
              <CardTitle>Sent Back to Applicant</CardTitle>
              <CardDescription>
                Applications returned to property owners for corrections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reverted.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reverted applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reverted.map((app) => (
                    <ApplicationRow 
                      key={app.id} 
                      application={app} 
                      actionLabel="View Details"
                      applicationIds={reverted.map(a => a.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ApplicationRowProps {
  application: ApplicationWithOwner;
  actionLabel: string;
  applicationIds: string[];
}

function ApplicationRow({ application, actionLabel, applicationIds }: ApplicationRowProps) {
  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { color: string; bg: string }> = {
      diamond: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20" },
      gold: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
      silver: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/20" },
    };
    const variant = variants[category?.toLowerCase()] || variants.silver;
    return <Badge variant="outline" className={`${variant.bg} capitalize`}>{category}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; bg: string }> = {
      submitted: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
      under_scrutiny: { color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
      forwarded_to_dtdo: { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
      reverted_to_applicant: { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
    };
    const variant = variants[status] || { color: "", bg: "" };
    return <Badge variant="outline" className={variant.bg}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold truncate">{application.propertyName}</h3>
          {getCategoryBadge(application.category || 'silver')}
          {getStatusBadge(application.status || 'submitted')}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Owner:</span> {application.ownerName}
          </div>
          <div>
            <span className="font-medium">Mobile:</span> {application.ownerMobile}
          </div>
          <div>
            <span className="font-medium">District:</span> {application.district}
          </div>
          <div>
            <span className="font-medium">Submitted:</span>{' '}
            {application.submittedAt ? format(new Date(application.submittedAt), 'MMM dd, yyyy') : 'N/A'}
          </div>
        </div>
      </div>
      <div className="ml-4">
        <Link 
          href={`/da/applications/${application.id}?queue=${encodeURIComponent(applicationIds.join(','))}`}
        >
          <Button data-testid={`button-review-${application.id}`}>
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
