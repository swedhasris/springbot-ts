import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Pin, X, Copy, LayoutDashboard, Ticket, Clock, CheckSquare, BarChart3, Users, BookOpen,
  CalendarDays, Settings, ShieldAlert, GitBranch, Sparkles, HelpCircle,
  Trophy, Building2, KeyRound, CheckCircle2, List, Mail, Palette, Tag,
  FileText, ArrowRightSquare, MinusSquare, XSquare, Plus, PlusCircle, LogOut,
  FolderOpen, UserMinus, UserCheck, Play, Square, Bell, Search, Sun, Moon,
  Monitor, ClipboardList, ShoppingCart, Database, AlertOctagon, GitPullRequest,
  Users as UsersIcon, Eye, EyeOff, PhoneCall, BrainCircuit
} from "lucide-react";
import { TabContentMapper } from "./TabContentMapper";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { AccessRestricted } from "./AccessRestricted";
import { useTickets } from "../contexts/TicketsContext";

// Helper to map paths to module keys for access restriction
function getModuleKeyForPath(path: string): string | null {
  const cleanPath = path.split("?")[0];
  if (cleanPath === "/tickets") return "tickets";
  if (cleanPath.startsWith("/tickets/")) return "tickets";
  if (cleanPath === "/conversations") return "conversations";
  if (cleanPath === "/catalog") return "catalog";
  if (cleanPath === "/kb") return "kb";
  if (cleanPath === "/approvals") return "approvals";
  if (cleanPath === "/approved-tickets") return "approvals";
  if (cleanPath === "/history") return "history";
  if (cleanPath.startsWith("/timesheet")) {
    if (cleanPath.includes("/reports")) {
      if (path.includes("status=Approved")) return "approved_timesheet";
      return "timesheet_reports";
    }
    return "timesheet";
  }
  if (cleanPath === "/timesheet-approvals") return "timesheet_approvals";
  if (cleanPath === "/problem") return "problem";
  if (cleanPath === "/change") return "change";
  if (cleanPath === "/reports") return "reports";
  if (cleanPath === "/forecasting-planning") return "reports";
  if (cleanPath === "/data-analytics") return "reports";
  if (cleanPath === "/sla") return "sla";
  if (cleanPath === "/sla-management") return "sla";
  if (cleanPath === "/users") return "users";
  if (cleanPath === "/settings") return "settings";
  if (cleanPath === "/branding") return "settings";
  if (cleanPath === "/incident-categories") return "settings";
  if (cleanPath === "/access-control") return "access_control";
  return null;
}

export function isRestrictedPath(path: string, restrictedModules: string[]): boolean {
  if (!restrictedModules || restrictedModules.length === 0) return false;
  const key = getModuleKeyForPath(path);
  return key ? restrictedModules.includes(key) : false;
}

export interface Tab {
  id: string;
  path: string;
  title: string;
  pinned?: boolean;
}

interface TabWorkspaceContextType {
  isTabsEnabled: boolean;
  toggleTabsEnabled: () => void;
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (path: string, options?: { title?: string; focus?: boolean; forceNew?: boolean }) => void;
  closeTab: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  duplicateTab: (id: string) => void;
  reorder: (startIndex: number, endIndex: number) => void;
  reopenClosedTab: () => void;
  setTabTitle: (id: string, title: string) => void;
  switchToTab: (id: string) => void;
}

const TabWorkspaceContext = createContext<TabWorkspaceContextType | null>(null);

export function useWorkspace() {
  const context = useContext(TabWorkspaceContext);
  if (!context) {
    return {
      isTabsEnabled: false,
      toggleTabsEnabled: () => {},
      tabs: [],
      activeTabId: null,
      openTab: () => {},
      closeTab: () => {},
      closeOthers: () => {},
      closeAll: () => {},
      pinTab: () => {},
      unpinTab: () => {},
      duplicateTab: () => {},
      reorder: () => {},
      reopenClosedTab: () => {},
      setTabTitle: () => {},
      switchToTab: () => {}
    };
  }
  return context;
}

