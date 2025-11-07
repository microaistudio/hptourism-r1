import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { HomestayApplication, User } from "@shared/schema";

type SearchParams = {
  applicationNumber: string;
  ownerMobile: string;
  ownerAadhaar: string;
  month: string;
  year: string;
  fromDate: string;
  toDate: string;
};

type SearchResponse = {
  results: HomestayApplication[];
};

const initialParams: SearchParams = {
  applicationNumber: "",
  ownerMobile: "",
  ownerAadhaar: "",
  month: "",
  year: "",
  fromDate: "",
  toDate: "",
};

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index);

export default function OfficerApplicationSearch() {
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [results, setResults] = useState<HomestayApplication[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const searchMutation = useMutation({
    mutationFn: async (payload: SearchParams) => {
      const response = await apiRequest("POST", "/api/applications/search", payload);
      return response.json() as Promise<SearchResponse>;
    },
    onSuccess: (data) => {
      setResults(data.results ?? []);
      toast({
        title: "Search complete",
        description: `${data.results?.length ?? 0} application(s) found.`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to search applications right now.";
      toast({
        title: "Search failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resetFilters = () => {
    setParams(initialParams);
    setResults([]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasFilter = Object.entries(params).some(([key, value]) => {
      if (key === "month" || key === "year") {
        return Boolean(value);
      }
      return value.trim().length > 0;
    });

    if (!hasFilter) {
      toast({
        title: "Add search filters",
        description: "Please provide at least one search parameter before running a query.",
        variant: "destructive",
      });
      return;
    }

    searchMutation.mutate(params);
  };

  const handleInputChange = (key: keyof SearchParams) => (value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const role = userData?.user?.role ?? "";
  const detailBasePath =
    role === "dealing_assistant" ? "/da/applications/" : "/dtdo/applications/";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Applications</h1>
        <p className="text-muted-foreground mt-1">
          Locate applications using reference numbers, owner details, or submission dates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <CardDescription>
            Provide one or more filters. You can narrow results by application number, contact
            details, or submission period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="applicationNumber">Application Number</Label>
                <Input
                  id="applicationNumber"
                  name="applicationNumber"
                  value={params.applicationNumber}
                  onChange={handleValueChange}
                  placeholder="HP-HS-2025-000123"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerMobile">Owner Mobile</Label>
                <Input
                  id="ownerMobile"
                  name="ownerMobile"
                  value={params.ownerMobile}
                  onChange={handleValueChange}
                  placeholder="9876543210"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ownerAadhaar">Owner Aadhaar</Label>
                <Input
                  id="ownerAadhaar"
                  name="ownerAadhaar"
                  value={params.ownerAadhaar}
                  onChange={handleValueChange}
                  placeholder="12-digit Aadhaar"
                />
              </div>
              <div className="grid gap-2">
                <Label>Month / Year</Label>
                <div className="flex gap-2">
                  <Select
                    value={params.month}
                    onValueChange={handleInputChange("month")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((monthOption) => (
                        <SelectItem key={monthOption.value} value={monthOption.value}>
                          {monthOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={params.year}
                    onValueChange={handleInputChange("year")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((yearValue) => (
                        <SelectItem key={yearValue} value={String(yearValue)}>
                          {yearValue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Providing a custom date range overrides the month and year.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  value={params.fromDate}
                  onChange={handleValueChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={params.toDate}
                  onChange={handleValueChange}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={searchMutation.isPending}>
                {searchMutation.isPending ? "Searching..." : "Search"}
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <p className="text-xs text-muted-foreground">
                Maximum 200 results returned. Narrow filters for precise matches.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {results.length === 0
              ? "Run a search to display matching applications."
              : `Showing ${results.length} result${results.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        {application.applicationNumber}
                      </TableCell>
                      <TableCell>{application.propertyName}</TableCell>
                      <TableCell>{application.ownerName}</TableCell>
                      <TableCell>{application.ownerMobile}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{application.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {application.createdAt
                          ? new Date(application.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`${detailBasePath}${application.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No applications to display. Adjust your filters and try again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
