import React, { useEffect, useState, useRef, useCallback } from "react";
import { History, CheckCircle2, Search, Filter, RefreshCw, Lock, Globe, Mail, Settings, AlertTriangle, UserCheck, Clock } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { EmailActivityCard } from "./EmailActivityCard";
import { SystemActivityCard } from "./SystemActivityCard";
import { cn } from "@/lib/utils";

export interface ActivityTimelineProps {
  ticketId: string;
  createdAt?: any;
  refreshTrigger?: number;
  userRole?: string; // to determine visibility permissions
}

type FilterType = "all" | "work_notes" | "comments" | "system" | "emails";

const FILTER_TABS: { key: FilterType; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  { key: "all", label: "All", icon: <History className="w-3 h-3" />, color: "bg-muted/50 text-muted-foreground hover:bg-muted", activeColor: "bg-sn-dark text-white" },
  { key: "work_notes", label: "Internal Notes", icon: <Lock className="w-3 h-3" />, color: "bg-muted/50 text-muted-foreground hover:bg-muted", activeColor: "bg-amber-500 text-white" },
  { key: "comments", label: "Customer Comments", icon: <Globe className="w-3 h-3" />, color: "bg-muted/50 text-muted-foreground hover:bg-muted", activeColor: "bg-blue-600 text-white" },
  { key: "system", label: "System", icon: <Settings className="w-3 h-3" />, color: "bg-muted/50 text-muted-foreground hover:bg-muted", activeColor: "bg-gray-500 text-white" },
  { key: "emails", label: "Emails", icon: <Mail className="w-3 h-3" />, color: "bg-muted/50 text-muted-foreground hover:bg-muted", activeColor: "bg-purple-600 text-white" },
];

const POLL_INTERVAL = 30000; // 30s real-time polling

export function ActivityTimeline({ ticketId, createdAt, refreshTrigger = 0, userRole }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const endOfTimelineRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityCountRef = useRef(0);

  const fetchActivities = useCallback(async (silent = false) => {
    if (!ticketId) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/activities`);
      if (res.ok) {
        const data = await res.json();
        // Deduplicate by ID
        const seen = new Set<string>();
        const unique = data.filter((a: any) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        setActivities(unique);

        // Auto-scroll only when new activities arrive
        if (unique.length > lastActivityCountRef.current && lastActivityCountRef.current > 0) {
          setTimeout(() => {
            endOfTimelineRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
        lastActivityCountRef.current = unique.length;
      }
    } catch (err) {
      console.error("Failed to fetch activities", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticketId]);

  // Initial load + refresh trigger
  useEffect(() => {
    fetchActivities();
  }, [ticketId, refreshTrigger, fetchActivities]);

  // Real-time polling
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      setIsPolling(true);
      fetchActivities(true).finally(() => setIsPolling(false));
    }, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchActivities]);

  // Auto-scroll on initial load
  useEffect(() => {
    if (!loading && activities.length > 0) {
      setTimeout(() => {
        endOfTimelineRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [loading]);

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      if (typeof date === "string") {
        const d = new Date(date);
        if (isNaN(d.getTime())) return "-";
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
          hour: '2-digit', minute: '2-digit'
        });
      }
      if (date.seconds !== undefined) {
        const d = new Date(Number(date.seconds) * 1000);
        return isNaN(d.getTime()) ? "-" : d.toLocaleString();
      }
    } catch (e) {
      return "-";
    }
    return "-";
  };

  const filteredActivities = activities.filter(a => {
    // Filter by type
    if (filter === "comments" && a.activity_type !== "comment") return false;
    if (filter === "work_notes" && a.activity_type !== "work_note") return false;
    if (filter === "emails" && !a.activity_type.startsWith("email")) return false;
    if (filter === "system" && a.activity_type !== "status_change" && a.activity_type !== "system" && a.activity_type !== "sla_triggered" && a.activity_type !== "assignment_change") return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      if (!a.message?.toLowerCase().includes(searchLower) &&
        !a.created_by_name?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Role-based visibility: customers should never see internal notes
    if (userRole === 'user' && a.visibility_type === 'internal') return false;

    return true;
  });

  // Count activities by type for badge display
  const counts = {
    all: activities.length,
    work_notes: activities.filter(a => a.activity_type === 'work_note').length,
    comments: activities.filter(a => a.activity_type === 'comment').length,
    system: activities.filter(a => ['status_change', 'system', 'sla_triggered', 'assignment_change'].includes(a.activity_type)).length,
    emails: activities.filter(a => a.activity_type?.startsWith('email')).length,
  };

  const handleManualRefresh = () => {
    setIsPolling(true);
    fetchActivities(true).finally(() => setIsPolling(false));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-sn-dark flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Activity Stream
            {isPolling && (
              <span className="flex items-center gap-1 text-[9px] text-blue-500 font-medium normal-case tracking-normal">
                <RefreshCw className="w-3 h-3 animate-spin" />
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-md outline-none focus:ring-1 focus:ring-sn-green w-44 bg-white transition-shadow focus:shadow-sm"
              />
            </div>
            <button
              onClick={handleManualRefresh}
              className="p-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-sn-dark"
              title="Refresh activities"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isPolling && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(tab => {
            const isActive = filter === tab.key;
            const count = counts[tab.key];
            // Hide email tab if no emails
            if (tab.key === 'emails' && count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                  isActive ? tab.activeColor : tab.color
                )}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center",
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#f8fafc] min-h-[200px] max-h-[600px]">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="pl-6 border-l border-border ml-2 relative">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200"></div>
                <div className="h-20 bg-gray-100 rounded-lg w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Initial Creation Node */}
            {createdAt && (
              <div className="relative pl-6 pb-4 border-l-2 border-green-200 ml-2 group">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-green-500 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110">
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-green-800">Ticket Created</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{formatDate(createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredActivities.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                {search ? (
                  <>
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">No activities found matching "{search}"</p>
                  </>
                ) : filter !== "all" ? (
                  <>
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">No {filter.replace('_', ' ')} found</p>
                    <button onClick={() => setFilter("all")} className="text-[10px] text-blue-500 hover:underline mt-1">Show all activities</button>
                  </>
                ) : (
                  <>
                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">No activity recorded yet</p>
                    <p className="text-[10px] mt-1">Add a work note or comment to start the activity stream</p>
                  </>
                )}
              </div>
            )}

            {/* Activity Cards */}
            {filteredActivities.map((activity) => {
              if (activity.activity_type?.startsWith("email")) {
                return <div key={activity.id}><EmailActivityCard activity={activity} formatDate={formatDate} /></div>;
              }
              if (activity.activity_type === "work_note" || activity.activity_type === "comment") {
                return <div key={activity.id}><ActivityCard activity={activity} formatDate={formatDate} /></div>;
              }
              return <div key={activity.id}><SystemActivityCard activity={activity} formatDate={formatDate} /></div>;
            })}

            <div ref={endOfTimelineRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-2 border-t border-border bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="font-medium">{filteredActivities.length} of {activities.length} activities</span>
          {filter !== "all" && (
            <span className="text-blue-500">• Filtered: {filter.replace('_', ' ')}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span>Live updates every 30s</span>
        </div>
      </div>
    </div>
  );
}