// Map path to dynamic default titles
function getTabTitleFromPath(path: string): string {
  const cleanPath = path.split("?")[0];
  
  if (cleanPath === "/my-dashboard" || cleanPath === "/") return "My Dashboard";
  if (cleanPath === "/dashboard") return "Operations Dashboard";
  if (cleanPath === "/tickets") {
    if (path.includes("filter=assigned_to_me")) return "Assigned to Me";
    if (path.includes("filter=open")) return "Open Incidents";
    if (path.includes("filter=unassigned")) return "Open - Unassigned";
    if (path.includes("filter=resolved")) return "Resolved Incidents";
    return "Incidents List";
  }
  if (cleanPath.startsWith("/tickets/")) {
    const ticketId = cleanPath.split("/")[2];
    return `Ticket #${ticketId}`;
  }
  if (cleanPath === "/history") return "System Activity Log";
  if (cleanPath === "/sla") return "SLA Policies";
  if (cleanPath === "/sla-management") return "SLA Management";
  if (cleanPath === "/approvals") return "Ticket Approvals";
  if (cleanPath === "/users") return "User Management";
  if (cleanPath === "/incident-categories") return "Incident Categories";
  if (cleanPath.startsWith("/timesheet")) {
    if (cleanPath.includes("/weekly")) return "Timesheet Weekly";
    if (cleanPath.includes("/reports")) return "Timesheet Reports";
    return "My Timesheets";
  }
  if (cleanPath === "/reports") return "Incidents Map";
  if (cleanPath === "/forecasting-planning") return "Forecasting & Targets";
  if (cleanPath === "/catalog") return "Service Catalog";
  if (cleanPath === "/cmdb") return "CMDB / Assets";
  if (cleanPath === "/conversations") return "Conversations";
  if (cleanPath === "/problem") return "Problem Management";
  if (cleanPath === "/change") return "Change Management";
  if (cleanPath === "/kb") return "Knowledge Base";
  if (cleanPath === "/service-portal") return "Self-Service Portal";
  if (cleanPath === "/calendar") return "Calendar";
  if (cleanPath === "/access-control") return "Access Control";
  if (cleanPath === "/leaderboard") return "Leaderboard";
  if (cleanPath === "/approved-tickets") return "Approved Tickets";
  if (cleanPath.startsWith("/companies")) return "Companies Management";
  if (cleanPath === "/timesheet-approvals") return "Timesheet Approvals";
  if (cleanPath === "/groups") return "Groups / Teams";
  if (cleanPath === "/clear-users") return "Purge Sandbox Users";
  if (cleanPath === "/email-integrations") return "Email Integrations";
  if (cleanPath === "/branding") return "Branding Settings";
  if (cleanPath === "/settings") return "System Settings";
  if (cleanPath === "/activity-tracker") return "Activity Tracker";
  if (cleanPath === "/data-analytics") return "Data Analytics";
  if (cleanPath === "/global-search") return "Global Search";
  if (cleanPath.startsWith("/ts-meeting")) return "Meeting Room";
  if (cleanPath === "/meetings") return "Meeting Management";
  if (cleanPath === "/create-meeting") return "Create Meeting";
  if (cleanPath === "/calls") return "Call Logs";
  if (cleanPath === "/calls/new") return "Log New Call";
  if (cleanPath.startsWith("/calls/")) {
    const callId = cleanPath.split("/")[2];
    return `Call #${callId}`;
  }
  if (cleanPath === "/ai-assistant") return "AI Assistant";
  
  return "New Tab";
}

