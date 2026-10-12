import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandPalette from "./components/CommandPalette";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CompleteProfile from "./pages/CompleteProfile";
import GuestDashboard from "./pages/GuestDashboard";
import DistrictDetail from "./pages/DistrictDetail";
import DistrictCompare from "./pages/DistrictCompare";
import CropCalendar from "./pages/CropCalendar";

import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import DroughtMap from "./pages/admin/DroughtMap";
import Predictions from "./pages/admin/Predictions";
import Alerts from "./pages/admin/Alerts";
import Complaints from "./pages/admin/Complaints";
import RequireAdminAuth from "./components/RequireAdminAuth";
import RequirePortalAuth from "./components/RequirePortalAuth";
import AdminPortalLayout from "./layouts/AdminPortalLayout";
import AdminPortalLogin from "./pages/adminportal/AdminPortalLogin";
import AdminPortalOverview from "./pages/adminportal/AdminPortalOverview";
import AdminPortalRequests from "./pages/adminportal/AdminPortalRequests";
import AdminPortalUsers from "./pages/adminportal/AdminPortalUsers";
import AdminPortalReports from "./pages/adminportal/AdminPortalReports";
import AdminPortalComplaints from "./pages/adminportal/AdminPortalComplaints";
import AdminPortalIssues from "./pages/adminportal/AdminPortalIssues";
import ReportIssue from "./pages/shared/ReportIssue";
import Reports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";

import FarmerLayout from "./layouts/FarmerLayout";
import FarmerHome from "./pages/farmer/FarmerHome";
import CropRecommendations from "./pages/farmer/CropRecommendations";
import IrrigationScheduler from "./pages/farmer/IrrigationScheduler";
import YieldRisk from "./pages/farmer/YieldRisk";
import FarmerAlerts from "./pages/farmer/FarmerAlerts";
import FarmerComplaints from "./pages/farmer/FarmerComplaints";
import FarmerSettings from "./pages/farmer/FarmerSettings";

import PublicLayout from "./layouts/PublicLayout";
import PublicHome from "./pages/public/PublicHome";
import RegionalMap from "./pages/public/RegionalMap";
import PublicAlerts from "./pages/public/PublicAlerts";
import CommunityReports from "./pages/public/CommunityReports";
import Awareness from "./pages/public/Awareness";
import PublicSettings from "./pages/public/PublicSettings";
import PublicComplaint from "./pages/public/PublicComplaint";

export default function App() {
  return (
    <BrowserRouter>
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/guest" element={<GuestDashboard />} />

        {/* Admin portal — full-system oversight: access requests, user directory, reports. Separate Google-account login from the phone/OTP login above. */}
        <Route path="/admin-portal/login" element={<AdminPortalLogin />} />
        <Route element={<RequireAdminAuth />}>
          <Route element={<AdminPortalLayout />}>
            <Route path="/admin-portal" element={<AdminPortalOverview />} />
            <Route path="/admin-portal/requests" element={<AdminPortalRequests />} />
            <Route path="/admin-portal/complaints" element={<AdminPortalComplaints />} />
            <Route path="/admin-portal/issues" element={<AdminPortalIssues />} />
            <Route path="/admin-portal/users" element={<AdminPortalUsers />} />
            <Route path="/admin-portal/reports" element={<AdminPortalReports />} />
          </Route>
        </Route>

        {/* PDMA Officer portal — protected by an approved PDMA session + fresh portal access grant. */}
        <Route element={<RequirePortalAuth role="pdma" />}>
          <Route element={<AdminLayout />}>
            <Route path="/pdma" element={<Dashboard />} />
            <Route path="/pdma/district/:id" element={<DistrictDetail />} />
            <Route path="/pdma/compare" element={<DistrictCompare />} />
            <Route path="/pdma/map" element={<DroughtMap />} />
            <Route path="/pdma/predictions" element={<Predictions />} />
            <Route path="/pdma/alerts" element={<Alerts />} />
            <Route path="/pdma/complaints" element={<Complaints />} />
            <Route path="/pdma/report-issue" element={<ReportIssue role="pdma" />} />
            <Route path="/pdma/reports" element={<Reports />} />
            <Route path="/pdma/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route element={<RequirePortalAuth role="farmer" />}>
          <Route element={<FarmerLayout />}>
            <Route path="/farmer" element={<FarmerHome />} />
            <Route path="/farmer/district/:id" element={<DistrictDetail />} />
            <Route path="/farmer/crops" element={<CropRecommendations />} />
            <Route path="/farmer/irrigation" element={<IrrigationScheduler />} />
            <Route path="/farmer/yield-risk" element={<YieldRisk />} />
            <Route path="/farmer/alerts" element={<FarmerAlerts />} />
            <Route path="/farmer/complaints" element={<FarmerComplaints />} />
            <Route path="/farmer/report-issue" element={<ReportIssue role="farmer" />} />
            <Route path="/farmer/calendar" element={<CropCalendar />} />
            <Route path="/farmer/settings" element={<FarmerSettings />} />
          </Route>
        </Route>

        <Route element={<RequirePortalAuth role="public" />}>
          <Route element={<PublicLayout />}>
            <Route path="/public" element={<PublicHome />} />
            <Route path="/public/district/:id" element={<DistrictDetail />} />
            <Route path="/public/map" element={<RegionalMap />} />
            <Route path="/public/alerts" element={<PublicAlerts />} />
            <Route path="/public/reports" element={<CommunityReports />} />
            <Route path="/public/complaint" element={<PublicComplaint />} />
            <Route path="/public/report-issue" element={<ReportIssue role="public" />} />
            <Route path="/public/awareness" element={<Awareness />} />
            <Route path="/public/calendar" element={<CropCalendar />} />
            <Route path="/public/settings" element={<PublicSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}