import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, MapPin, User, ClipboardCheck, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

type InspectionOrder = {
  id: string;
  applicationId: string;
  inspectionDate: string;
  inspectionAddress: string;
  specialInstructions?: string;
  status: string;
  application: {
    id: string;
    applicationNumber: string;
    propertyName: string;
    category: string;
    status: string;
  } | null;
  owner: {
    fullName: string;
    mobile: string;
  } | null;
  reportSubmitted: boolean;
};

export default function DAInspections() {
  const [, setLocation] = useLocation();

  const { data: inspections, isLoading } = useQuery<InspectionOrder[]>({
    queryKey: ['/api/da/inspections'],
  });

  const getStatusBadge = (status: string, reportSubmitted: boolean) => {
    if (reportSubmitted) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Report Submitted
        </Badge>
      );
    }

    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/20">
            <Clock className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-950/20">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  const pendingInspections = inspections?.filter(i => !i.reportSubmitted) || [];
  const completedInspections = inspections?.filter(i => i.reportSubmitted) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Property Inspections</h1>
        <p className="text-muted-foreground mt-2">
          Field inspections assigned by DTDO
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Inspections</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInspections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting site visit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedInspections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Reports submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspections?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All inspections</p>
          </CardContent>
        </Card>
      </div>

      {/* Inspection List */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Inspections</CardTitle>
          <CardDescription>
            Click on an inspection to view details and submit report
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : inspections && inspections.length > 0 ? (
            <div className="space-y-4">
              {inspections.map((inspection) => (
                <Card
                  key={inspection.id}
                  className="cursor-pointer transition-all hover-elevate active-elevate-2"
                  onClick={() => setLocation(`/da/inspections/${inspection.id}`)}
                  data-testid={`card-inspection-${inspection.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left Side - Property Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {inspection.application?.propertyName || 'Property Name Unavailable'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {inspection.application?.applicationNumber || 'N/A'}
                              </span>
                              {inspection.application?.category && getCategoryBadge(inspection.application.category)}
                              {getStatusBadge(inspection.status, inspection.reportSubmitted)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Scheduled:</span>
                            <span className="font-medium">
                              {format(new Date(inspection.inspectionDate), 'PPP')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Owner:</span>
                            <span className="font-medium">
                              {inspection.owner?.fullName || 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 md:col-span-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="text-muted-foreground">Address: </span>
                              <span className="font-medium">{inspection.inspectionAddress}</span>
                            </div>
                          </div>

                          {inspection.specialInstructions && (
                            <div className="flex items-start gap-2 md:col-span-2">
                              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                              <div>
                                <span className="text-orange-600 font-medium">Special Instructions: </span>
                                <span>{inspection.specialInstructions}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Action Button */}
                      <div className="flex items-center">
                        <Button
                          variant={inspection.reportSubmitted ? "outline" : "default"}
                          data-testid={`button-view-inspection-${inspection.id}`}
                        >
                          {inspection.reportSubmitted ? 'View Report' : 'Submit Report'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No inspections assigned</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You don't have any pending property inspections at the moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