// Map path to a Lucide icon component
function getTabIconFromPath(path: string) {
  const cleanPath = path.split("?")[0];
  
  if (cleanPath === "/my-dashboard" || cleanPath === "/") return LayoutDashboard;
  if (cleanPath === "/dashboard") return BarChart3;
  if (cleanPath.startsWith("/tickets")) return Ticket;
  if (cleanPath === "/sla") return Clock;
  if (cleanPath === "/sla-management") return Clock;
  if (cleanPath === "/approvals") return CheckCircle2;
  if (cleanPath === "/users") return Users;
  if (cleanPath.startsWith("/timesheet")) return ClipboardList;
  if (cleanPath === "/reports") return BarChart3;
  if (cleanPath === "/forecasting-planning") return BarChart3;
  if (cleanPath === "/catalog") return ShoppingCart;
  if (cleanPath === "/cmdb") return Database;
  if (cleanPath === "/conversations") return Mail;
  if (cleanPath === "/problem") return AlertOctagon;
  if (cleanPath === "/change") return GitPullRequest;
  if (cleanPath === "/kb") return BookOpen;
  if (cleanPath === "/service-portal") return HelpCircle;
  if (cleanPath === "/calendar") return CalendarDays;
  if (cleanPath === "/access-control") return KeyRound;
  if (cleanPath === "/leaderboard") return Trophy;
  if (cleanPath === "/approved-tickets") return CheckCircle2;
  if (cleanPath.startsWith("/companies")) return Building2;
  if (cleanPath === "/timesheet-approvals") return ClipboardList;
  if (cleanPath === "/groups") return Users;
  if (cleanPath === "/clear-users") return UserMinus;
  if (cleanPath === "/email-integrations") return Settings;
  if (cleanPath === "/branding") return Palette;
  if (cleanPath === "/settings") return Settings;
  if (cleanPath === "/activity-tracker") return Monitor;
  if (cleanPath === "/data-analytics") return BarChart3;
  if (cleanPath === "/global-search") return Search;
  if (cleanPath.startsWith("/ts-meeting")) return CalendarDays;
  if (cleanPath.startsWith("/calls")) return PhoneCall;
  if (cleanPath === "/ai-assistant") return BrainCircuit;
  
  return FileText;
}

