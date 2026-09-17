import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { UavSatelliteScheduler } from "@/components/system/UavSatelliteScheduler";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CitizenDashboardLayout from "./layouts/CitizenDashboardLayout.tsx";
import NgoDashboardLayout from "./layouts/NgoDashboardLayout.tsx";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NgoLogin from "./pages/NgoLogin.tsx";
import Signup from "./pages/Signup.tsx";
import NotFound from "./pages/NotFound.tsx";
import CitizenOverview from "./pages/dashboard/citizen/CitizenOverview.tsx";
import ReportPollution from "./pages/dashboard/citizen/ReportPollution.tsx";
import NearbyMapPage from "./pages/dashboard/citizen/NearbyMapPage.tsx";
import MyReports from "./pages/dashboard/citizen/MyReports.tsx";
import NotificationsPage from "./pages/dashboard/citizen/NotificationsPage.tsx";
import Rewards from "./pages/dashboard/citizen/Rewards.tsx";
import Profile from "./pages/dashboard/citizen/Profile.tsx";
import SettingsPage from "./pages/dashboard/citizen/SettingsPage.tsx";
import Help from "./pages/dashboard/citizen/Help.tsx";
import NgoOverview from "./pages/dashboard/ngo/NgoOverview.tsx";
import NgoMissions from "./pages/dashboard/ngo/NgoMissions.tsx";
import NgoAnalytics from "./pages/dashboard/ngo/NgoAnalytics.tsx";
import NgoResources from "./pages/dashboard/ngo/NgoResources.tsx";
import NgoCitizenRequests from "./pages/dashboard/ngo/NgoCitizenRequests.tsx";
import AdminDashboardLayout from "./layouts/AdminDashboardLayout.tsx";
import LoginAdmin from "./pages/LoginAdmin.tsx";
import AdminOverview from "./pages/dashboard/admin/AdminOverview.tsx";
import AdminCitizens from "./pages/dashboard/admin/AdminCitizens.tsx";
import AdminNgoInsights from "./pages/dashboard/admin/AdminNgoInsights.tsx";
import AdminWorkers from "./pages/dashboard/admin/AdminWorkers.tsx";
import AdminUavPlastic from "./pages/dashboard/admin/AdminUavPlastic.tsx";
import AdminAuthorityReview from "./pages/dashboard/admin/AdminAuthorityReview.tsx";
import AdminMissionProofReview from "./pages/dashboard/admin/AdminMissionProofReview.tsx";
import WorkerDashboardLayout from "./layouts/WorkerDashboardLayout.tsx";
import WorkerOverview from "./pages/dashboard/worker/WorkerOverview.tsx";
import WorkerMissions from "./pages/dashboard/worker/WorkerMissions.tsx";
import WorkerProfile from "./pages/dashboard/worker/WorkerProfile.tsx";

const queryClient = new QueryClient();

function App() {
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UavSatelliteScheduler />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/ngo" element={<NgoLogin />} />
            <Route path="/login/admin" element={<LoginAdmin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard/citizen" element={<CitizenDashboardLayout />}>
              <Route index element={<CitizenOverview />} />
              <Route path="report" element={<ReportPollution />} />
              <Route path="map" element={<NearbyMapPage />} />
              <Route path="my-reports" element={<MyReports />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="rewards" element={<Rewards />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="help" element={<Help />} />
            </Route>
            <Route path="/dashboard/ngo" element={<NgoDashboardLayout />}>
              <Route index element={<NgoOverview />} />
              <Route path="requests" element={<NgoCitizenRequests />} />
              <Route path="missions" element={<NgoMissions />} />
              <Route path="analytics" element={<NgoAnalytics />} />
              <Route path="resources" element={<NgoResources />} />
            </Route>
            <Route path="/dashboard/admin" element={<AdminDashboardLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="verify" element={<AdminAuthorityReview />} />
              <Route path="verify-cleanup" element={<AdminMissionProofReview />} />
              <Route path="citizens" element={<AdminCitizens />} />
              <Route path="ngo" element={<AdminNgoInsights />} />
              <Route path="workers" element={<AdminWorkers />} />
              <Route path="uav-plastic" element={<AdminUavPlastic />} />
            </Route>
            <Route path="/dashboard/worker" element={<WorkerDashboardLayout />}>
              <Route index element={<WorkerOverview />} />
              <Route path="missions" element={<WorkerMissions />} />
              <Route path="profile" element={<WorkerProfile />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
}

export default App;
