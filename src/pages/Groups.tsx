import React, { useEffect, useState, useRef, useCallback } from"react";
import { useSearchParams } from"react-router-dom";
import { useAuth } from"../contexts/AuthContext";
import { cn } from"../lib/utils";
import {
 Search, Plus, Trash2, Edit2, Users as UsersIcon, X, Shield, Zap, Clock, Globe, UserCheck,
 BarChart3, Settings, ExternalLink, Mail, MapPin, Calendar as CalendarIcon, CheckSquare,
 Trophy, MessageCircle, BookOpen, ClipboardList, Send, Sparkles, AlertCircle, Play,
 CornerDownRight, User, CheckCircle2, ChevronRight, Download, BarChart2, ShieldAlert,
 Flame, LayoutDashboard, GitPullRequest, Map
} from"lucide-react";
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
 ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from"recharts";

// Reuse standard custom button
const Button = ({ className, ...props }: any) => (
 <button
 className={`px-4 py-2 rounded font-bold hover:opacity-90 active:scale-95 transition disabled:opacity-50 ${className}`}
 {...props}
 />
);

// Constants matching catalog
const GROUP_TYPES = ["Service Desk","Tier 2 Support","Engineering","Operations","Billing","Vendor Support"];
const GROUP_MEMBER_ROLES = ["Project Manager","Team Lead","Senior Developer","Support Engineer","QA Engineer","ROC Technician"];
const SKILL_LEVELS = ["Beginner","Intermediate","Advanced","Expert"];

