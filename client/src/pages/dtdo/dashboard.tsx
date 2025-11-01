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
  XCircle,
  ArrowRight,
  Loader2,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { HomestayApplication } from "@shared/schema";

interface ApplicationWithOwner extends HomestayApplication {
  ownerName: string;
  ownerMobile: string;
  daName?: string;
}

export default function DTDODashboard() {
  const [activeTab, setActiveTab] = useState("forwarded");
  
  const { data: applications, isLoading } = useQuery<ApplicationWithOwner[]>({
    queryKey: ["/api/dtdo/applications"],
  });

  const { data: user } = useQuery<{ user: { id: string; fullName: string; role: string; district?: string } }>({
    queryKey: ["/api/auth/me"],
  });

  // Group applications by status
  const forwardedByDA = applications?.filter(app => app.status === 'forwarded_to_dtdo') || [];
  const underReview = applications?.filter(app => app.status === 'dtdo_review') || [];
  const inspectionPending = applications?.filter(app => app.status === 'inspection_scheduled') || [];
  const inspectionCompleted = applications?.filter(app => app.status === 'inspection_completed') || [];

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
      title: "Forwarded by DA",
      value: forwardedByDA.length,
      description: "Awaiting your review",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      tabValue: "forwarded",
    },
    {
      title: "Under Review",
      value: underReview.length,
      description: "Being processed",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      tabValue: "review",
    },
    {
      title: "Inspection Scheduled",
      value: inspectionPending.length,
      description: "Awaiting inspection",
      icon: ClipboardCheck,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      tabValue: "inspection",
    },
    {
      title: "Inspection Reports",
      value: inspectionCompleted.length,
      description: "Ready for review",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      tabValue: "reports",
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      forwarded_to_dtdo: {
        label: "Forwarded by DA",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/20",
      },
      dtdo_review: {
        label: "Under Review",
        className: "bg-orange-50 text-orange-700 dark:bg-orange-950/20",
      },
      inspection_scheduled: {
        label: "Inspection Scheduled",
        className: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
      },
      inspection_completed: {
        label: "Report Submitted",
        className: "bg-green-50 text-green-700 dark:bg-green-950/20",
      },
    };

    const config = statusConfig[status] || { label: status, className: "" };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const colorMap: Record<string, string> = {
      diamond: "bg-purple-50 text-purple-700 dark:bg-purple-950/20",
      gold: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20",
      silver: "bg-gray-50 text-gray-700 dark:bg-gray-950/20",
    };
    return (
      <Badge variant="outline" className={colorMap[category.toLowerCase()] || ""}>
        {category.toUpperCase()}
      </Badge>
    );
  };

  const ApplicationTable = ({ applications }: { applications: ApplicationWithOwner[] }) => (
    <div className="border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left p-4 font-medium">Application #</th>
              <th className="text-left p-4 font-medium">Property</th>
              <th className="text-left p-4 font-medium">Owner</th>
              <th className="text-left p-4 font-medium">Category</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Submitted</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-muted-foreground">
                  No applications found
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="border-b hover-elevate">
                  <td className="p-4">
                    <div className="font-medium">{app.applicationNumber}</div>
                    {app.daName && (
                      <div className="text-xs text-muted-foreground">
                        Forwarded by: {app.daName}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{app.propertyName}</div>
                    <div className="text-sm text-muted-foreground">{app.totalRooms} rooms</div>
                  </td>
                  <td className="p-4">
                    <div>{app.ownerName}</div>
                    <div className="text-sm text-muted-foreground">{app.ownerMobile}</div>
                  </td>
                  <td className="p-4">{getCategoryBadge(app.category)}</td>
                  <td className="p-4">{getStatusBadge(app.status)}</td>
                  <td className="p-4">
                    {app.submittedAt ? format(new Date(app.submittedAt), "MMM dd, yyyy") : "N/A"}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/dtdo/applications/${app.id}`}>
                      <Button size="sm" variant="ghost" data-testid={`button-review-${app.id}`}>
                        Review <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DTDO Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {user?.district ? `District: ${user.district}` : "Review and process homestay applications"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`hover-elevate cursor-pointer ${activeTab === stat.tabValue ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab(stat.tabValue)}
            data-testid={`card-stat-${stat.tabValue}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Applications Queue</CardTitle>
          <CardDescription>
            Review applications forwarded by Dealing Assistants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="forwarded" data-testid="tab-forwarded">
                Forwarded ({forwardedByDA.length})
              </TabsTrigger>
              <TabsTrigger value="review" data-testid="tab-review">
                Under Review ({underReview.length})
              </TabsTrigger>
              <TabsTrigger value="inspection" data-testid="tab-inspection">
                Inspection ({inspectionPending.length})
              </TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">
                Reports ({inspectionCompleted.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="forwarded" className="mt-4">
              <ApplicationTable applications={forwardedByDA} />
            </TabsContent>

            <TabsContent value="review" className="mt-4">
              <ApplicationTable applications={underReview} />
            </TabsContent>

            <TabsContent value="inspection" className="mt-4">
              <ApplicationTable applications={inspectionPending} />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <ApplicationTable applications={inspectionCompleted} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
