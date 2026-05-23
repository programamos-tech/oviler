"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACTIVE_BRANCH_CHANGED_EVENT,
  readActiveBranchId,
  setActiveBranchId,
} from "@/lib/active-branch";
import { type OrgTrialFields } from "@/lib/trial-ux";

export type SessionBranch = {
  id: string;
  name: string;
  logo_url: string | null;
  show_expenses: boolean;
  sales_mode: string;
};

export type SessionProfile = {
  name: string;
  email: string;
  role: string | null;
  permissions: string[] | null;
  avatar_url: string | null;
  organization_id: string | null;
};

export type SessionLicense = {
  requires_unlock: boolean;
  license_period_end: string | null;
};

type BranchAssignmentRow = {
  branch_id: string;
  branches:
    | {
        name?: string | null;
        logo_url?: string | null;
        show_expenses?: boolean | null;
        sales_mode?: string | null;
      }
    | Array<{
        name?: string | null;
        logo_url?: string | null;
        show_expenses?: boolean | null;
        sales_mode?: string | null;
      }>
    | null;
};

type SessionContextValue = {
  ready: boolean;
  userId: string | null;
  profile: SessionProfile | null;
  branchId: string | null;
  branch: SessionBranch | null;
  org: OrgTrialFields | null;
  authMeta: Record<string, unknown> | null;
  license: SessionLicense;
  refreshSession: (preferredBranchId?: string | null) => Promise<void>;
};

const defaultLicense: SessionLicense = { requires_unlock: false, license_period_end: null };

const SessionContext = createContext<SessionContextValue | null>(null);

function branchFromRow(row: BranchAssignmentRow | undefined): SessionBranch | null {
  if (!row?.branch_id) return null;
  const br = row.branches;
  const branchObj = (Array.isArray(br) ? br[0] : br) as BranchAssignmentRow["branches"] extends infer T
    ? T extends Array<infer U>
      ? U
      : T
    : never;
  if (!branchObj) return null;
  return {
    id: row.branch_id,
    name: String(branchObj.name ?? "").trim(),
    logo_url: branchObj.logo_url ?? null,
    show_expenses: branchObj.show_expenses !== false,
    sales_mode: branchObj.sales_mode === "orders" ? "orders" : "sales",
  };
}

function resolveBranchFromAssignments(
  rows: BranchAssignmentRow[],
  preferredBranchId?: string | null
): SessionBranch | null {
  const assignedIds = [...new Set(rows.map((r) => r.branch_id).filter(Boolean))];
  if (assignedIds.length === 0) return null;

  const stored = readActiveBranchId();
  const candidate =
    (preferredBranchId && assignedIds.includes(preferredBranchId) && preferredBranchId) ||
    (stored && assignedIds.includes(stored) && stored) ||
    assignedIds[0];

  if (candidate && candidate !== stored) setActiveBranchId(candidate);

  const match = rows.find((r) => r.branch_id === candidate);
  return branchFromRow(match);
}

async function fetchLicenseStatus(): Promise<SessionLicense> {
  try {
    const res = await fetch("/api/auth/license-status", { credentials: "include" });
    if (!res.ok) return defaultLicense;
    const json = (await res.json()) as {
      requires_unlock?: boolean;
      license_period_end?: string | null;
      organization?: { trial_ends_at?: string | null } | null;
    };
    return {
      requires_unlock: Boolean(json.requires_unlock),
      license_period_end: json.license_period_end ?? json.organization?.trial_ends_at ?? null,
    };
  } catch {
    return defaultLicense;
  }
}

export function SessionProvider({
  children,
  preferredBranchId,
  skipLicenseCheck = false,
}: {
  children: ReactNode;
  preferredBranchId?: string | null;
  skipLicenseCheck?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [branch, setBranch] = useState<SessionBranch | null>(null);
  const [org, setOrg] = useState<OrgTrialFields | null>(null);
  const [authMeta, setAuthMeta] = useState<Record<string, unknown> | null>(null);
  const [license, setLicense] = useState<SessionLicense>(defaultLicense);

  const refreshSession = useCallback(async (branchOverride?: string | null) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setProfile(null);
      setBranch(null);
      setOrg(null);
      setAuthMeta(null);
      setLicense(defaultLicense);
      setReady(true);
      return;
    }

    setUserId(user.id);
    setAuthMeta((user.user_metadata as Record<string, unknown> | null) ?? null);

    const preferred = branchOverride ?? preferredBranchId ?? null;

    const [profileRes, branchesRes, licenseFromApi] = await Promise.all([
      supabase
        .from("users")
        .select(
          "name, email, role, permissions, avatar_url, organization_id, organizations(subscription_status, plan_type, trial_ends_at)"
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("user_branches")
        .select("branch_id, branches(name, logo_url, show_expenses, sales_mode)")
        .eq("user_id", user.id),
      skipLicenseCheck ? Promise.resolve(defaultLicense) : fetchLicenseStatus(),
    ]);

    const licenseRes = licenseFromApi;

    const profileRow = profileRes.data as
      | (SessionProfile & {
          organizations?:
            | OrgTrialFields
            | OrgTrialFields[]
            | null;
        })
      | null;

    if (profileRow) {
      const { organizations: orgJoin, ...rest } = profileRow;
      setProfile(rest);
      const orgRow = Array.isArray(orgJoin) ? orgJoin[0] : orgJoin;
      setOrg((orgRow as OrgTrialFields | null | undefined) ?? null);
    } else {
      setProfile(null);
      setOrg(null);
    }

    const assignments = (branchesRes.data ?? []) as BranchAssignmentRow[];
    setBranch(resolveBranchFromAssignments(assignments, preferred));
    setLicense(licenseRes);
    setReady(true);
  }, [preferredBranchId, skipLicenseCheck]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshSession();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  useEffect(() => {
    const onBranchChanged = () => {
      void refreshSession();
    };
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranchChanged);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranchChanged);
  }, [refreshSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      userId,
      profile,
      branchId: branch?.id ?? null,
      branch,
      org,
      authMeta,
      license,
      refreshSession,
    }),
    [ready, userId, profile, branch, org, authMeta, license, refreshSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}
