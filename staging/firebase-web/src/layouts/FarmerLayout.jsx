import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { MobileNavProvider } from "../components/MobileNavContext";
import {
  LayoutDashboard, Sprout, Droplets, TrendingDown, Bell, FileWarning, CalendarDays, Settings, Bug,
} from "lucide-react";

const navItems = [
  { to: "", labelKey: "navHome", icon: LayoutDashboard },
  { to: "/crops", labelKey: "navCropRecommendations", icon: Sprout },
  { to: "/irrigation", labelKey: "navIrrigationScheduler", icon: Droplets },
  { to: "/yield-risk", labelKey: "navYieldRisk", icon: TrendingDown },
  { to: "/alerts", labelKey: "navAlerts", icon: Bell },
  { to: "/complaints", labelKey: "navComplaints", icon: FileWarning },
  { to: "/report-issue", labelKey: "navReportIssue", icon: Bug },
  { to: "/calendar", labelKey: "navCropCalendar", icon: CalendarDays },
  { to: "/settings", labelKey: "navSettings", icon: Settings },
];

export default function FarmerLayout() {
  return (
    <MobileNavProvider>
    <div className="dashboard-shell flex min-h-screen bg-paper">
      <Sidebar navItems={navItems} roleLabelKey="roleFarmer" basePath="/farmer" />
      <div className="flex-1 min-w-0 dashboard-content">
        <Outlet />
      </div>
    </div>
    </MobileNavProvider>
  );
}
