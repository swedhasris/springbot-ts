import React, { Suspense, lazy, useMemo } from"react";
import { useAuth } from"../contexts/AuthContext";
import { AccessRestricted } from"./AccessRestricted";
import { isRestrictedPath } from"./WorkspaceLayout";

// Lazy load page components to share chunks with App.tsx
const Dashboard = lazy(() => import("../pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Tickets = lazy(() => import("../pages/Tickets").then(m => ({ default: m.Tickets })));
const Timesheet = lazy(() => import("../pages/Timesheet").then(m => ({ default: m.Timesheet })));
const TimesheetWeekly = lazy(() => import("../pages/TimesheetWeekly").then(m => ({ default: m.TimesheetWeekly })));
const TimesheetReports = lazy(() => import("../pages/TimesheetReports").then(m => ({ default: m.TimesheetReports })));

const TicketDetail = lazy(() => import("../pages/TicketDetail").then(m => ({ default: m.TicketDetail })));
const GlobalHistory = lazy(() => import("../pages/GlobalHistory").then(m => ({ default: m.GlobalHistory })));
const SLAManagement = lazy(() => import("../pages/SLAManagement").then(m => ({ default: m.SLAManagement })));
const SLAManagementPremium = lazy(() => import("../pages/SLAManagementPremium").then(m => ({ default: m.SLAManagementPremium })));
const Approvals = lazy(() => import("../pages/Approvals").then(m => ({ default: m.Approvals })));
const Users = lazy(() => import("../pages/Users").then(m => ({ default: m.Users })));
const Reports = lazy(() => import("../pages/Reports").then(m => ({ default: m.Reports })));
const Settings = lazy(() => import("../pages/Settings").then(m => ({ default: m.Settings })));
const EmailIntegrations = lazy(() => import("../pages/EmailIntegrations").then(m => ({ default: m.EmailIntegrations })));
const MyDashboard = lazy(() => import("../pages/MyDashboard").then(m => ({ default: m.MyDashboard })));
const CMDB = lazy(() => import("../pages/CMDB").then(m => ({ default: m.CMDB })));
const Conversations = lazy(() => import("../pages/Conversations").then(m => ({ default: m.Conversations })));
const ProblemManagement = lazy(() => import("../pages/ProblemManagement").then(m => ({ default: m.ProblemManagement })));
const ChangeManagement = lazy(() => import("../pages/ChangeManagement").then(m => ({ default: m.ChangeManagement })));
const KnowledgeBase = lazy(() => import("../pages/KnowledgeBase").then(m => ({ default: m.KnowledgeBase })));
const ServicePortal = lazy(() => import("../pages/ServicePortal").then(m => ({ default: m.ServicePortal })));
const ServiceCatalog = lazy(() => import("../pages/ServiceCatalog").then(m => ({ default: m.ServiceCatalog })));
const Calendar = lazy(() => import("../pages/Calendar").then(m => ({ default: m.Calendar })));
const AccessControl = lazy(() => import("../pages/AccessControl").then(m => ({ default: m.AccessControl })));
const Leaderboard = lazy(() => import("../pages/Leaderboard").then(m => ({ default: m.Leaderboard })));
const ApprovedTickets = lazy(() => import("../pages/ApprovedTickets").then(m => ({ default: m.ApprovedTickets })));
const Companies = lazy(() => import("../pages/Companies").then(m => ({ default: m.Companies })));
const TimesheetApprovals = lazy(() => import("../pages/TimesheetApprovals").then(m => ({ default: m.TimesheetApprovals })));
const Groups = lazy(() => import("../pages/Groups").then(m => ({ default: m.Groups })));
const ClearUsers = lazy(() => import("../pages/ClearUsers").then(m => ({ default: m.ClearUsers })));
const BrandingSettings = lazy(() => import("../pages/BrandingSettings").then(m => ({ default: m.BrandingSettings })));
const ActivityTracker = lazy(() => import("../pages/ActivityTracker").then(m => ({ default: m.ActivityTracker })));
const DataAnalytics = lazy(() => import("../pages/DataAnalytics").then(m => ({ default: m.DataAnalytics })));
const IncidentCategoryManagement = lazy(() => import("../pages/IncidentCategoryManagement").then(m => ({ default: m.IncidentCategoryManagement })));
const GlobalSearch = lazy(() => import("../pages/GlobalSearch").then(m => ({ default: m.GlobalSearch })));
const MeetingManagement = lazy(() => import("../pages/MeetingManagement").then(m => ({ default: m.MeetingManagement })));
const CreateMeeting = lazy(() => import("../pages/CreateMeeting").then(m => ({ default: m.CreateMeeting })));
const TSMeetingLobby = lazy(() => import("../pages/TSMeetingLobby").then(m => ({ default: m.TSMeetingLobby })));
const TSMeetingRoom = lazy(() => import("../pages/TSMeetingRoom").then(m => ({ default: m.TSMeetingRoom })));
const ForecastingPlanning = lazy(() => import("../pages/ForecastingPlanning").then(m => ({ default: m.ForecastingPlanning })));
const CallLogs = lazy(() => import("../pages/calls/CallLogs").then(m => ({ default: m.CallLogs })));
const CreateCall = lazy(() => import("../pages/calls/CreateCall").then(m => ({ default: m.CreateCall })));
const CallDetail = lazy(() => import("../pages/calls/CallDetail").then(m => ({ default: m.CallDetail })));
const AIAssistant = lazy(() => import("../pages/ai/AIAssistant").then(m => ({ default: m.AIAssistant })));

/**
 * Maps a path string to a React component without using a nested Router.
 * This avoids the"Router inside Router" error entirely.
 */
function resolveComponent(path: string): React.ReactNode {
 const cleanPath = path.split("?")[0];

 // Static routes
 switch (cleanPath) {
 case"/my-dashboard":
 case"/":
 return <MyDashboard />;
 case"/dashboard":
 return <Dashboard />;
 case"/tickets":
 return <Tickets />;
 case"/history":
 return <GlobalHistory />;
 case"/sla":
 return <SLAManagement />;
 case"/sla-management":
 return <SLAManagementPremium />;
 case"/approvals":
 return <Approvals />;
 case"/users":
 return <Users />;
 case"/incident-categories":
 return <IncidentCategoryManagement />;
 case"/timesheet":
 return <Timesheet />;
 case"/timesheet/weekly":
 return <TimesheetWeekly />;
 case"/timesheet/reports":
 return <TimesheetReports />;
 case"/reports":
 return <Reports />;
 case"/forecasting-planning":
 return <ForecastingPlanning />;
 case"/catalog":
 return <ServiceCatalog />;
 case"/cmdb":
 return <CMDB />;
 case"/conversations":
 return <Conversations />;
 case"/problem":
 return <ProblemManagement />;
 case"/change":
 return <ChangeManagement />;
 case"/kb":
 return <KnowledgeBase />;
 case"/service-portal":
 return <ServicePortal />;
 case"/calendar":
 return <Calendar />;
 case"/access-control":
 return <AccessControl />;
 case"/leaderboard":
 return <Leaderboard />;
 case"/approved-tickets":
 return <ApprovedTickets />;
 case"/companies":
 case"/companies/new":
 return <Companies />;
 case"/timesheet-approvals":
 return <TimesheetApprovals />;
 case"/groups":
 return <Groups />;
 case"/clear-users":
 return <ClearUsers />;
 case"/email-integrations":
 return <EmailIntegrations />;
 case"/branding":
 return <BrandingSettings />;
 case"/settings":
 return <Settings />;
 case"/activity-tracker":
 return <ActivityTracker />;
 case"/data-analytics":
 return <DataAnalytics />;
 case"/global-search":
 return <GlobalSearch />;
 case"/meetings":
 return <MeetingManagement />;
 case"/create-meeting":
 return <CreateMeeting />;
 case"/calls":
 return <CallLogs />;
 case"/calls/new":
 return <CreateCall />;
 case"/ai-assistant":
 return <AIAssistant />;
 default:
 break;
 }

 // Dynamic routes – match patterns
 if (cleanPath.startsWith("/tickets/")) {
 return <TicketDetail />;
 }
 if (cleanPath.startsWith("/timesheet/") && cleanPath !=="/timesheet/weekly" && cleanPath !=="/timesheet/reports") {
 return <Timesheet />;
 }
 if (cleanPath.startsWith("/companies/")) {
 return <Companies />;
 }
 if (/^\/ts-meeting\/[^/]+\/lobby$/.test(cleanPath)) {
 return <TSMeetingLobby />;
 }
 if (/^\/ts-meeting\/[^/]+\/room$/.test(cleanPath)) {
 return <TSMeetingRoom />;
 }
 if (cleanPath.startsWith("/calls/")) {
 return <CallDetail />;
 }

 // Fallback
 return <MyDashboard />;
}

export function TabContentMapper({ path }: { path: string }) {
 const { profile } = useAuth();
 const restrictedModules = profile?.restrictedModules || [];

 const component = useMemo(() => {
 if (isRestrictedPath(path, restrictedModules)) {
 return <AccessRestricted />;
 }
 return resolveComponent(path);
 }, [path, restrictedModules]);

 return (
 <Suspense fallback={
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="w-8 h-8 border-4 border-sn-green border-t-transparent rounded-full animate-spin" />
 </div>
 }>
 {component}
 </Suspense>
 );
}
