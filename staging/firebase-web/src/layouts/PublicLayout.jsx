import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { MobileNavProvider } from "../components/MobileNavContext";
import { LayoutDashboard, Map, Bell, BookOpen, CalendarDays, FileWarning, Settings, MessageSquarePlus, Bug } from "lucide-react";

const navItems = [
  { to: "", labelKey: "navHome", icon: LayoutDashboard },
  { to: "/map", labelKey: "navRegionalMap", icon: Map },
  { to: "/alerts", labelKey: "navAlerts", icon: Bell },
  { to: "/reports", labelKey: "navCommunityReports", icon: FileWarning },
  { to: "/complaint", labelKey: "navSubmitReport", icon: MessageSquarePlus },
  { to: "/report-issue", labelKey: "navReportIssue", icon: Bug },
  { to: "/awareness", labelKey: "navAwareness", icon: BookOpen },
  { to: "/calendar", labelKey: "navCropCalendar", icon: CalendarDays },
  { to: "/settings", labelKey: "navSettings", icon: Settings },
];

export default function PublicLayout() {
  return (
    <MobileNavProvider>
    <div className="dashboard-shell flex min-h-screen bg-paper">
      <Sidebar navItems={navItems} roleLabelKey="rolePublic" basePath="/public" />
      <div className="flex-1 min-w-0 dashboard-content">
        <Outlet />
      </div>
    </div>
    </MobileNavProvider>
  );
}
