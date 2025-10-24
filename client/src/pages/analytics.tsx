import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/navigation-header";
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import {
  TrendingUp, Users, FileText, CheckCircle, Clock, 
  AlertCircle, BarChart3, MapPin
} from "lucide-react";

interface AnalyticsData {
  overview: {
    total: number;
    byStatus: {
      pending: number;
      district_review: number;
      state_review: number;
      approved: number;
      rejected: number;
    };
    byCategory: {
      diamond: number;
      gold: number;
      silver: number;
    };
    avgProcessingTime: number;
    totalOwners: number;
  };
  districts: Record<string, number>;
  recentApplications: any[];
}

const STATUS_COLORS = {
  pending: "#f59e0b",
  district_review: "#3b82f6",
  state_review: "#8b5cf6",
  approved: "#10b981",
  rejected: "#ef4444",
};

const CATEGORY_COLORS = {
  diamond: "hsl(var(--primary))",
  gold: "hsl(var(--secondary))",
  silver: "#94a3b8",
};

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-muted rounded w-64 animate-pulse mb-2" />
            <div className="h-4 bg-muted rounded w-96 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                  <div className="h-8 bg-muted rounded w-16 animate-pulse" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unable to Load Analytics</h3>
            <p className="text-muted-foreground">
              Please try again later or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, districts, recentApplications } = data;

  // Prepare data for charts
  const statusData = [
    { name: "Pending", value: overview.byStatus.pending, color: STATUS_COLORS.pending },
    { name: "District Review", value: overview.byStatus.district_review, color: STATUS_COLORS.district_review },
    { name: "State Review", value: overview.byStatus.state_review, color: STATUS_COLORS.state_review },
    { name: "Approved", value: overview.byStatus.approved, color: STATUS_COLORS.approved },
    { name: "Rejected", value: overview.byStatus.rejected, color: STATUS_COLORS.rejected },
  ];

  const categoryData = [
    { name: "Diamond", value: overview.byCategory.diamond, color: CATEGORY_COLORS.diamond },
    { name: "Gold", value: overview.byCategory.gold, color: CATEGORY_COLORS.gold },
    { name: "Silver", value: overview.byCategory.silver, color: CATEGORY_COLORS.silver },
  ];

  const districtData = Object.entries(districts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      district_review: "default",
      state_review: "default",
      approved: "default",
      rejected: "destructive",
    };
    return variants[status] || "secondary";
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader 
        title="Analytics Dashboard"
        backTo="/dashboard"
      />
      <div className="max-w-7xl mx-auto p-8">

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{overview.total}</div>
              <p className="text-xs text-muted-foreground">All time submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-approved">
                {overview.byStatus.approved}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.total > 0 
                  ? `${Math.round((overview.byStatus.approved / overview.total) * 100)}% approval rate`
                  : "No data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-processing-time">
                {overview.avgProcessingTime} days
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.avgProcessingTime <= 15 
                  ? "Meeting target (7-15 days)" 
                  : "Above target range"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Owners</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-owners">{overview.totalOwners}</div>
              <p className="text-xs text-muted-foreground">Active property owners</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Application Status Distribution
              </CardTitle>
              <CardDescription>Current workflow stage breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : null
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Category Distribution
              </CardTitle>
              <CardDescription>Diamond, Gold, Silver breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* District Coverage */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Top Districts by Applications
            </CardTitle>
            <CardDescription>Geographic distribution across Himachal Pradesh</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={districtData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Latest 10 submissions to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentApplications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No applications yet</p>
              ) : (
                recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`recent-app-${app.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{app.propertyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.district} • {app.ownerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadge(app.status)}>
                        {app.status.replace(/_/g, " ")}
                      </Badge>
                      {app.submittedAt && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