export function TabWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isSwitchingTabRef = useRef(false);

  // Load from local storage
  const [isTabsEnabled, setIsTabsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("sn_workspace_tabs_enabled");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem("sn_active_workspace_tabs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error loading tabs from localStorage", e);
    }
    // Default initial tabs
    return [
      { id: "default-dashboard", path: "/my-dashboard", title: "My Dashboard", pinned: false }
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActive = localStorage.getItem("sn_active_workspace_tab_id");
    if (savedActive) return savedActive;
    return "default-dashboard";
  });

  const [closedTabsHistory, setClosedTabsHistory] = useState<Tab[]>([]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("sn_workspace_tabs_enabled", JSON.stringify(isTabsEnabled));
  }, [isTabsEnabled]);

  useEffect(() => {
    localStorage.setItem("sn_active_workspace_tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem("sn_active_workspace_tab_id", activeTabId);
    }
  }, [activeTabId]);

  const toggleTabsEnabled = () => {
    setIsTabsEnabled(prev => !prev);
  };

  const programNavigate = (targetPath: string, targetTabId: string) => {
    const currentPath = location.pathname + location.search;
    if (targetPath !== currentPath) {
      isSwitchingTabRef.current = true;
    }
    setActiveTabId(targetTabId);
    navigate(targetPath);
  };

  const openTab = (path: string, options?: { title?: string; focus?: boolean; forceNew?: boolean }) => {
    if (!isTabsEnabled) {
      navigate(path);
      return;
    }

    const cleanPath = path.split("?")[0];
    if (cleanPath === "/" || cleanPath === "/login" || cleanPath === "/register") return;

    // Check duplicate
    if (!options?.forceNew) {
      const existingTab = tabs.find(t => t.path === path);
      if (existingTab) {
        programNavigate(path, existingTab.id);
        return;
      }
    }

    const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const title = options?.title || getTabTitleFromPath(path);
    const newTab: Tab = {
      id: newId,
      path,
      title,
      pinned: false
    };

    setTabs(prev => [...prev, newTab]);
    programNavigate(path, newId);
  };

  const closeTab = (id: string) => {
    const tabToClose = tabs.find(t => t.id === id);
    if (!tabToClose) return;

    // Add to history for Ctrl+Shift+T style reopen
    setClosedTabsHistory(prev => [tabToClose, ...prev].slice(0, 15));

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    if (activeTabId === id) {
      if (newTabs.length > 0) {
        // Find nearest tab
        const closedIdx = tabs.findIndex(t => t.id === id);
        const nextActiveIdx = Math.min(closedIdx, newTabs.length - 1);
        const nextActive = newTabs[nextActiveIdx];
        programNavigate(nextActive.path, nextActive.id);
      } else {
        // Open a new dashboard tab
        const defaultId = "default-dashboard";
        const defaultTab = { id: defaultId, path: "/my-dashboard", title: "My Dashboard", pinned: false };
        setTabs([defaultTab]);
        programNavigate("/my-dashboard", defaultId);
      }
    }
  };

  const closeOthers = (id: string) => {
    const tabToKeep = tabs.find(t => t.id === id);
    if (!tabToKeep) return;

    // Keep pinned tabs and the selected tab
    const newTabs = tabs.filter(t => t.id === id || t.pinned);
    setTabs(newTabs);
    programNavigate(tabToKeep.path, id);
  };

  const closeAll = () => {
    // Keep pinned tabs
    const pinnedTabs = tabs.filter(t => t.pinned);
    if (pinnedTabs.length > 0) {
      setTabs(pinnedTabs);
      programNavigate(pinnedTabs[0].path, pinnedTabs[0].id);
    } else {
      const defaultId = "default-dashboard";
      const defaultTab = { id: defaultId, path: "/my-dashboard", title: "My Dashboard", pinned: false };
      setTabs([defaultTab]);
      programNavigate("/my-dashboard", defaultId);
    }
  };

  const pinTab = (id: string) => {
    setTabs(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, pinned: true } : t);
      // Sort: pinned tabs first
      const pinned = updated.filter(t => t.pinned);
      const unpinned = updated.filter(t => !t.pinned);
      return [...pinned, ...unpinned];
    });
  };

  const unpinTab = (id: string) => {
    setTabs(prev => {
      return prev.map(t => t.id === id ? { ...t, pinned: false } : t);
    });
  };

  const duplicateTab = (id: string) => {
    const tabToDuplicate = tabs.find(t => t.id === id);
    if (!tabToDuplicate) return;

    openTab(tabToDuplicate.path, {
      title: tabToDuplicate.title,
      forceNew: true
    });
  };

  const reorder = (startIndex: number, endIndex: number) => {
    setTabs(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const reopenClosedTab = () => {
    if (closedTabsHistory.length === 0) return;
    const [lastClosed, ...rest] = closedTabsHistory;
    setClosedTabsHistory(rest);

    // Generate new tab ID to prevent DOM conflicts but restore path & title
    const newId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const restoredTab = { ...lastClosed, id: newId };

    setTabs(prev => [...prev, restoredTab]);
    programNavigate(restoredTab.path, newId);
  };

  const setTabTitle = (id: string, title: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  };

  const switchToTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      programNavigate(tab.path, id);
    }
  };

  // Sync URL changes from browser location (e.g. sidebar navigation, back button)
  useEffect(() => {
    if (!isTabsEnabled) return;
    const currentPath = location.pathname + location.search;

    if (currentPath === "/" || currentPath === "/login" || currentPath === "/register") return;

    if (isSwitchingTabRef.current) {
      isSwitchingTabRef.current = false;
      return;
    }

    // Normal navigation: update active tab path
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      if (activeTab.path !== currentPath) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? {
          ...t,
          path: currentPath,
          title: getTabTitleFromPath(currentPath)
        } : t));
      }
    } else {
      // Create a new tab if no active tab found
      openTab(currentPath);
    }
  }, [location, isTabsEnabled, activeTabId, tabs]);

  // Intercept Middle Click and Ctrl+Click on all internal links to open in a new tab
  useEffect(() => {
    if (!isTabsEnabled) return;

    const handleLinkClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }

      if (target && target instanceof HTMLAnchorElement) {
        const href = target.getAttribute("href");
        if (href) {
          const isInternal = href.startsWith("/") && 
                             !href.startsWith("//") && 
                             !href.startsWith("/api");

          if (isInternal) {
            const isCtrlClick = e.ctrlKey || e.metaKey || e.shiftKey;
            const isMiddleClick = e.button === 1;

            if (isCtrlClick || isMiddleClick) {
              e.preventDefault();
              e.stopPropagation();
              openTab(href, { forceNew: true });
            }
          }
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);
    document.addEventListener("auxclick", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      document.removeEventListener("auxclick", handleLinkClick, true);
    };
  }, [isTabsEnabled, tabs, activeTabId]);

  return (
    <TabWorkspaceContext.Provider value={{
      isTabsEnabled,
      toggleTabsEnabled,
      tabs,
      activeTabId,
      openTab,
      closeTab,
      closeOthers,
      closeAll,
      pinTab,
      unpinTab,
      duplicateTab,
      reorder,
      reopenClosedTab,
      setTabTitle,
      switchToTab
    }}>
      {children}
    </TabWorkspaceContext.Provider>
  );
}