export function Groups() {
 const { user, profile } = useAuth();
 const [searchParams] = useSearchParams();
 const [groups, setGroups] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [groupMembers, setGroupMembers] = useState<any[]>([]);
 const [selectedGroupId, setSelectedGroupId] = useState<string>("");
 const [activeTab, setActiveTab] = useState<string>("dashboard");

 useEffect(() => {
 const tab = searchParams.get("tab");
 if (tab) {
 setActiveTab(tab);
 }
 }, [searchParams]);

 // Core Data States
 const [tasks, setTasks] = useState<any[]>([]);
 const [events, setEvents] = useState<any[]>([]);
 const [plans, setPlans] = useState<any[]>([]);
 const [standups, setStandups] = useState<any[]>([]);
 const [ratings, setRatings] = useState<any[]>([]);
 const [discussions, setDiscussions] = useState<any[]>([]);
 const [articles, setArticles] = useState<any[]>([]);
 const [escalations, setEscalations] = useState<any[]>([]);

 // Modal / Form UI states
 const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
 const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
 const [isEventModalOpen, setIsEventModalOpen] = useState(false);
 const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
 const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
 const [isStandupModalOpen, setIsStandupModalOpen] = useState(false);
 const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
 const [isKBModalOpen, setIsKBModalOpen] = useState(false);
 const [isDiscModalOpen, setIsDiscModalOpen] = useState(false);

 // Search filters
 const [searchQuery, setSearchQuery] = useState("");
 const [userSearch, setUserSearch] = useState("");
 const [kbSearch, setKbSearch] = useState("");

 // Edit states
 const [selectedGroup, setSelectedGroup] = useState<any>(null);
 const [selectedTask, setSelectedTask] = useState<any>(null);
 const [selectedEvent, setSelectedEvent] = useState<any>(null);
 const [selectedArticle, setSelectedArticle] = useState<any>(null);

 // Form Initializers
 const INITIAL_GROUP_STATE = {
 name: '',
 code: '',
 description: '',
 email: '',
 type: 'Service Desk',
 managerId: '',
 managerName: '',
 leaderId: '',
 leaderName: '',
 projectName: '',
 department: '',
 businessHours: '09:00 - 18:00',
 timezone: 'UTC',
 escalationGroupId: '',
 parentGroupId: '',
 defaultAssigneeId: '',
 autoAssignmentEnabled: false,
 roundRobinEnabled: false,
 skillTags: '',
 queueCapacity: 50,
 region: 'Global',
 status: 'active'
 };

 const [groupForm, setGroupForm] = useState(INITIAL_GROUP_STATE);

 const [taskForm, setTaskForm] = useState({
 title:"",
 description:"",
 assigneeId:"",
 priority:"Medium",
 status:"To Do",
 storyPoints: 3,
 estimatedHours: 8,
 actualHours: 0,
 dueDate:""
 });

 const [eventForm, setEventForm] = useState({
 title:"",
 description:"",
 type:"Meeting",
 startDate:"",
 endDate:"",
 estimatedHours: 2,
 priority:"Medium",
 assigneeId:"",
 status:"Planned",
 dependencies:""
 });

 const [planForm, setPlanForm] = useState({
 type:"Weekly",
 objective:"",
 plannedWork: 40,
 actualWork: 0,
 completionRate: 0,
 delayRate: 0
 });

 const [standupForm, setStandupForm] = useState({
 yesterday:"",
 today:"",
 blockers:""
 });

 const [ratingForm, setRatingForm] = useState({
 userId:"",
 productivity: 5,
 quality: 5,
 attendance: 5,
 communication: 5,
 collaboration: 5,
 ownership: 5,
 frequency:"Weekly"
 });

 const [discForm, setDiscForm] = useState({
 type:"discussion",
 title:"",
 content:""
 });

 const [kbForm, setKbForm] = useState({
 title:"",
 content:"",
 category:"SOPs"
 });

 const refreshGroupsAndUsers = useCallback(async () => {
 try {
 const resGroups = await fetch("/api/settings_groups");
 if (resGroups.ok) {
 const data = await resGroups.json();
 setGroups(data);
 }
 const resUsers = await fetch("/api/users");
 if (resUsers.ok) {
 const data = await resUsers.json();
 setUsers(data);
 }
 const resMembers = await fetch("/api/settings_group_members");
 if (resMembers.ok) {
 const data = await resMembers.json();
 setGroupMembers(data);
 }
 } catch (err) {
 console.error("Error loading group/user lists:", err);
 }
 }, []);

 const refreshGroupDetails = useCallback(async (groupId: string) => {
 if (!groupId) return;
 try {
 const fetchJson = async (url: string) => {
 const res = await fetch(url);
 return res.ok ? res.json() : [];
 };

 const [
 tasksData,
 eventsData,
 plansData,
 standupsData,
 ratingsData,
 discussionsData,
 kbData,
 escalationsData
 ] = await Promise.all([
 fetchJson(`/api/settings/groups/${groupId}/tasks`),
 fetchJson(`/api/settings/groups/${groupId}/events`),
 fetchJson(`/api/settings/groups/${groupId}/plans`),
 fetchJson(`/api/settings/groups/${groupId}/standups`),
 fetchJson(`/api/settings/groups/${groupId}/ratings`),
 fetchJson(`/api/settings/groups/${groupId}/discussions`),
 fetchJson(`/api/settings/groups/${groupId}/kb`),
 fetchJson(`/api/settings/groups/${groupId}/escalations`)
 ]);

 setTasks(tasksData);
 setEvents(eventsData);
 setPlans(plansData);
 setStandups(standupsData);
 setRatings(ratingsData);
 setDiscussions(discussionsData);
 setArticles(kbData);
 setEscalations(escalationsData);
 } catch (err) {
 console.error("Error loading group details:", err);
 }
 }, []);

 // Load Groups, Users, and Members on mount
 useEffect(() => {
 refreshGroupsAndUsers();
 }, [refreshGroupsAndUsers]);

 // Set default group selection
 useEffect(() => {
 if (groups.length > 0 && !selectedGroupId) {
 const userGroup = groups.find(g => {
 const members = groupMembers.filter((m: any) => m.groupId === g.id);
 const memberIds = members.map((m: any) => m.userId);
 return memberIds.includes(user?.uid) ||
 g.managerId === user?.uid ||
 g.leaderId === user?.uid;
 });
 if (userGroup) {
 setSelectedGroupId(userGroup.id);
 } else {
 setSelectedGroupId(groups[0].id);
 }
 }
 }, [groups, user, selectedGroupId, groupMembers]);

 // Subscribe to selected group data
 useEffect(() => {
 if (selectedGroupId) {
 refreshGroupDetails(selectedGroupId);
 }
 }, [selectedGroupId, refreshGroupDetails]);

 // Seeder for empty groups
 useEffect(() => {
 if (selectedGroupId && tasks.length === 0 && events.length === 0 && groups.length > 0) {
 seedGroupData(selectedGroupId);
 }
 }, [selectedGroupId, tasks.length, events.length, groups]);

 const activeGroupMembers = groupMembers.filter((m: any) => m.groupId === selectedGroupId);
 const activeGroupMemberIds = activeGroupMembers.map((m: any) => m.userId);

 const activeGroup = groups.find(g => g.id === selectedGroupId) ? {
 ...groups.find(g => g.id === selectedGroupId),
 memberIds: activeGroupMemberIds,
 memberCount: activeGroupMemberIds.length
 } : null;

 // Resolve Permissions
 const isAdmin = profile?.role ==="admin" || profile?.role ==="super_admin" || profile?.role ==="ultra_super_admin";
 const isPM = activeGroup?.managerId === user?.uid;
 const isTL = activeGroup?.leaderId === user?.uid;
 const isMember = (activeGroup?.memberIds || []).includes(user?.uid) || (activeGroup?.memberIds || []).includes(profile?.id);

 const canManageGroup = isAdmin || isPM;
 const canPlanOrRate = isAdmin || isPM || isTL;

 // Seed default data for Groups
 const seedGroupData = async (groupId: string) => {
 try {
 const postData = async (url: string, payload: any) => {
 await fetch(url, {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(payload)
 });
 };

 // Seed tasks
 const defaultTasks = [
 { title:"Implement Auth Middleware", description:"Review and secure JWT expiration handlers", assigneeId: user?.uid ||"", assigneeName: profile?.name ||"Support", priority:"High", status:"In Progress", storyPoints: 5, estimatedHours: 10, actualHours: 4 },
 { title:"Refactor Database Pools", description:"Increase maximum HikariCP pool size to 30", assigneeId:"user_arun", assigneeName:"Arun G", priority:"Critical", status:"Review", storyPoints: 8, estimatedHours: 16, actualHours: 15 },
 { title:"Design Sprint Dashboard Mock", description:"Create premium glassmorphic layout mockups", assigneeId: user?.uid ||"", assigneeName: profile?.name ||"Support", priority:"Low", status:"Done", storyPoints: 3, estimatedHours: 6, actualHours: 6 },
 { title:"SLA Monitoring Cron Job", description:"Schedule automatic ticket escalations", assigneeId:"user_swedhasri", assigneeName:"Swedhasri", priority:"High", status:"To Do", storyPoints: 5, estimatedHours: 12, actualHours: 0 }
 ];
 for (const t of defaultTasks) {
 await postData(`/api/settings/groups/${groupId}/tasks`, t);
 }

 // Seed calendar events
 const defaultEvents = [
 { title:"Sprint 1 Kickoff", description:"Discuss objectives and plan tasks", type:"Meeting", startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], estimatedHours: 1, priority:"Medium", assigneeId: user?.uid ||"", status:"Completed", dependencies:"" },
 { title:"Production Deployment", description:"Deploy core-service microservice to Render", type:"Deployment", startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], estimatedHours: 2, priority:"Critical", assigneeId:"user_arun", status:"Planned", dependencies:"" }
 ];
 for (const e of defaultEvents) {
 await postData(`/api/settings/groups/${groupId}/events`, e);
 }

 // Seed wiki articles
 const defaultArticles = [
 { title:"Release Management SOP", content:"Instructions for building and deploying microservices on Render.", category:"SOPs", authorName:"PM System", updatedAt: new Date().toISOString() },
 { title:"SMTP Configuration FAQs", content:"Common connection errors and auth fallback rules.", category:"FAQ", authorName:"TL System", updatedAt: new Date().toISOString() }
 ];
 for (const a of defaultArticles) {
 await postData(`/api/settings/groups/${groupId}/kb`, a);
 }

 // Seed plans
 const defaultPlans = [
 { type:"Weekly", objective:"Resolve open priority tickets and prepare release", plannedWork: 40, actualWork: 38, completionRate: 95, delayRate: 5 },
 { type:"Daily", objective:"Daily standup and core features review", plannedWork: 8, actualWork: 8, completionRate: 100, delayRate: 0 }
 ];
 for (const p of defaultPlans) {
 await postData(`/api/settings/groups/${groupId}/plans`, p);
 }

 // Seed standups
 const defaultStandups = [
 { userName:"Arun G", yesterday:"Completed the Email controller fixes", today:"Testing SLA policy escalations", blockers:"Waiting for SMTP server logs access", date: new Date().toISOString().split('T')[0] },
 { userName:"Swedhasri", yesterday:"Wrote UI test scenarios", today:"Implementing Groups dashboard components", blockers:"None", date: new Date().toISOString().split('T')[0] }
 ];
 for (const s of defaultStandups) {
 await postData(`/api/settings/groups/${groupId}/standups`, s);
 }

 // Seed ratings
 const defaultRatings = [
 { userName: profile?.name ||"Support", productivity: 5, quality: 4, attendance: 5, communication: 4, collaboration: 5, ownership: 5, score: 4.6, frequency:"Weekly", date: new Date().toISOString().split('T')[0], ratedBy:"System Manager" }
 ];
 for (const r of defaultRatings) {
 await postData(`/api/settings/groups/${groupId}/ratings`, r);
 }

 // Seed discussions
 const defaultDiscs = [
 { type:"announcement", title:"New Team Dashboard Released!", content:"Welcome to the Groups workspace. Please log your daily standups in the discussions center.", authorName:"System", createdAt: new Date().toISOString() },
 { type:"discussion", title:"Sprint Goal 1 Discussion", content:"What story points allocation is realistic for the CMDB fixes?", authorName:"Arun G", createdAt: new Date().toISOString() }
 ];
 for (const d of defaultDiscs) {
 await postData(`/api/settings/groups/${groupId}/discussions`, d);
 }

 refreshGroupDetails(groupId);
 } catch (err) {
 console.error("Error seeding group details:", err);
 }
 };

 // Group creation & editing handlers
 const handleSaveGroup = async () => {
 if (!groupForm.name) return;
 try {
 const pmName = groupForm.managerId ? users.find(u => u.id === groupForm.managerId || u.uid === groupForm.managerId)?.name ||"" :"";
 const tlName = groupForm.leaderId ? users.find(u => u.id === groupForm.leaderId || u.uid === groupForm.leaderId)?.name ||"" :"";

 const data = {
 name: groupForm.name,
 code: groupForm.code,
 description: groupForm.description,
 email: groupForm.email,
 type: groupForm.type,
 managerId: groupForm.managerId,
 managerName: pmName,
 leaderId: groupForm.leaderId,
 leaderName: tlName,
 projectName: groupForm.projectName,
 department: groupForm.department,
 businessHours: groupForm.businessHours,
 timezone: groupForm.timezone,
 escalationGroupId: groupForm.escalationGroupId,
 parentGroupId: groupForm.parentGroupId,
 defaultAssigneeId: groupForm.defaultAssigneeId,
 autoAssignmentEnabled: groupForm.autoAssignmentEnabled,
 roundRobinEnabled: groupForm.roundRobinEnabled,
 skillTags: typeof groupForm.skillTags ==="string" ? groupForm.skillTags.split(",").map(s => s.trim()).filter(Boolean) : [],
 queueCapacity: Number(groupForm.queueCapacity),
 region: groupForm.region,
 status: groupForm.status,
 updatedAt: new Date().toISOString(),
 updatedBy: profile?.name || 'System'
 };

 const method = selectedGroup ?"PUT" :"POST";
 const url = selectedGroup ? `/api/settings_groups/${selectedGroup.id}` :"/api/settings_groups";
 const res = await fetch(url, {
 method,
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 ...data,
 managerUid: groupForm.managerId,
 managerName: pmName,
 assignmentEmail: groupForm.email,
 isActive: groupForm.status === 'active',
 companyId: profile?.companyId || null
 })
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);
 const savedGroup = await res.json();
 if (!selectedGroup && savedGroup?.id) {
 setSelectedGroupId(savedGroup.id);
 }
 setIsGroupModalOpen(false);
 refreshGroupsAndUsers();
 } catch (e: any) {
 alert("Error saving group:" + e.message);
 }
 };

 const handleDeleteGroup = async (group: any) => {
 if (!confirm(`Delete group ${group.name}?`)) return;
 try {
 const res = await fetch(`/api/settings_groups/${group.id}`, { method:"DELETE" });
 if (!res.ok) throw new Error("HTTP error" + res.status);
 setSelectedGroupId("");
 refreshGroupsAndUsers();
 } catch (e: any) {
 alert("Error deleting group:" + e.message);
 }
 };

 const handleAddMember = async (userId: string) => {
 if (!selectedGroupId) return;
 try {
 const u = users.find(usr => usr.id === userId || usr.uid === userId);
 const res = await fetch("/api/settings_group_members", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 userId: userId,
 userName: u?.name ||"Support Staff",
 userEmail: u?.email ||"",
 groupId: selectedGroupId,
 roleInGroup:"Support Engineer",
 isPrimary: false,
 availabilityStatus: u?.availabilityStatus ||"available",
 currentWorkload: 0,
 skills:"",
 status:"active",
 createdBy: profile?.name ||"System"
 })
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);
 refreshGroupsAndUsers();
 } catch (e: any) {
 alert("Failed to add member:" + e.message);
 }
 };

 const handleRemoveMember = async (userId: string) => {
 if (!selectedGroupId) return;
 try {
 const memRecord = groupMembers.find((m: any) => m.groupId === selectedGroupId && (m.userId === userId || m.user_id === userId));
 if (!memRecord) {
 alert("Member record not found in this group.");
 return;
 }
 const res = await fetch(`/api/settings_group_members/${memRecord.id}`, { method:"DELETE" });
 if (!res.ok) throw new Error("HTTP error" + res.status);
 refreshGroupsAndUsers();
 } catch (e: any) {
 alert("Failed to remove member:" + e.message);
 }
 };

 // Task Handlers
 const handleSaveTask = async () => {
 if (!taskForm.title || !selectedGroupId) return;
 try {
 const assigneeName = taskForm.assigneeId ? users.find(u => u.id === taskForm.assigneeId || u.uid === taskForm.assigneeId)?.name ||"" :"Unassigned";
 const data = {
 title: taskForm.title,
 description: taskForm.description,
 assigneeId: taskForm.assigneeId,
 assigneeName: assigneeName,
 priority: taskForm.priority,
 status: taskForm.status,
 storyPoints: Number(taskForm.storyPoints),
 estimatedHours: Number(taskForm.estimatedHours),
 actualHours: Number(taskForm.actualHours),
 dueDate: taskForm.dueDate,
 groupId: selectedGroupId
 };

 const method = selectedTask ?"PUT" :"POST";
 const url = selectedTask 
 ? `/api/settings/groups/${selectedGroupId}/tasks/${selectedTask.id}`
 : `/api/settings/groups/${selectedGroupId}/tasks`;

 const res = await fetch(url, {
 method,
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setIsTaskModalOpen(false);
 setSelectedTask(null);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error saving task:" + e.message);
 }
 };

 // Drag and drop or simple movement simulation for Kanban board
 const moveTaskStatus = async (taskId: string, newStatus: string) => {
 try {
 const res = await fetch(`/api/settings/groups/${selectedGroupId}/tasks/${taskId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ status: newStatus })
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 console.error("Failed to move task:", e.message);
 }
 };

 // Calendar Event Handlers
 const handleSaveEvent = async () => {
 if (!eventForm.title || !selectedGroupId) return;
 try {
 const data = {
 ...eventForm,
 estimatedHours: Number(eventForm.estimatedHours),
 groupId: selectedGroupId
 };

 const method = selectedEvent ?"PUT" :"POST";
 const url = selectedEvent 
 ? `/api/settings/groups/${selectedGroupId}/events/${selectedEvent.id}`
 : `/api/settings/groups/${selectedGroupId}/events`;

 const res = await fetch(url, {
 method,
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setIsEventModalOpen(false);
 setSelectedEvent(null);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error saving calendar event:" + e.message);
 }
 };

 // Planning Handlers
 const handleSavePlan = async () => {
 if (!planForm.objective || !selectedGroupId) return;
 try {
 const accuracy = planForm.actualWork > 0 ? Math.round((planForm.plannedWork / planForm.actualWork) * 100) : 0;
 const data = {
 ...planForm,
 plannedWork: Number(planForm.plannedWork),
 actualWork: Number(planForm.actualWork),
 completionRate: planForm.completionRate,
 delayRate: planForm.delayRate,
 groupId: selectedGroupId
 };

 const res = await fetch(`/api/settings/groups/${selectedGroupId}/plans`, {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setIsPlanModalOpen(false);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error saving plan:" + e.message);
 }
 };

 // Daily Standup Submission
 const handleSaveStandup = async () => {
 if (!selectedGroupId || !user) return;
 try {
 const data = {
 ...standupForm,
 userId: user.uid,
 userName: profile?.name || user.email ||"Support",
 date: new Date().toISOString().split('T')[0],
 groupId: selectedGroupId
 };

 const res = await fetch(`/api/settings/groups/${selectedGroupId}/standups`, {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setStandupForm({ yesterday:"", today:"", blockers:"" });
 setIsStandupModalOpen(false);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error submitting standup:" + e.message);
 }
 };

 // Performance Rating Submit
 const handleSaveRating = async () => {
 if (!ratingForm.userId || !selectedGroupId) return;
 try {
 const targetUser = users.find(u => u.id === ratingForm.userId || u.uid === ratingForm.userId);
 const score = Number(((ratingForm.productivity + ratingForm.quality + ratingForm.attendance + ratingForm.communication + ratingForm.collaboration + ratingForm.ownership) / 6).toFixed(1));

 const data = {
 ...ratingForm,
 score,
 userName: targetUser?.name || targetUser?.email ||"Support",
 date: new Date().toISOString().split('T')[0],
 ratedBy: profile?.name ||"System Manager",
 groupId: selectedGroupId
 };

 const res = await fetch(`/api/settings/groups/${selectedGroupId}/ratings`, {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setIsRatingModalOpen(false);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error saving rating:" + e.message);
 }
 };

 // KB articles save
 const handleSaveKB = async () => {
 if (!kbForm.title || !selectedGroupId) return;
 try {
 const data = {
 ...kbForm,
 groupId: selectedGroupId,
 authorName: profile?.name ||"Support",
 updatedAt: new Date().toISOString()
 };

 const method = selectedArticle ?"PUT" :"POST";
 const url = selectedArticle 
 ? `/api/settings/groups/${selectedGroupId}/kb/${selectedArticle.id}`
 : `/api/settings/groups/${selectedGroupId}/kb`;

 const res = await fetch(url, {
 method,
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setIsKBModalOpen(false);
 setSelectedArticle(null);
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error saving KB article:" + e.message);
 }
 };

 // Discussions thread save
 const handleSaveDisc = async () => {
 if (!discForm.title || !selectedGroupId) return;
 try {
 const data = {
 ...discForm,
 groupId: selectedGroupId,
 authorName: profile?.name ||"Support",
 createdAt: new Date().toISOString()
 };

 const res = await fetch(`/api/settings/groups/${selectedGroupId}/discussions`, {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(data)
 });
 if (!res.ok) throw new Error("HTTP error" + res.status);

 setIsDiscModalOpen(false);
 setDiscForm({ type:"discussion", title:"", content:"" });
 refreshGroupDetails(selectedGroupId);
 } catch (e: any) {
 alert("Error posting discussion:" + e.message);
 }
 };

 // CSV/Text Export Helper Simulation
 const handleExport = (reportName: string, data: any[]) => {
 const csvContent ="data:text/csv;charset=utf-8,"
 + ["Export Report:" + reportName].join("\n") +"\n\n"
 + data.map(e => Object.values(e).join(",")).join("\n");
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `${reportName.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 // Render Functions for Sub-modules
 const renderDashboard = () => {
 // Analytics calculations
 const totalM = (activeGroup?.memberIds || []).length;
 const activeM = (activeGroup?.memberIds || []).filter(id => users.find(u => u.id === id)?.availabilityStatus === 'available').length;
 const absentM = (activeGroup?.memberIds || []).filter(id => users.find(u => u.id === id)?.availabilityStatus === 'away').length;
 const openT = tasks.filter(t => t.status !=="Done").length;
 const completedT = tasks.filter(t => t.status ==="Done").length;
 const openTickets = activeGroup?.openTickets || 0;

 // Charts Mock Data
 const productivityData = [
 { name:"Mon", score: 82 },
 { name:"Tue", score: 85 },
 { name:"Wed", score: 89 },
 { name:"Thu", score: 87 },
 { name:"Fri", score: 92 }
 ];

 const monthlyProductivity = [
 { name:"Jan", points: 45 },
 { name:"Feb", points: 52 },
 { name:"Mar", points: 68 },
 { name:"Apr", points: 74 },
 { name:"May", points: 90 }
 ];

 const resolutionTrend = [
 { name:"W1", resolved: 12, created: 15 },
 { name:"W2", resolved: 18, created: 16 },
 { name:"W3", resolved: 22, created: 20 },
 { name:"W4", resolved: 25, created: 21 }
 ];

 const attendanceTrend = [
 { name:"W1", rate: 95 },
 { name:"W2", rate: 98 },
 { name:"W3", rate: 92 },
 { name:"W4", rate: 96 }
 ];

 const timesheetUtilization = [
 { name:"Billable", value: 65, color:"#10B981" },
 { name:"Non-Billable", value: 25, color:"#3B82F6" },
 { name:"Internal", value: 10, color:"#F59E0B" }
 ];

 const completionTrend = [
 { name:"Sprint 1", completed: 10 },
 { name:"Sprint 2", completed: 25 },
 { name:"Sprint 3", completed: 42 }
 ];

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Group Dashboard</h2>
 <p className="text-xs text-muted-foreground">Overview for {activeGroup?.name ||"Unselected Group"}</p>
 </div>
 </div>

 {/* KPIs Row */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 {[
 { label:"Total Members", value: totalM, desc:"Assigned staff", color:"text-blue-600 dark:text-blue-400" },
 { label:"Active Members", value: activeM, desc: `${activeM} / ${totalM} online`, color:"text-emerald-600" },
 { label:"Open Tasks", value: openT, desc:"Pending work", color:"text-amber-500" },
 { label:"Open Tickets", value: openTickets, desc:"IT incidents", color:"text-rose-500" },
 { label:"Team Health", value:"92%", desc:"Healthy Status", color:"text-indigo-600 dark:text-indigo-400" }
 ].map(k => (
 <div key={k.label} className="bg-white dark:bg-slate-900 border border-border p-4 rounded-xl shadow-sm">
 <span className="text-[10px] uppercase font-bold text-muted-foreground block">{k.label}</span>
 <span className={`text-3xl font-bold block my-1.5 ${k.color}`}>{k.value}</span>
 <span className="text-[10px] text-muted-foreground font-medium block">{k.desc}</span>
 </div>
 ))}
 </div>

 {/* Charts Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Chart 1 */}
 <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-border">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Weekly Productivity Score</h3>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={productivityData}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
 <YAxis stroke="#9CA3AF" fontSize={10} />
 <Tooltip />
 <Bar dataKey="score" fill="#10B981" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Chart 2 */}
 <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-border">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Monthly Points Delivered</h3>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={monthlyProductivity}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
 <YAxis stroke="#9CA3AF" fontSize={10} />
 <Tooltip />
 <Area type="monotone" dataKey="points" stroke="#3B82F6" fillOpacity={0.1} fill="#3B82F6" />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Chart 3 */}
 <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-border">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Ticket Resolution Trend</h3>
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={resolutionTrend}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
 <YAxis stroke="#9CA3AF" fontSize={10} />
 <Tooltip />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 <Line type="monotone" dataKey="resolved" stroke="#10B981" activeDot={{ r: 8 }} />
 <Line type="monotone" dataKey="created" stroke="#EF4444" />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Chart 4 */}
 <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-border">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Timesheet Hours Allocation</h3>
 <div className="h-64 flex items-center justify-center">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={timesheetUtilization}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={80}
 paddingAngle={5}
 dataKey="value"
 >
 {timesheetUtilization.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip />
 <Legend wrapperStyle={{ fontSize: 10 }} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderTeams = () => {
 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Teams & Hierarchy</h2>
 <p className="text-xs text-muted-foreground">Manage organization hierarchy and group details</p>
 </div>
 {canManageGroup && (
 <Button
 onClick={() => {
 setSelectedGroup(null);
 setGroupForm(INITIAL_GROUP_STATE);
 setIsGroupModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> Create Group
 </Button>
 )}
 </div>

 {/* Selected Group details */}
 {activeGroup ? (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Tree hierarchy visualization */}
 <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-6">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organizational Hierarchy</h3>

 <div className="flex flex-col items-center space-y-8 py-4">
 {/* PM node */}
 <div className="w-64 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl text-center shadow-sm">
 <span className="text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">Project Manager (PM)</span>
 <p className="text-sm font-bold text-sn-dark dark:text-white mt-1">{activeGroup.managerName ||"Unassigned"}</p>
 </div>

 <div className="h-8 w-0.5 bg-border" />

 {/* TL node */}
 <div className="w-64 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl text-center shadow-sm">
 <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Team Leader (TL)</span>
 <p className="text-sm font-bold text-sn-dark dark:text-white mt-1">{activeGroup.leaderName ||"Unassigned"}</p>
 </div>

 <div className="h-8 w-0.5 bg-border" />

 {/* Members node */}
 <div className="w-full">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center block mb-4">Team Members</span>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 {(activeGroup.memberIds || []).map((id: string) => {
 const u = users.find(usr => usr.id === id || usr.uid === id);
 return (
 <div key={id} className="border border-border p-3 rounded-lg text-center bg-card shadow-sm">
 <p className="text-xs font-bold text-sn-dark dark:text-white truncate">{u?.name || u?.email ||"Team Member"}</p>
 <span className="text-[9px] text-muted-foreground font-medium truncate block">{u?.email ||"No email"}</span>
 </div>
 );
 })}
 {(activeGroup.memberIds || []).length === 0 && (
 <div className="col-span-full py-6 text-center text-xs text-muted-foreground italic bg-muted/10 border border-dashed border-border rounded-lg">
 No team members assigned to this group.
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Config & quick stats */}
 <div className="space-y-6">
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Details</h3>
 <div className="space-y-3 text-xs">
 <div className="flex justify-between border-b border-border/50 pb-2">
 <span className="text-muted-foreground font-semibold">Project Name</span>
 <span className="font-bold text-sn-dark dark:text-white">{activeGroup.projectName ||"N/A"}</span>
 </div>
 <div className="flex justify-between border-b border-border/50 pb-2">
 <span className="text-muted-foreground font-semibold">Department</span>
 <span className="font-bold text-sn-dark dark:text-white">{activeGroup.department ||"N/A"}</span>
 </div>
 <div className="flex justify-between border-b border-border/50 pb-2">
 <span className="text-muted-foreground font-semibold">Email Directory</span>
 <span className="font-medium text-sn-dark dark:text-white truncate max-w-[160px]">{activeGroup.email ||"N/A"}</span>
 </div>
 <div className="flex justify-between border-b border-border/50 pb-2">
 <span className="text-muted-foreground font-semibold">Group Code</span>
 <span className="font-bold text-sn-dark dark:text-white">{activeGroup.code ||"N/A"}</span>
 </div>
 <div className="flex justify-between pb-1">
 <span className="text-muted-foreground font-semibold">Region</span>
 <span className="font-bold text-sn-dark dark:text-white">{activeGroup.region ||"Global"}</span>
 </div>
 </div>

 {canManageGroup && (
 <div className="pt-4 flex gap-2">
 <Button
 onClick={() => {
 setSelectedGroup(activeGroup);
 setGroupForm({
 name: activeGroup.name,
 code: activeGroup.code || '',
 description: activeGroup.description || '',
 email: activeGroup.email || '',
 type: activeGroup.type || 'Service Desk',
 managerId: activeGroup.managerId || '',
 managerName: activeGroup.managerName || '',
 leaderId: activeGroup.leaderId || '',
 leaderName: activeGroup.leaderName || '',
 projectName: activeGroup.projectName || '',
 department: activeGroup.department || '',
 businessHours: activeGroup.businessHours || '09:00 - 18:00',
 timezone: activeGroup.timezone || 'UTC',
 escalationGroupId: activeGroup.escalationGroupId || '',
 parentGroupId: activeGroup.parentGroupId || '',
 defaultAssigneeId: activeGroup.defaultAssigneeId || '',
 autoAssignmentEnabled: activeGroup.autoAssignmentEnabled || false,
 roundRobinEnabled: activeGroup.roundRobinEnabled || false,
 skillTags: Array.isArray(activeGroup.skillTags) ? activeGroup.skillTags.join(', ') : (activeGroup.skillTags || ''),
 queueCapacity: activeGroup.queueCapacity || 50,
 region: activeGroup.region || 'Global',
 status: activeGroup.status || 'active'
 });
 setIsGroupModalOpen(true);
 }}
 className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider py-2"
 >
 Edit Config
 </Button>
 <Button
 onClick={() => setIsMemberModalOpen(true)}
 className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider py-2"
 >
 Manage Staff
 </Button>
 </div>
 )}
 </div>
 </div>
 </div>
 ) : (
 <div className="py-20 text-center text-muted-foreground italic text-sm border-2 border-dashed border-border rounded-xl">
 Please create a group to begin configuring hierarchy.
 </div>
 )}
 </div>
 );
 };

 const renderMembers = () => {
 // Workload calculation
 const workloadLimit = 40;

 const currentMembers = activeGroup
 ? users.filter(u => (activeGroup.memberIds || []).includes(u.id) || (activeGroup.memberIds || []).includes(u.uid))
 : [];

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Members Workload & Skills</h2>
 <p className="text-xs text-muted-foreground">Monitor capacity allocation and skill matrices</p>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
 {/* Workload list */}
 <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Allocations</h3>

 <div className="space-y-4">
 {currentMembers.map(u => {
 const assignedTasks = tasks.filter(t => t.assigneeId === u.id || t.assigneeId === u.uid);
 const allocatedHrs = assignedTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
 const workloadPercent = Math.min(Math.round((allocatedHrs / workloadLimit) * 100), 150);

 let indicatorColor ="bg-emerald-500";
 let badgeText ="Available";
 let textClass ="text-emerald-600";
 if (workloadPercent >= 80 && workloadPercent <= 100) {
 indicatorColor ="bg-amber-500";
 badgeText ="Busy";
 textClass ="text-amber-600";
 } else if (workloadPercent > 100) {
 indicatorColor ="bg-rose-500";
 badgeText ="Overloaded";
 textClass ="text-rose-600";
 }

 return (
 <div key={u.id} className="p-4 border border-border rounded-xl flex items-center justify-between shadow-sm">
 <div className="space-y-1 flex-grow pr-6">
 <div className="flex items-center gap-2">
 <span className="font-bold text-sm text-sn-dark dark:text-white">{u.name || u.email}</span>
 <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-full border border-current ${textClass}`}>{badgeText}</span>
 </div>
 <p className="text-[10px] text-muted-foreground">{u.email}</p>

 <div className="pt-2 flex items-center gap-2">
 <div className="flex-grow bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
 <div className={cn("h-full rounded-full", indicatorColor)} style={{ width: `${Math.min(workloadPercent, 100)}%` }} />
 </div>
 <span className="text-[10px] font-bold text-muted-foreground">{allocatedHrs}h / {workloadLimit}h</span>
 </div>
 </div>
 </div>
 );
 })}

 {currentMembers.length === 0 && (
 <div className="py-10 text-center italic text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/5">
 No members in selected group.
 </div>
 )}
 </div>
 </div>

 {/* Skills Grid */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Skill Matrix</h3>

 <div className="relative mb-4">
 <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search skills (e.g. React)..."
 value={userSearch}
 onChange={e => setUserSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800"
 />
 </div>

 <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
 {currentMembers.map(u => {
 const skills = (activeGroup?.skillTags || []).join(",") ||"No specific tags";
 return (
 <div key={u.id} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1.5">
 <span className="font-bold text-sn-dark dark:text-white block">{u.name || u.email}</span>
 <div className="flex justify-between text-[10px]">
 <span className="text-muted-foreground">Role:</span>
 <span className="font-semibold">{u.role ||"Support Staff"}</span>
 </div>
 <div className="flex justify-between text-[10px]">
 <span className="text-muted-foreground">Region:</span>
 <span className="font-semibold">{activeGroup?.region ||"Global"}</span>
 </div>
 <div className="pt-1.5 border-t border-border/40">
 <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground block mb-0.5">Assigned Group Skills</span>
 <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{skills}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderCalendar = () => {
 // Basic calendar view
 const today = new Date();
 const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
 const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

 const getStatusColor = (status: string) => {
 switch (status) {
 case"Completed": return"bg-green-500 text-white";
 case"In Progress": return"bg-amber-500 text-white";
 case"Delayed": return"bg-rose-500 text-white";
 default: return"bg-blue-500 text-white";
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Smart Team Calendar</h2>
 <p className="text-xs text-muted-foreground">Coordinate sprints, leaves, meetings, and releases</p>
 </div>
 {canPlanOrRate && (
 <Button
 onClick={() => {
 setSelectedEvent(null);
 setEventForm({
 title:"",
 description:"",
 type:"Meeting",
 startDate: new Date().toISOString().split('T')[0],
 endDate: new Date().toISOString().split('T')[0],
 estimatedHours: 2,
 priority:"Medium",
 assigneeId:"",
 status:"Planned",
 dependencies:""
 });
 setIsEventModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> Create Event
 </Button>
 )}
 </div>

 {/* Legend */}
 <div className="flex items-center gap-4 text-xs font-semibold p-3 bg-white dark:bg-slate-900 border border-border rounded-xl">
 <span className="text-muted-foreground">Legend:</span>
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Planned</span>
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress</span>
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Completed On Time</span>
 <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Delayed</span>
 </div>

 {/* Monthly Grid Grid View */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border">
 <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
 <h3 className="font-bold text-sm uppercase tracking-wide">
 {today.toLocaleString("default", { month:"long" })} {today.getFullYear()}
 </h3>
 <div className="flex gap-1.5 text-[10px] font-bold uppercase">
 <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded">Monthly View</span>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-muted-foreground mb-2">
 <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
 </div>

 <div className="grid grid-cols-7 gap-2 auto-rows-[120px]">
 {/* Pad calendar start day */}
 {Array.from({ length: new Date(today.getFullYear(), today.getMonth(), 1).getDay() }).map((_, idx) => (
 <div key={`pad-${idx}`} className="bg-muted/10 border border-border/50 rounded-lg p-2 opacity-50" />
 ))}

 {daysArray.map(day => {
 const dayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 const dayEvents = events.filter(e => e.startDate === dayStr || e.endDate === dayStr);

 return (
 <div key={day} className="border border-border rounded-lg p-2 bg-card overflow-y-auto flex flex-col justify-between hover:border-sn-green/30 transition-all duration-200">
 <span className="font-bold text-xs text-muted-foreground block">{day}</span>
 <div className="space-y-1 mt-1 flex-grow">
 {dayEvents.map(e => (
 <div
 key={e.id}
 onClick={() => {
 if (canPlanOrRate) {
 setSelectedEvent(e);
 setEventForm({
 title: e.title,
 description: e.description,
 type: e.type,
 startDate: e.startDate,
 endDate: e.endDate,
 estimatedHours: e.estimatedHours,
 priority: e.priority,
 assigneeId: e.assigneeId,
 status: e.status,
 dependencies: e.dependencies ||""
 });
 setIsEventModalOpen(true);
 }
 }}
 className={cn("text-[9px] p-1 rounded font-bold truncate cursor-pointer", getStatusColor(e.status))}
 title={`${e.type}: ${e.title}`}
 >
 {e.title}
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
 };

 const renderPlanning = () => {
 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Target Planning Center</h2>
 <p className="text-xs text-muted-foreground">Define daily, weekly, monthly, or quarterly delivery goals</p>
 </div>
 {canPlanOrRate && (
 <Button
 onClick={() => {
 setPlanForm({
 type:"Weekly",
 objective:"",
 plannedWork: 40,
 actualWork: 0,
 completionRate: 0,
 delayRate: 0
 });
 setIsPlanModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> Create Plan
 </Button>
 )}
 </div>

 {/* Plans Table */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-border uppercase font-semibold tracking-wider text-muted-foreground">
 <th className="pb-3">Type</th>
 <th className="pb-3">Objective Goal</th>
 <th className="pb-3">Planned Work (Hours)</th>
 <th className="pb-3">Actual Work (Hours)</th>
 <th className="pb-3">Completion %</th>
 <th className="pb-3">Planning Accuracy %</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
 {plans.map(p => {
 const accuracy = p.actualWork > 0 ? Math.round((p.plannedWork / p.actualWork) * 100) : 0;
 return (
 <tr key={p.id} className="hover:bg-muted/10">
 <td className="py-3.5"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">{p.type}</span></td>
 <td className="py-3.5 font-bold text-sn-dark dark:text-white">{p.objective}</td>
 <td className="py-3.5 font-medium">{p.plannedWork} hrs</td>
 <td className="py-3.5 font-medium">{p.actualWork} hrs</td>
 <td className="py-3.5 font-bold text-emerald-600">{p.completionRate || 0}%</td>
 <td className="py-3.5 font-bold text-indigo-600">{accuracy}%</td>
 </tr>
 );
 })}
 {plans.length === 0 && (
 <tr>
 <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
 No target plans created yet.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 };

 const renderTimesheets = () => {
 // Mock utilization list
 const complianceList = activeGroup
 ? users.filter(u => (activeGroup.memberIds || []).includes(u.id)).map((u, idx) => {
 const logged = 35 + (idx % 3) * 2;
 const expected = 40;
 const variance = logged - expected;
 const utilization = Math.round((logged / expected) * 100);
 return {
 id: u.id,
 name: u.name || u.email,
 expected,
 logged,
 variance,
 utilization
 };
 })
 : [];

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Timesheets Monitoring</h2>
 <p className="text-xs text-muted-foreground">Monitor logs compliance, utilization, and auto-reminders</p>
 </div>
 <div className="flex gap-2">
 <Button
 onClick={() => handleExport("Timesheet Utilization", complianceList)}
 className="bg-white border border-border text-sn-dark hover:bg-muted/20 text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Download className="w-4 h-4" /> Export CSV
 </Button>
 {canPlanOrRate && (
 <Button
 onClick={() => alert("Auto-reminders dispatched successfully to members with missing timesheet logs!")}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5 animate-pulse"
 >
 <Send className="w-4 h-4" /> Trigger Reminders
 </Button>
 )}
 </div>
 </div>

 {/* Timesheets Table */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-border uppercase font-semibold tracking-wider text-muted-foreground">
 <th className="pb-3">Team Member</th>
 <th className="pb-3">Expected Hours</th>
 <th className="pb-3">Logged Hours</th>
 <th className="pb-3">Variance</th>
 <th className="pb-3">Utilization</th>
 <th className="pb-3 text-right">Alert Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
 {complianceList.map(item => (
 <tr key={item.id} className="hover:bg-muted/10">
 <td className="py-3.5 font-bold text-sn-dark dark:text-white">{item.name}</td>
 <td className="py-3.5 font-medium">{item.expected} hrs</td>
 <td className="py-3.5 font-semibold text-blue-600 dark:text-blue-400">{item.logged} hrs</td>
 <td className={`py-3.5 font-bold ${item.variance < 0 ?"text-rose-500" :"text-emerald-600"}`}>
 {item.variance > 0 ? `+${item.variance}` : item.variance} hrs
 </td>
 <td className="py-3.5 font-semibold">{item.utilization}%</td>
 <td className="py-3.5 text-right">
 {item.utilization < 100 ? (
 <span className="bg-rose-50 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-rose-100">
 Missing Hours
 </span>
 ) : (
 <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-100">
 Compliant
 </span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
 };

 const renderTasks = () => {
 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Task Management</h2>
 <p className="text-xs text-muted-foreground">Define backlog, sprint plans, and user assignments</p>
 </div>
 {canPlanOrRate && (
 <Button
 onClick={() => {
 setSelectedTask(null);
 setTaskForm({
 title:"",
 description:"",
 assigneeId:"",
 priority:"Medium",
 status:"To Do",
 storyPoints: 3,
 estimatedHours: 8,
 actualHours: 0,
 dueDate:""
 });
 setIsTaskModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> Create Task
 </Button>
 )}
 </div>

 {/* Task Cards List */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border">
 <div className="space-y-4">
 {tasks.map(t => (
 <div key={t.id} className="flex justify-between items-start p-4 bg-muted/10 border border-border rounded-xl shadow-sm hover:border-sn-green/35 transition">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-bold text-sm text-sn-dark dark:text-white">{t.title}</span>
 <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-full border
 ${t.priority ==="Critical" ?"bg-rose-50 text-rose-600 border-rose-200" :
 t.priority ==="High" ?"bg-amber-50 text-amber-600 border-amber-200" :
"bg-blue-50 text-blue-600 border-blue-200"}`}>
 {t.priority}
 </span>
 <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-semibold">
 {t.storyPoints} SP
 </span>
 </div>
 <p className="text-xs text-muted-foreground max-w-2xl">{t.description}</p>
 <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground font-semibold">
 <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {t.assigneeName ||"Unassigned"}</span>
 <span>Due: {t.dueDate ||"N/A"}</span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <select
 value={t.status}
 onChange={e => moveTaskStatus(t.id, e.target.value)}
 className="bg-white dark:bg-slate-800 border border-border px-2 py-1 rounded text-xs outline-none focus:ring-1 focus:ring-sn-green font-bold text-sn-dark dark:text-white"
 >
 {["Backlog","To Do","In Progress","Review","Testing","Done"].map(st => (
 <option key={st} value={st}>{st}</option>
 ))}
 </select>
 {canPlanOrRate && (
 <button
 onClick={() => {
 setSelectedTask(t);
 setTaskForm({
 title: t.title,
 description: t.description ||"",
 assigneeId: t.assigneeId ||"",
 priority: t.priority ||"Medium",
 status: t.status ||"To Do",
 storyPoints: t.storyPoints || 3,
 estimatedHours: t.estimatedHours || 8,
 actualHours: t.actualHours || 0,
 dueDate: t.dueDate ||""
 });
 setIsTaskModalOpen(true);
 }}
 className="p-1 text-blue-500 hover:bg-blue-50 rounded"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>
 ))}
 {tasks.length === 0 && (
 <div className="py-10 text-center text-muted-foreground italic text-xs">
 No tasks available. Seed group tasks above or click Create Task.
 </div>
 )}
 </div>
 </div>
 </div>
 );
 };

 const renderSprintBoard = () => {
 const columns = ["Backlog","To Do","In Progress","Review","Testing","Done"];

 return (
 <div className="space-y-6 flex flex-col h-full overflow-hidden">
 <div className="flex justify-between items-center shrink-0">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Sprint Kanban Board</h2>
 <p className="text-xs text-muted-foreground">Set sprint goals and drag/move cards across stages</p>
 </div>
 <div className="p-3 bg-white dark:bg-slate-900 border border-border rounded-xl text-xs font-bold flex items-center gap-2">
 <span className="text-indigo-600 uppercase font-semibold">Sprint Goal:</span>
 <span>Support CMDB deployment and clean up critical priority incident backlog</span>
 </div>
 </div>

 {/* Board Container */}
 <div className="flex-grow overflow-x-auto overflow-y-hidden py-2 select-none">
 <div className="flex gap-4 h-full min-w-[1200px]">
 {columns.map(col => {
 const colTasks = tasks.filter(t => t.status === col);
 const totalPoints = colTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

 return (
 <div key={col} className="w-64 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border flex flex-col h-full overflow-hidden">
 {/* Column Header */}
 <div className="p-3 border-b border-border bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
 <span className="font-semibold text-xs uppercase tracking-wide text-sn-dark dark:text-white">{col}</span>
 <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
 {colTasks.length} ({totalPoints} SP)
 </span>
 </div>

 {/* Task Cards Column */}
 <div className="flex-grow overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
 {colTasks.map(t => (
 <div key={t.id} className="bg-white dark:bg-slate-950 border border-border/80 p-3 rounded-lg shadow-sm hover:border-sn-green/30 transition flex flex-col justify-between min-h-[96px] cursor-grab active:cursor-grabbing">
 <div className="space-y-1">
 <h4 className="font-bold text-xs text-sn-dark dark:text-white line-clamp-2">{t.title}</h4>
 <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
 <span className={`text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded border
 ${t.priority ==="Critical" ?"bg-rose-50 text-rose-600 border-rose-200" :
 t.priority ==="High" ?"bg-amber-50 text-amber-600 border-amber-200" :
"bg-blue-50 text-blue-600 border-blue-200"}`}>
 {t.priority}
 </span>
 <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[8px] px-1.5 py-0.5 rounded font-semibold">
 {t.storyPoints} SP
 </span>
 </div>
 </div>

 <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/40 text-[9px] text-muted-foreground font-semibold">
 <span className="truncate max-w-[100px]">{t.assigneeName ||"Unassigned"}</span>
 <div className="flex gap-1.5">
 {/* Simple fast navigation buttons */}
 {col !=="Backlog" && (
 <button
 onClick={() => {
 const idx = columns.indexOf(col);
 moveTaskStatus(t.id, columns[idx - 1]);
 }}
 className="hover:text-sn-dark font-semibold"
 title="Move Back"
 >
 ◀
 </button>
 )}
 {col !=="Done" && (
 <button
 onClick={() => {
 const idx = columns.indexOf(col);
 moveTaskStatus(t.id, columns[idx + 1]);
 }}
 className="hover:text-sn-dark font-semibold"
 title="Move Forward"
 >
 ▶
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
 };

 const renderPerformance = () => {
 // Rank members by overall score
 const ratedMembers = ratings.reduce((acc: any[], r) => {
 const match = acc.find(m => m.userName === r.userName);
 if (match) {
 match.score = Number(((match.score + r.score) / 2).toFixed(1));
 match.count += 1;
 } else {
 acc.push({ userName: r.userName, score: r.score, count: 1 });
 }
 return acc;
 }, []);

 ratedMembers.sort((a, b) => b.score - a.score);

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Performance Management</h2>
 <p className="text-xs text-muted-foreground">Review employee metrics, score leaderboards, and gamified rewards</p>
 </div>
 {canPlanOrRate && (
 <Button
 onClick={() => {
 setRatingForm({
 userId:"",
 productivity: 5,
 quality: 5,
 attendance: 5,
 communication: 5,
 collaboration: 5,
 ownership: 5,
 frequency:"Weekly"
 });
 setIsRatingModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> Rate Team Member
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Leaderboard */}
 <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Leaderboard</h3>
 <div className="space-y-3">
 {ratedMembers.map((m, idx) => (
 <div key={m.userName} className="flex justify-between items-center p-3 bg-muted/10 border border-border rounded-lg">
 <div className="flex items-center gap-3">
 <span className="font-semibold text-xs text-muted-foreground w-6">#{idx + 1}</span>
 <span className="font-bold text-xs text-sn-dark dark:text-white">{m.userName}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-[10px] text-muted-foreground">({m.count} logs)</span>
 <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">{m.score} / 5.0</span>
 </div>
 </div>
 ))}
 {ratedMembers.length === 0 && (
 <div className="py-10 text-center italic text-xs text-muted-foreground">
 No performance records. Rate team members to generate leaderboard rankings.
 </div>
 )}
 </div>
 </div>

 {/* Gamified Badges */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team Badges & Achievements</h3>
 <div className="grid grid-cols-2 gap-3">
 {[
 { title:"Star Performer", desc:"Avg rating > 4.5", icon: <Trophy className="w-5 h-5 text-amber-500" /> },
 { title:"Fast Resolver", desc:"Rapid ticket closing", icon: <Flame className="w-5 h-5 text-orange-500" /> },
 { title:"Goal Achiever", desc:"100% plan delivery", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
 { title:"Team Player", desc:"High collaboration", icon: <UsersIcon className="w-5 h-5 text-blue-500" /> }
 ].map(badge => (
 <div key={badge.title} className="p-3 border border-border rounded-lg bg-card text-center space-y-2 hover:border-sn-green/30 transition">
 <div className="flex justify-center">{badge.icon}</div>
 <span className="font-bold text-[10px] text-sn-dark dark:text-white block">{badge.title}</span>
 <span className="text-[9px] text-muted-foreground block leading-tight">{badge.desc}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderDiscussions = () => {
 const announcements = discussions.filter(d => d.type ==="announcement");
 const generalDiscs = discussions.filter(d => d.type ==="discussion");

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Discussion Board & Standups</h2>
 <p className="text-xs text-muted-foreground">Team broadcasts, standup logs, and general discussions</p>
 </div>
 <div className="flex gap-2">
 <Button
 onClick={() => setIsStandupModalOpen(true)}
 className="bg-white border border-border text-sn-dark hover:bg-muted/20 text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4 text-blue-600" /> Submit Standup
 </Button>
 <Button
 onClick={() => {
 setDiscForm({ type:"discussion", title:"", content:"" });
 setIsDiscModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> New Thread
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Announcements & Discussions */}
 <div className="lg:col-span-2 space-y-6">
 {/* Announcements */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Announcements</h3>
 <div className="space-y-3">
 {announcements.map(ann => (
 <div key={ann.id} className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900 rounded-xl space-y-1">
 <div className="flex justify-between items-center">
 <span className="font-bold text-xs text-blue-700 dark:text-blue-400">{ann.title}</span>
 <span className="text-[9px] text-muted-foreground font-semibold">{new Date(ann.createdAt).toLocaleDateString()}</span>
 </div>
 <p className="text-xs text-slate-700 dark:text-slate-300">{ann.content}</p>
 </div>
 ))}
 {announcements.length === 0 && (
 <div className="py-4 text-center text-xs text-muted-foreground italic bg-muted/5 rounded-lg border border-dashed border-border">
 No announcements posted.
 </div>
 )}
 </div>
 </div>

 {/* Discussions Threads */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">General Threads</h3>
 <div className="space-y-4">
 {generalDiscs.map(disc => (
 <div key={disc.id} className="p-4 border border-border rounded-xl space-y-2 shadow-sm">
 <div className="flex justify-between items-center">
 <span className="font-bold text-xs text-sn-dark dark:text-white">{disc.title}</span>
 <span className="text-[9px] text-muted-foreground font-semibold">{disc.authorName} • {new Date(disc.createdAt).toLocaleDateString()}</span>
 </div>
 <p className="text-xs text-muted-foreground">{disc.content}</p>
 </div>
 ))}
 {generalDiscs.length === 0 && (
 <div className="py-6 text-center text-xs text-muted-foreground italic">
 No active discussions. Create a thread to engage with the team.
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Standup log */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Consolidated Standups</h3>
 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
 {standups.map(s => (
 <div key={s.id} className="p-3 bg-muted/10 border border-border rounded-lg space-y-2">
 <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
 <span className="font-bold text-[11px] text-sn-dark dark:text-white">{s.userName}</span>
 <span className="text-[9px] text-muted-foreground font-semibold">{s.date}</span>
 </div>
 <div className="space-y-1.5 text-[10px]">
 <div>
 <span className="text-indigo-600 dark:text-indigo-400 font-bold block">Yesterday:</span>
 <p className="text-muted-foreground">{s.yesterday}</p>
 </div>
 <div>
 <span className="text-blue-600 dark:text-blue-400 font-bold block">Today:</span>
 <p className="text-muted-foreground">{s.today}</p>
 </div>
 {s.blockers && (
 <div>
 <span className="text-rose-600 font-bold block">Blockers:</span>
 <p className="text-rose-500 font-medium">{s.blockers}</p>
 </div>
 )}
 </div>
 </div>
 ))}
 {standups.length === 0 && (
 <div className="py-10 text-center text-xs text-muted-foreground italic">
 No standups logged for today.
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderKB = () => {
 const filteredKB = articles.filter(a =>
 !kbSearch ||
 a.title?.toLowerCase().includes(kbSearch.toLowerCase()) ||
 a.content?.toLowerCase().includes(kbSearch.toLowerCase())
 );

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Group Knowledge Base</h2>
 <p className="text-xs text-muted-foreground">Create and manage project wikis, FAQs, and SOPs</p>
 </div>
 {canPlanOrRate && (
 <Button
 onClick={() => {
 setSelectedArticle(null);
 setKbForm({ title:"", content:"", category:"SOPs" });
 setIsKBModalOpen(true);
 }}
 className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider flex items-center gap-1.5"
 >
 <Plus className="w-4 h-4" /> Create Article
 </Button>
 )}
 </div>

 {/* Search */}
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search documentation..."
 value={kbSearch}
 onChange={e => setKbSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-xs outline-none focus:ring-1 focus:ring-sn-green"
 />
 </div>

 {/* Wiki List Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredKB.map(a => (
 <div key={a.id} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-4 hover:border-sn-green/30 transition flex flex-col justify-between h-48">
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="bg-indigo-50 text-indigo-700 text-[9px] px-2 py-0.5 rounded font-semibold border border-indigo-100 uppercase">{a.category}</span>
 <span className="text-[9px] text-muted-foreground font-semibold">{new Date(a.updatedAt).toLocaleDateString()}</span>
 </div>
 <h3 className="font-bold text-sm text-sn-dark dark:text-white truncate" title={a.title}>{a.title}</h3>
 <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{a.content}</p>
 </div>

 <div className="flex justify-between items-center border-t border-border/40 pt-2.5 text-[9px] text-muted-foreground font-semibold">
 <span>By: {a.authorName}</span>
 {canPlanOrRate && (
 <button
 onClick={() => {
 setSelectedArticle(a);
 setKbForm({
 title: a.title,
 content: a.content,
 category: a.category
 });
 setIsKBModalOpen(true);
 }}
 className="text-blue-500 hover:underline"
 >
 Edit
 </button>
 )}
 </div>
 </div>
 ))}
 {filteredKB.length === 0 && (
 <div className="col-span-full py-12 text-center text-muted-foreground italic text-xs border border-dashed border-border rounded-xl">
 No documentation articles found matching filters.
 </div>
 )}
 </div>
 </div>
 );
 };

 const renderReports = () => {
 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Reports & Exports Workspace</h2>
 <p className="text-xs text-muted-foreground">Generate and export team performance reports in CSV format</p>
 </div>
 </div>

 {/* Reports Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[
 { title:"Productivity Report", desc:"Velocity points, backlog rates, completed sprint tasks.", data: tasks },
 { title:"Calendar Planners", desc:"Meetings, leave lists, releases, deployments logs.", data: events },
 { title:"Weekly Target plans", desc:"Delivery variance, delay counts, execution efficiency.", data: plans },
 { title:"Performance rating Logs", desc:"Daily/weekly ratings averages for leaderboard.", data: ratings }
 ].map(rep => (
 <div key={rep.title} className="bg-white dark:bg-slate-900 border border-border p-5 rounded-xl space-y-4 hover:shadow transition">
 <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg flex items-center justify-center">
 <BarChart2 className="w-5 h-5 text-indigo-600" />
 </div>
 <h3 className="font-bold text-sm text-sn-dark dark:text-white">{rep.title}</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">{rep.desc}</p>
 <Button
 onClick={() => handleExport(rep.title, rep.data)}
 className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs uppercase font-semibold tracking-wider py-2 flex items-center justify-center gap-1.5"
 >
 <Download className="w-4 h-4" /> Download CSV
 </Button>
 </div>
 ))}
 </div>
 </div>
 );
 };

 const renderAnalytics = () => {
 // Project Health metrics
 const taskScore = tasks.length > 0 ? Math.round((tasks.filter(t => t.status ==="Done").length / tasks.length) * 100) : 100;
 const healthScore = Math.round(taskScore * 0.5 + 40); // Standard weighted health representation

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-xl font-bold text-sn-dark dark:text-white">Planned vs Actual Analytics</h2>
 <p className="text-xs text-muted-foreground">Variance analysis, Project Health dial, and Escalation engine alerts</p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Health Score Dial */}
 <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border flex flex-col items-center justify-between text-center space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground self-start">Project Health Status</h3>

 <div className="relative w-44 h-44 flex items-center justify-center">
 {/* Circular health score dial representation */}
 <div className="w-40 h-40 rounded-full border-8 border-slate-100 dark:border-slate-800 flex items-center justify-center">
 <div className="text-center">
 <span className="text-4xl font-semibold text-blue-600 block">{healthScore}%</span>
 <span className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider">Healthy</span>
 </div>
 </div>
 </div>

 <p className="text-xs text-muted-foreground leading-relaxed">
 Based on Timesheet compliance, Sprint Velocity, resolution rate, and calendar target planning accuracy.
 </p>
 </div>

 {/* Planned vs Actual Variance */}
 <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated vs Actual Hours Variance</h3>
 <div className="overflow-y-auto max-h-72 pr-2 custom-scrollbar space-y-3">
 {tasks.map(t => {
 const variance = t.actualHours - t.estimatedHours;
 return (
 <div key={t.id} className="p-3 bg-muted/10 border border-border rounded-lg flex justify-between items-center text-xs">
 <div>
 <span className="font-bold text-sn-dark dark:text-white block">{t.title}</span>
 <span className="text-[10px] text-muted-foreground">Assignee: {t.assigneeName}</span>
 </div>
 <div className="text-right font-semibold">
 <span className="text-muted-foreground block">Est: {t.estimatedHours}h / Act: {t.actualHours}h</span>
 <span className={`text-[10px] font-bold ${variance > 0 ?"text-rose-500 font-semibold" :"text-emerald-600 font-semibold"}`}>
 Variance: {variance > 0 ? `+${variance}` : variance}h
 </span>
 </div>
 </div>
 );
 })}
 {tasks.length === 0 && (
 <div className="py-10 text-center text-xs text-muted-foreground italic">
 No task data to run variance reports.
 </div>
 )}
 </div>
 </div>

 {/* Escalation Engine Alerts */}
 <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-border space-y-4">
 <div className="flex items-center gap-2">
 <ShieldAlert className="w-5 h-5 text-rose-500" />
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Automated Escalation Log</h3>
 </div>
 <div className="space-y-2.5">
 {[
 { trigger:"Delayed Plan", desc:"Sprint goal 1 items delay percentage exceeds 15%", level:"Member → TL", status:"Resolved", date:"June 12" },
 { trigger:"Overdue Task", desc:"Auth Middleware task overdue by 3 days", level:"TL → PM", status:"Active", date:"June 14" }
 ].map((esc, index) => (
 <div key={index} className="p-3 border border-border rounded-lg flex items-center justify-between text-xs hover:bg-rose-50/10 transition">
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <span className="font-semibold text-rose-600">{esc.trigger}</span>
 <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 rounded font-semibold">{esc.level}</span>
 </div>
 <p className="text-muted-foreground">{esc.desc}</p>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">{esc.date}</span>
 <span className={cn(
"text-[9px] font-semibold uppercase",
 esc.status ==="Active" ?"text-rose-600" :"text-emerald-600"
 )}>{esc.status}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 };

 return (
 <div className="flex flex-col w-full h-[calc(100vh-4.25rem)] overflow-hidden -m-8">
 {/* Top Group Selector Bar */}
 <div className="bg-white dark:bg-slate-900 border-b border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shadow-sm z-10">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center font-bold">
 <UsersIcon className="w-4.5 h-4.5" />
 </div>
 <div>
 <span className="text-[9px] font-semibold uppercase text-blue-500 tracking-widest block">Active Group Workspace</span>
 <select
 value={selectedGroupId}
 onChange={e => setSelectedGroupId(e.target.value)}
 className="bg-transparent border-none p-0 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-0 cursor-pointer"
 >
 {groups.map(g => (
 <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{g.name}</option>
 ))}
 </select>
 </div>
 </div>

 {activeGroup && (
 <div className="flex gap-4 text-[10px]">
 <div className="bg-slate-50 dark:bg-slate-800/40 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
 <span className="text-slate-400 font-bold uppercase">Project:</span>
 <span className="font-bold text-slate-800 dark:text-white">{activeGroup.projectName ||"N/A"}</span>
 </div>
 <div className="bg-slate-50 dark:bg-slate-800/40 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
 <span className="text-slate-400 font-bold uppercase">Department:</span>
 <span className="font-bold text-slate-800 dark:text-white">{activeGroup.department ||"N/A"}</span>
 </div>
 </div>
 )}
 </div>

 {/* Main Workspace Content Area */}
 <div className="flex-grow overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950/20 custom-scrollbar">
 {activeTab ==="dashboard" && renderDashboard()}
 {activeTab ==="teams" && renderTeams()}
 {activeTab ==="members" && renderMembers()}
 {activeTab ==="calendar" && renderCalendar()}
 {activeTab ==="planning" && renderPlanning()}
 {activeTab ==="timesheets" && renderTimesheets()}
 {activeTab ==="tasks" && renderTasks()}
 {activeTab ==="sprint_board" && renderSprintBoard()}
 {activeTab ==="performance" && renderPerformance()}
 {activeTab ==="discussions" && renderDiscussions()}
 {activeTab ==="kb" && renderKB()}
 {activeTab ==="reports" && renderReports()}
 {activeTab ==="analytics" && renderAnalytics()}
 </div>

 {/* ═══ MODALS ═══ */}

 {/* Group Configuration Modal */}
 {isGroupModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 dark:text-white">
 <div className="p-5 border-b border-border flex justify-between items-center bg-muted/10 dark:bg-slate-950/20">
 <h3 className="font-bold text-lg">{selectedGroup ? 'Edit Group Settings' : 'Create Assignment Group'}</h3>
 <button onClick={() => setIsGroupModalOpen(false)} className="p-1.5 hover:bg-muted dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Group Name</label>
 <input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. Helpdesk Tier 2" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Group Code</label>
 <input value={groupForm.code} onChange={e => setGroupForm({ ...groupForm, code: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. GRP_HD_T2" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Project Name</label>
 <input value={groupForm.projectName} onChange={e => setGroupForm({ ...groupForm, projectName: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. CMDB Portal" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Department</label>
 <input value={groupForm.department} onChange={e => setGroupForm({ ...groupForm, department: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. IT Operations" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Project Manager (PM)</label>
 <select value={groupForm.managerId} onChange={e => setGroupForm({ ...groupForm, managerId: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="">-- Unassigned --</option>
 {users.map(u => (
 <option key={u.id} value={u.id}>{u.name || u.email}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Team Leader (TL)</label>
 <select value={groupForm.leaderId} onChange={e => setGroupForm({ ...groupForm, leaderId: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="">-- Unassigned --</option>
 {users.map(u => (
 <option key={u.id} value={u.id}>{u.name || u.email}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Group Email</label>
 <input value={groupForm.email} onChange={e => setGroupForm({ ...groupForm, email: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="group@company.com" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Group Type</label>
 <select value={groupForm.type} onChange={e => setGroupForm({ ...groupForm, type: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-10">
 {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Required Skills (Comma separated)</label>
 <input value={groupForm.skillTags} onChange={e => setGroupForm({ ...groupForm, skillTags: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. SAP, Azure, React" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Group Description</label>
 <textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-20 resize-none" placeholder="Purpose and SLA boundaries of the group..." />
 </div>
 </div>
 <div className="p-5 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsGroupModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white">Cancel</Button>
 <Button onClick={handleSaveGroup} className="bg-sn-green text-sn-dark font-semibold uppercase tracking-widest text-[11px] px-8 h-10">Save Group</Button>
 </div>
 </div>
 </div>
 )}

 {/* Manage Staff/Members Modal */}
 {isMemberModalOpen && activeGroup && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20 dark:bg-slate-950/20">
 <h3 className="font-bold text-lg">Manage Members — {activeGroup.name}</h3>
 <button onClick={() => setIsMemberModalOpen(false)} className="hover:bg-muted dark:hover:bg-slate-800 p-1.5 rounded-full"><X className="w-5 h-5 text-muted-foreground" /></button>
 </div>
 <div className="flex-grow overflow-hidden grid grid-cols-2 divide-x divide-border">
 {/* Group members */}
 <div className="flex flex-col h-full overflow-hidden p-5 space-y-4">
 <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Current Members ({(activeGroup.memberIds || []).length})</h4>
 <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
 {users
 .filter(u => (activeGroup.memberIds || []).includes(u.id) || (activeGroup.memberIds || []).includes(u.uid))
 .map(u => (
 <div key={u.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-card shadow-sm hover:border-sn-green/30 transition">
 <div>
 <p className="text-xs font-bold text-sn-dark dark:text-white truncate">{u.name || u.email}</p>
 <span className="text-[9px] text-muted-foreground truncate block">{u.email}</span>
 </div>
 <button onClick={() => handleRemoveMember(u.id)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 ))}
 </div>
 </div>
 {/* Available users */}
 <div className="flex flex-col h-full overflow-hidden p-5 space-y-4">
 <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Available Users</h4>
 <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
 {users
 .filter(u => !(activeGroup.memberIds || []).includes(u.id) && !(activeGroup.memberIds || []).includes(u.uid))
 .map(u => (
 <div key={u.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-card shadow-sm hover:border-sn-green/30 transition cursor-pointer" onClick={() => handleAddMember(u.id)}>
 <div>
 <p className="text-xs font-bold text-sn-dark dark:text-white truncate">{u.name || u.email}</p>
 <span className="text-[9px] text-muted-foreground truncate block">{u.email}</span>
 </div>
 <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:bg-sn-green hover:text-white transition-all"><Plus className="w-3.5 h-3.5" /></div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Task Creation & Editing Modal */}
 {isTaskModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">{selectedTask ? 'Edit Task' : 'Create Task'}</h3>
 <button onClick={() => setIsTaskModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Task Title</label>
 <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. Set up SLA monitors" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Assignee</label>
 <select value={taskForm.assigneeId} onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="">-- Unassigned --</option>
 {users.filter(u => (activeGroup?.memberIds || []).includes(u.id) || (activeGroup?.memberIds || []).includes(u.uid)).map(u => (
 <option key={u.id} value={u.id}>{u.name || u.email}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Priority</label>
 <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="Low">Low</option>
 <option value="Medium">Medium</option>
 <option value="High">High</option>
 <option value="Critical">Critical</option>
 </select>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Story Points</label>
 <input type="number" value={taskForm.storyPoints} onChange={e => setTaskForm({ ...taskForm, storyPoints: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Est. Hours</label>
 <input type="number" value={taskForm.estimatedHours} onChange={e => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Actual Hours</label>
 <input type="number" value={taskForm.actualHours} onChange={e => setTaskForm({ ...taskForm, actualHours: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Due Date</label>
 <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Status</label>
 <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 {["Backlog","To Do","In Progress","Review","Testing","Done"].map(st => (
 <option key={st} value={st}>{st}</option>
 ))}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Task Description</label>
 <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-20 resize-none" placeholder="Task deliverables details..." />
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsTaskModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSaveTask} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Save Task</Button>
 </div>
 </div>
 </div>
 )}

 {/* Calendar Event Modal */}
 {isEventModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">{selectedEvent ? 'Edit Event' : 'Create Calendar Event'}</h3>
 <button onClick={() => setIsEventModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Event Title</label>
 <input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. QA Sprint review" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Type</label>
 <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 {["Task","Meeting","Release","Training","Deployment","Milestone","Leave Planning"].map(t => (
 <option key={t} value={t}>{t}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Priority</label>
 <select value={eventForm.priority} onChange={e => setEventForm({ ...eventForm, priority: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="Low">Low</option>
 <option value="Medium">Medium</option>
 <option value="High">High</option>
 <option value="Critical">Critical</option>
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Start Date</label>
 <input type="date" value={eventForm.startDate} onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">End Date</label>
 <input type="date" value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Est. Hours</label>
 <input type="number" value={eventForm.estimatedHours} onChange={e => setEventForm({ ...eventForm, estimatedHours: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Status</label>
 <select value={eventForm.status} onChange={e => setEventForm({ ...eventForm, status: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 {["Planned","In Progress","Completed","Delayed"].map(st => (
 <option key={st} value={st}>{st}</option>
 ))}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Assignee</label>
 <select value={eventForm.assigneeId} onChange={e => setEventForm({ ...eventForm, assigneeId: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="">-- Unassigned --</option>
 {users.filter(u => (activeGroup?.memberIds || []).includes(u.id) || (activeGroup?.memberIds || []).includes(u.uid)).map(u => (
 <option key={u.id} value={u.id}>{u.name || u.email}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsEventModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSaveEvent} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Save Event</Button>
 </div>
 </div>
 </div>
 )}

 {/* Planning Modal */}
 {isPlanModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">Create Target Plan</h3>
 <button onClick={() => setIsPlanModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Plan Type</label>
 <select value={planForm.type} onChange={e => setPlanForm({ ...planForm, type: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="Daily">Daily Plan</option>
 <option value="Weekly">Weekly Plan</option>
 <option value="Monthly">Monthly Plan</option>
 <option value="Quarterly">Quarterly Plan</option>
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Planned Work (Hours)</label>
 <input type="number" value={planForm.plannedWork} onChange={e => setPlanForm({ ...planForm, plannedWork: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Actual Logged</label>
 <input type="number" value={planForm.actualWork} onChange={e => setPlanForm({ ...planForm, actualWork: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Completion Rate %</label>
 <input type="number" value={planForm.completionRate} onChange={e => setPlanForm({ ...planForm, completionRate: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Delay Rate %</label>
 <input type="number" value={planForm.delayRate} onChange={e => setPlanForm({ ...planForm, delayRate: Number(e.target.value) })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" />
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Objective Goal</label>
 <textarea value={planForm.objective} onChange={e => setPlanForm({ ...planForm, objective: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-20 resize-none" placeholder="Sprint deliverable details..." />
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsPlanModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSavePlan} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Save Target</Button>
 </div>
 </div>
 </div>
 )}

 {/* Standup Modal */}
 {isStandupModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">Submit Daily Standup</h3>
 <button onClick={() => setIsStandupModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Yesterday's Work Done</label>
 <textarea value={standupForm.yesterday} onChange={e => setStandupForm({ ...standupForm, yesterday: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-16 resize-none" placeholder="What did you build or resolve?" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Today's Work Planned</label>
 <textarea value={standupForm.today} onChange={e => setStandupForm({ ...standupForm, today: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-16 resize-none" placeholder="What are you targeting today?" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Active Blockers (Optional)</label>
 <textarea value={standupForm.blockers} onChange={e => setStandupForm({ ...standupForm, blockers: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-16 resize-none" placeholder="Are any tickets or environments blocking you?" />
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsStandupModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSaveStandup} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Submit Standup</Button>
 </div>
 </div>
 </div>
 )}

 {/* Performance Rating Modal */}
 {isRatingModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">Submit Performance Review</h3>
 <button onClick={() => setIsRatingModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Team Member</label>
 <select value={ratingForm.userId} onChange={e => setRatingForm({ ...ratingForm, userId: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="">-- Choose member --</option>
 {users.filter(u => (activeGroup?.memberIds || []).includes(u.id) || (activeGroup?.memberIds || []).includes(u.uid)).map(u => (
 <option key={u.id} value={u.id}>{u.name || u.email}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Review Frequency</label>
 <select value={ratingForm.frequency} onChange={e => setRatingForm({ ...ratingForm, frequency: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="Daily">Daily Rating</option>
 <option value="Weekly">Weekly Rating</option>
 <option value="Monthly">Monthly Rating</option>
 </select>
 </div>
 </div>

 {[
 { field:"productivity", label:"Productivity Delivery" },
 { field:"quality", label:"Code/Support Quality" },
 { field:"attendance", label:"Attendance & Compliance" },
 { field:"communication", label:"Communication Skills" },
 { field:"collaboration", label:"Team Collaboration" },
 { field:"ownership", label:"Task Ownership" }
 ].map(cat => (
 <div key={cat.field} className="flex justify-between items-center bg-muted/10 p-2.5 rounded-lg border border-border/50">
 <span className="text-xs font-semibold text-muted-foreground">{cat.label}</span>
 <select
 value={(ratingForm as any)[cat.field]}
 onChange={e => setRatingForm({ ...ratingForm, [cat.field]: Number(e.target.value) })}
 className="bg-white dark:bg-slate-800 border border-border px-2 py-1 rounded text-xs outline-none focus:ring-1 focus:ring-sn-green text-sn-dark dark:text-white font-bold"
 >
 {[1, 2, 3, 4, 5].map(v => (
 <option key={v} value={v}>{v} / 5</option>
 ))}
 </select>
 </div>
 ))}
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsRatingModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSaveRating} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Save Review</Button>
 </div>
 </div>
 </div>
 )}

 {/* Discussion Modal */}
 {isDiscModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">New Discussion Thread</h3>
 <button onClick={() => setIsDiscModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Thread Title</label>
 <input value={discForm.title} onChange={e => setDiscForm({ ...discForm, title: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="Topic name..." />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Type</label>
 <select value={discForm.type} onChange={e => setDiscForm({ ...discForm, type: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="discussion">General Thread</option>
 <option value="announcement">Announcement (Sticky)</option>
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Body Content</label>
 <textarea value={discForm.content} onChange={e => setDiscForm({ ...discForm, content: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-24 resize-none" placeholder="Provide background and details..." />
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsDiscModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSaveDisc} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Post Thread</Button>
 </div>
 </div>
 </div>
 )}

 {/* KB wiki Modal */}
 {isKBModalOpen && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-white">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15 dark:bg-slate-950/20">
 <h3 className="font-bold text-sm uppercase tracking-wider">{selectedArticle ? 'Edit Wiki Article' : 'Create KB Wiki Article'}</h3>
 <button onClick={() => setIsKBModalOpen(false)} className="p-1 hover:bg-muted dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Article Title</label>
 <input value={kbForm.title} onChange={e => setKbForm({ ...kbForm, title: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800" placeholder="e.g. Docker container setup" />
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Category</label>
 <select value={kbForm.category} onChange={e => setKbForm({ ...kbForm, category: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800">
 <option value="SOPs">SOPs</option>
 <option value="Guides">Guides</option>
 <option value="Technical Docs">Technical Docs</option>
 <option value="FAQ">FAQ</option>
 </select>
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Wiki Markdown Content</label>
 <textarea value={kbForm.content} onChange={e => setKbForm({ ...kbForm, content: e.target.value })} className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white dark:bg-slate-800 h-28 resize-none" placeholder="Provide step-by-step procedures..." />
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/5 dark:bg-slate-950/20">
 <Button onClick={() => setIsKBModalOpen(false)} className="bg-white dark:bg-slate-800 border border-border text-sn-dark dark:text-white text-xs">Cancel</Button>
 <Button onClick={handleSaveKB} className="bg-sn-green text-sn-dark text-xs uppercase font-semibold tracking-wider">Save Article</Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
