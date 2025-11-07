import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { HomestayApplication } from "@shared/schema";

const CATEGORY_VARIANTS: Record<string, { color: string; bg: string }> = {
  diamond: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20" },
  gold: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
  silver: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/20" },
};

const STATUS_VARIANTS: Record<string, { label: string; bg: string }> = {
  submitted: { label: "Submitted", bg: "bg-blue-50 dark:bg-blue-950/20" },
  under_scrutiny: { label: "Under Scrutiny", bg: "bg-orange-50 dark:bg-orange-950/20" },
  forwarded_to_dtdo: { label: "Forwarded to DTDO", bg: "bg-green-50 dark:bg-green-950/20" },
  reverted_to_applicant: { label: "Sent Back", bg: "bg-red-50 dark:bg-red-950/20" },
  dtdo_review: { label: "DTDO Review", bg: "bg-purple-50 dark:bg-purple-950/20" },
  inspection_scheduled: { label: "Inspection Scheduled", bg: "bg-indigo-50 dark:bg-indigo-950/20" },
  inspection_under_review: { label: "Inspection Review", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
  approved: { label: "Approved", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
  rejected: { label: "Rejected", bg: "bg-rose-50 dark:bg-rose-950/20" },
  draft: { label: "Draft", bg: "bg-slate-50 dark:bg-slate-900/40" },
};

const renderCategoryBadge = (category?: string) => {
  const key = (category || "silver").toLowerCase();
  const variant = CATEGORY_VARIANTS[key] || CATEGORY_VARIANTS.silver;
  return (
    <Badge variant="outline" className={`${variant.bg} capitalize`}>
      {category || "silver"}
    </Badge>
  );
};

const renderStatusBadge = (status?: string) => {
  if (!status) {
    return <Badge variant="outline">Pending</Badge>;
  }
  const config = STATUS_VARIANTS[status] || {
    label: status.replace(/_/g, " "),
    bg: "bg-muted/40",
  };
  return (
    <Badge variant="outline" className={config.bg}>
      {config.label}
    </Badge>
  );
};

interface ApplicationWithOwner extends HomestayApplication {
  ownerName: string;
  ownerMobile: string;
}

export default function DADashboard() {
  const [activeTab, setActiveTab] = useState("new");
  const queryClient = useQueryClient();
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/da/applications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };
  
  const { data: applications, isLoading } = useQuery<ApplicationWithOwner[]>({
    queryKey: ["/api/da/applications"],
  });

  const allApplications = applications ?? [];

  const { data: user } = useQuery<{ user: { id: string; fullName: string; role: string; district?: string } }>({
    queryKey: ["/api/auth/me"],
  });

  // Group applications by status
  const newApplications = allApplications.filter(app => app.status === 'submitted');
  const underScrutiny = allApplications.filter(app => app.status === 'under_scrutiny');
  const forwarded = allApplications.filter(app => app.status === 'forwarded_to_dtdo');
  const reverted = allApplications.filter(app => app.status === 'reverted_to_applicant');

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dealing Assistant Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.user?.district || 'District'} - Application Scrutiny & Verification
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          data-testid="button-da-refresh"
          className="w-fit"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
          <TabsTrigger value="all" data-testid="tab-all">
            All ({allApplications.length})
          </TabsTrigger>
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

        {/* All Applications Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All District Applications</CardTitle>
              <CardDescription>
                Every homestay application in your district across all stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllApplicationsTable applications={allApplications} />
            </CardContent>
          </Card>
        </TabsContent>

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
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold truncate">{application.propertyName}</h3>
          {renderCategoryBadge(application.category)}
          {renderStatusBadge(application.status)}
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

function AllApplicationsTable({ applications }: { applications: ApplicationWithOwner[] }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No applications have been created in this district yet.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left p-4 font-medium">Application #</th>
              <th className="text-left p-4 font-medium">Property</th>
              <th className="text-left p-4 font-medium">Owner</th>
              <th className="text-left p-4 font-medium">Location</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Submitted</th>
              <th className="text-left p-4 font-medium">Updated</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const submittedAtDate = app.submittedAt ? new Date(app.submittedAt) : null;
              const updatedAtDate = app.updatedAt ? new Date(app.updatedAt) : null;
              return (
                <tr key={app.id} className="border-b hover-elevate">
                  <td className="p-4">
                    <div className="font-medium">{app.applicationNumber || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">{app.projectType?.replace(/_/g, " ") || ""}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium flex items-center gap-2">
                      {app.propertyName}
                      {renderCategoryBadge(app.category)}
                    </div>
                    <div className="text-xs text-muted-foreground">{app.totalRooms} rooms</div>
                  </td>
                  <td className="p-4">
                    <div>{app.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{app.ownerMobile}</div>
                  </td>
                  <td className="p-4">
                    <div>{app.tehsil || app.block || "Not Provided"}</div>
                    <div className="text-xs text-muted-foreground">{app.district}</div>
                  </td>
                  <td className="p-4">{renderStatusBadge(app.status)}</td>
                  <td className="p-4">
                    {submittedAtDate ? format(submittedAtDate, "MMM dd, yyyy") : "N/A"}
                  </td>
                  <td className="p-4">
                    {updatedAtDate ? format(updatedAtDate, "MMM dd, yyyy") : "N/A"}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/da/applications/${app.id}`}>
                      <Button size="sm" variant="ghost">
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
