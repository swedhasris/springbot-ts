/**
 * src/contexts/TicketsContext.tsx
 *
 * Pure REST API tickets context — Firebase removed.
 */
import React, { createContext, useContext, useEffect, useState } from"react";
import { useAuth } from"./AuthContext";

interface Ticket {
 id: string;
 number: string;
 title: string;
 status: string;
 priority: string;
 assignedTo?: string;
 assignedToName?: string;
 createdBy: string;
 createdAt: any;
 updatedAt: any;
}

interface TicketsContextType {
 tickets: Ticket[];
 openTicketsCount: number;
 assignedToMeCount: number;
 loading: boolean;
 error: string | null;
}

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

export function useTickets() {
 const context = useContext(TicketsContext);
 if (context === undefined) throw new Error("useTickets must be used within a TicketsProvider");
 return context;
}

export function TicketsProvider({ children }: { children: React.ReactNode }) {
 const { user, profile } = useAuth();
 const [tickets, setTickets] = useState<Ticket[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!user) {
 setLoading(false);
 return;
 }

 setLoading(true);
 setError(null);

 const fetchOpenTickets = async () => {
 try {
 const res = await fetch("/api/tickets/open");
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const data = await res.json();
 const mapped: Ticket[] = data.map((t: any) => ({
 id: String(t.id || t.ticket_number ||""),
 number: t.ticket_number || t.number ||"",
 title: t.title ||"",
 status: t.status ||"New",
 priority: t.priority ||"4 - Low",
 assignedTo: t.assigned_to || t.assignedTo ||"",
 assignedToName: t.assigned_to_name || t.assignedToName ||"",
 createdBy: t.created_by || t.createdBy ||"",
 createdAt: t.created_at || t.createdAt || null,
 updatedAt: t.updated_at || t.updatedAt || null,
 }));
 setTickets(mapped);
 } catch (err: any) {
 console.warn("[TicketsContext] Fetch error (non-fatal):", err.message);
 setError(null);
 } finally {
 setLoading(false);
 }
 };

 fetchOpenTickets();
 // Poll every 60 seconds for sidebar badge counts (reduced from 30s for performance)
 const interval = setInterval(fetchOpenTickets, 60_000);
 return () => clearInterval(interval);
 }, [user]);

 const openTicketsCount = tickets.length;
 const assignedToMeCount = tickets.filter(
 (t) => t.assignedTo === user?.uid || t.assignedTo === profile?.name
 ).length;

 const value: TicketsContextType = {
 tickets,
 openTicketsCount,
 assignedToMeCount,
 loading,
 error,
 };

 return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}
