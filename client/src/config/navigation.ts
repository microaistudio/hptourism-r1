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
        title: "New Application",
        url: "/applications/new",
        icon: ClipboardList,
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
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "Workflow Monitoring",
        url: "/workflow-monitoring",
        icon: BarChart3,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
      },
    ],
  },
];

// Admin Navigation Menu
export const adminNavigation: NavSection[] = [
  {
    title: "Admin",
    items: [
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
      },
    ],
  },
];

// Get navigation based on user role
export function getNavigationForRole(role: string): NavSection[] {
  if (role === 'admin') {
    return adminNavigation;
  }
  if (role === 'district_officer' || role === 'state_officer') {
    return officerNavigation;
  }
  return ownerNavigation;
}

// Get default route for role
export function getDefaultRouteForRole(role: string): string {
  if (role === 'admin') {
    return '/admin/users';
  }
  // All roles now land on /dashboard with role-specific content
  return '/dashboard';
}