// Separate viewport render helper to provide tabId context
export const TabContext = createContext<{ tabId: string } | null>(null);

export function useCurrentTab() {
  return useContext(TabContext);
}

export function WorkspaceLayout() {
  const { isTabsEnabled, tabs, activeTabId, openTab, closeTab, pinTab, unpinTab, duplicateTab, closeOthers, closeAll, reorder, switchToTab } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const restrictedModules = profile?.restrictedModules || [];

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    tab: Tab | null;
  }>({ show: false, x: 0, y: 0, tab: null });

  // Handle click outside context menu to close it
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.show) setContextMenu({ show: false, x: 0, y: 0, tab: null });
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [contextMenu.show]);

  // Handle right click on tab
  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      tab
    });
  };

  // Horizontal scroll on wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (tabContainerRef.current) {
      tabContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Drag and drop events
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId === targetId) return;

    const fromIdx = tabs.findIndex(t => t.id === draggedId);
    const toIdx = tabs.findIndex(t => t.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      reorder(fromIdx, toIdx);
    }
  };

  // Close tabs to the right
  const closeTabsToTheRight = (id: string) => {
    const tabIdx = tabs.findIndex(t => t.id === id);
    if (tabIdx === -1) return;
    const tabsToKeep = tabs.filter((t, idx) => idx <= tabIdx || t.pinned);
    reorderTabs(tabsToKeep);
  };

  const reorderTabs = (newTabs: Tab[]) => {
    // Close tabs that are not in the new list
    const tabsToClose = tabs.filter(t => !newTabs.some(nt => nt.id === t.id));
    tabsToClose.forEach(t => closeTab(t.id));
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 overflow-hidden relative">
      {isTabsEnabled && (
        <div className="relative shrink-0 flex items-center bg-white/45 dark:bg-[#080a14]/65 border-b border-border/80 dark:border-white/10 px-4 py-1.5 gap-2 select-none z-30">
          {/* Scrollable tab bar */}
          <div
            ref={tabContainerRef}
            onWheel={handleWheel}
            className="flex-grow flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-1 h-9"
          >
            {tabs.map((tab) => {
              const IconComponent = getTabIconFromPath(tab.path);
              const isActive = tab.id === activeTabId;

              return (
                <div
                  key={tab.id}
                  draggable={!tab.pinned}
                  onDragStart={(e) => handleDragStart(e, tab.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, tab.id)}
                  onContextMenu={(e) => handleContextMenu(e, tab)}
                  onClick={() => {
                    if (tab.id !== activeTabId) {
                      switchToTab(tab.id);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[180px] min-w-[50px] font-outfit",
                    isActive
                      ? "bg-[#131b3d]/90 text-cyan-400 border-cyan-500/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.15)] font-bold"
                      : "bg-white/10 dark:bg-[#0d1127]/40 text-slate-500 dark:text-slate-400 border-transparent hover:bg-white/20 dark:hover:bg-[#121836]/60 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <IconComponent className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-cyan-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white")} />
                  
                  {(!tab.pinned || tab.title.length > 0) && (
                    <span className="truncate max-w-[100px] select-none">{tab.title}</span>
                  )}

                  {tab.pinned && (
                    <Pin className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400 shrink-0" />
                  )}

                  {!tab.pinned && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-black/20 hover:text-red-400 dark:hover:bg-white/10 dark:hover:text-red-300 rounded-full p-0.5 ml-1 transition-all shrink-0 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Quick dashboard add tab */}
            <button
              onClick={() => openTab("/my-dashboard", { forceNew: true })}
              className="p-1.5 rounded-lg border border-transparent hover:border-border hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer shrink-0"
              title="Open dashboard tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Tab Context Menu */}
      {contextMenu.show && contextMenu.tab && (
        <div
          className="fixed bg-[#0c101f]/95 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl py-1.5 z-[9999] text-[11px] font-outfit text-white min-w-[170px] animate-in fade-in zoom-in-95 duration-100 shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              if (contextMenu.tab?.pinned) {
                unpinTab(contextMenu.tab.id);
              } else if (contextMenu.tab) {
                pinTab(contextMenu.tab.id);
              }
              setContextMenu({ show: false, x: 0, y: 0, tab: null });
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Pin className="w-3.5 h-3.5 text-slate-400" />
            {contextMenu.tab.pinned ? "Unpin Tab" : "Pin Tab"}
          </button>
          <button
            onClick={() => {
              if (contextMenu.tab) duplicateTab(contextMenu.tab.id);
              setContextMenu({ show: false, x: 0, y: 0, tab: null });
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            Duplicate Tab
          </button>
          <div className="border-t border-white/5 my-1" />
          <button
            onClick={() => {
              if (contextMenu.tab) closeTab(contextMenu.tab.id);
              setContextMenu({ show: false, x: 0, y: 0, tab: null });
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Close Tab
          </button>
          <button
            onClick={() => {
              if (contextMenu.tab) closeOthers(contextMenu.tab.id);
              setContextMenu({ show: false, x: 0, y: 0, tab: null });
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <MinusSquare className="w-3.5 h-3.5 text-slate-400" />
            Close Other Tabs
          </button>
          <button
            onClick={() => {
              if (contextMenu.tab) closeTabsToTheRight(contextMenu.tab.id);
              setContextMenu({ show: false, x: 0, y: 0, tab: null });
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ArrowRightSquare className="w-3.5 h-3.5 text-slate-400" />
            Close Tabs to the Right
          </button>
          <button
            onClick={() => {
              closeAll();
              setContextMenu({ show: false, x: 0, y: 0, tab: null });
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <XSquare className="w-3.5 h-3.5" />
            Close All Tabs
          </button>
        </div>
      )}

      {/* Viewport render area */}
      <div className="flex-grow min-h-0 overflow-y-auto">
        {!isTabsEnabled ? (
          isRestrictedPath(location.pathname + location.search, restrictedModules) ? (
            <AccessRestricted />
          ) : (
            <Outlet />
          )
        ) : (
          <div className="w-full h-full relative">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn("w-full h-full", tab.id === activeTabId ? "block" : "hidden")}
              >
                <TabContext.Provider value={{ tabId: tab.id }}>
                  <TabContentMapper path={tab.path} />
                </TabContext.Provider>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
