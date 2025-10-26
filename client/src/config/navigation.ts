import { Home, FileText, Bell, BarChart3, Users, ClipboardList, Settings } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Property Owner Navigation Menu
export const ownerNavigation: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "My Applications",
        url: "/applications",
        icon: FileText,
      },
      {
        title: "New Application",
        url: "/applications/new",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Updates",
    items: [
      {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
      },
    ],
  },
];

// Officer Navigation Menu (District & State Officers)
export const officerNavigation: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Workflow Monitoring",
        url: "/workflow-monitoring",
        icon: BarChart3,
      },
      {
        title: "Applications Queue",
        url: "/applications/queue",
        icon: ClipboardList,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Updates",
    items: [
      {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
      },
    ],
  },
];

// Get navigation based on user role
export function getNavigationForRole(role: string): NavSection[] {
  if (role === 'district_officer' || role === 'state_officer') {
    return officerNavigation;
  }
  return ownerNavigation;
}

// Get default route for role
export function getDefaultRouteForRole(role: string): string {
  if (role === 'district_officer' || role === 'state_officer') {
    return '/workflow-monitoring';
  }
  return '/dashboard';
}
