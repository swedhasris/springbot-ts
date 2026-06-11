/**
 * src/lib/serviceCatalog.ts
 *
 * Service catalog hook — Firebase/Firestore removed.
 * Uses REST API polling against the Spring Boot backend.
 */
import { useEffect, useState } from "react";

export type Status = "active" | "inactive";

export type CategoryItem = {
  id: string;
  name: string;
  description?: string;
  status: Status;
  createdAt: any;
  createdBy: string;
};

export type SubcategoryItem = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  status: Status;
  createdAt: any;
  createdBy: string;
};

export type ServiceProviderItem = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId: string;
  sla: string;
  status: Status;
  createdAt: any;
  createdBy: string;
};

export type GroupItem = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: string;
  managerId?: string;
  managerName?: string;
  emailAlias?: string;
  businessHours?: string;
  timezone?: string;
  escalationGroupId?: string;
  parentGroupId?: string;
  defaultAssigneeId?: string;
  status: Status;
  autoAssignmentEnabled: boolean;
  roundRobinEnabled: boolean;
  skillTags?: string[];
  queueCapacity?: number;
  region?: string;
  slaPolicyId?: string;
  serviceProviderId?: string;
  memberCount: number;
  openTickets?: number;
  slaCompliance?: number;
  createdAt: any;
  createdBy: string;
  updatedAt?: any;
  updatedBy?: string;
};

export const GROUP_TYPES = [
  "Service Desk",
  "L1 Support",
  "L2 Support",
  "L3 Engineering",
  "Infrastructure Team",
  "Network Team",
  "Security Team",
  "Vendor Support",
  "Field Support",
  "Approval Group",
];

export type GroupMemberItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  groupId: string;
  roleInGroup: string;
  isPrimary: boolean;
  availabilityStatus: "available" | "away" | "offline";
  currentWorkload: number;
  skills?: string[];
  status: Status;
  createdAt: any;
  createdBy: string;
};

export const GROUP_MEMBER_ROLES = [
  "Group Manager",
  "Team Lead",
  "Senior Agent",
  "Support Agent",
  "Observer",
];

export type AuditLog = {
  id: string;
  moduleId: string;
  moduleName: string;
  action: "create" | "update" | "delete";
  oldValue: any;
  newValue: any;
  performedBy: string;
  performedByRole: string;
  timestamp: any;
};

function sortByCreatedAt(a: any, b: any) {
  const aTime = a.createdAt?.seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
  const bTime = b.createdAt?.seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
  return aTime - bTime;
}

async function fetchCollection<T>(endpoint: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/${endpoint}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function useServiceCatalog() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);

  const fetchAll = async () => {
    const [cats, subs, providers, grps, mems] = await Promise.all([
      fetchCollection<CategoryItem>("settings_categories"),
      fetchCollection<SubcategoryItem>("settings_subcategories"),
      fetchCollection<ServiceProviderItem>("settings_service_providers"),
      fetchCollection<GroupItem>("settings_groups"),
      fetchCollection<GroupMemberItem>("settings_group_members"),
    ]);
    setCategories([...cats].sort(sortByCreatedAt));
    setSubcategories([...subs].sort(sortByCreatedAt));
    setServiceProviders([...providers].sort(sortByCreatedAt));
    setGroups([...grps].sort(sortByCreatedAt));
    setMembers([...mems].sort(sortByCreatedAt));
  };

  useEffect(() => {
    fetchAll();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  return { categories, subcategories, serviceProviders, groups, members };
}

export function getSubcategoriesForCategory(subcategories: SubcategoryItem[], categoryId: string) {
  return subcategories.filter((item) => item.categoryId === categoryId && item.status === "active");
}

export function getServiceProvidersForSubcategory(
  providers: ServiceProviderItem[],
  subcategoryId: string
) {
  return providers.filter((item) => item.subcategoryId === subcategoryId && item.status === "active");
}

export function getGroupsForServiceProvider(groups: GroupItem[], serviceProviderId: string) {
  return groups.filter(
    (group) => group.serviceProviderId === serviceProviderId && group.status === "active"
  );
}

export function getMembersForGroup(members: GroupMemberItem[], groupId: string) {
  return members.filter((member) => member.groupId === groupId && member.status === "active");
}
