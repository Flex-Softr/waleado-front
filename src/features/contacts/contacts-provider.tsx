"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import {
  contactApiToRow,
  groupApiToRecord,
} from "@/features/contacts/lib/contacts-map";
import type {
  ContactGroupRecord,
  ContactRow,
  ContactRowStatus,
} from "@/types/contacts";
import type {
  BulkContactsResponse,
  ContactGroupDetailResponse,
  ContactGroupsListResponse,
  CreateContactGroupResponse,
  CreateContactResponse,
  RevalidatePhonesResponse,
  RemoveInvalidResponse,
  UpdateContactGroupResponse,
  UpdateContactResponse,
} from "@/types/contacts-api";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiError, apiJson } from "@/lib/api";

type ContactsState = {
  loading: boolean;
  groups: ContactGroupRecord[];
  /** Contacts keyed by group id (loaded on demand). */
  contactsByGroup: Record<string, ContactRow[]>;
  /** Refreshes groups from the API and returns the latest list (for consumers that need ids before React re-renders). */
  refreshGroups: () => Promise<ContactGroupRecord[]>;
  ensureGroupContacts: (groupId: string) => Promise<ContactGroupRecord>;
  addGroup: (name: string) => Promise<ContactGroupRecord>;
  renameGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addContact: (
    groupId: string,
    input: { name: string; phone: string }
  ) => Promise<void>;
  bulkAddContacts: (
    groupId: string,
    lines: string[]
  ) => Promise<BulkContactsResponse>;
  /** Batches at 2000 lines per request; refreshes once at the end. */
  importContactLines: (
    groupId: string,
    lines: string[]
  ) => Promise<{ created: number; skipped: BulkContactsResponse["skipped"] }>;
  updateContact: (
    groupId: string,
    contactId: string,
    input: { name?: string; phone?: string; status?: ContactRowStatus }
  ) => Promise<void>;
  deleteContact: (groupId: string, contactId: string) => Promise<void>;
  removeInvalidInGroup: (groupId: string) => Promise<number>;
  revalidateAllPhones: () => Promise<RevalidatePhonesResponse>;
  revalidateGroupPhones: (groupId: string) => Promise<RevalidatePhonesResponse>;
  contactsForGroup: (groupId: string) => ContactRow[];
  groupStats: (groupId: string) => {
    total: number;
    verified: number;
    unverified: number;
    invalid: number;
  };
  globalStats: () => {
    totalContacts: number;
    groups: number;
    verified: number;
    unverified: number;
    invalid: number;
  };
};

const ContactsContext = React.createContext<ContactsState | null>(null);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const { user, workspace } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = React.useState(true);
  const [groups, setGroups] = React.useState<ContactGroupRecord[]>([]);
  const [contactsByGroup, setContactsByGroup] = React.useState<
    Record<string, ContactRow[]>
  >({});
  // Lets the stable callbacks below see the latest loaded groups without re-creating them.
  const contactsByGroupRef = React.useRef(contactsByGroup);
  React.useEffect(() => {
    contactsByGroupRef.current = contactsByGroup;
  }, [contactsByGroup]);

  const refreshGroups = React.useCallback(async () => {
    const data = await apiJson<ContactGroupsListResponse>("/v1/contact-groups");
    const mapped = data.groups.map(groupApiToRecord);
    setGroups(mapped);
    return mapped;
  }, []);

  React.useEffect(() => {
    if (!user?.id || !workspace?.id) {
      setGroups([]);
      setContactsByGroup({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setGroups([]);
      setContactsByGroup({});
      try {
        await refreshGroups();
      } catch (err) {
        if (!cancelled) {
          setGroups([]);
          const msg =
            err instanceof ApiError ? err.message : "Could not load contacts.";
          toast.error("Contacts unavailable", { description: msg });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, workspace?.id, refreshGroups]);

  const prevPathForContactsRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!user?.id || !workspace?.id) return;
    const prev = prevPathForContactsRef.current;
    prevPathForContactsRef.current = pathname;
    if (prev === null) return;
    if (!pathname.startsWith("/contacts")) return;

    let cancelled = false;
    void (async () => {
      try {
        await refreshGroups();
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError ? err.message : "Could not refresh contacts.";
        toast.error("Contacts unavailable", { description: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, user?.id, workspace?.id, refreshGroups]);

  const ensureGroupContacts = React.useCallback(async (groupId: string) => {
    const detail = await apiJson<ContactGroupDetailResponse>(
      `/v1/contact-groups/${groupId}`
    );
    const rows = detail.contacts.map(contactApiToRow);
    const rec = groupApiToRecord(detail.group);
    setContactsByGroup((prev) => ({ ...prev, [groupId]: rows }));
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.id === groupId);
      if (idx === -1) {
        return [rec, ...prev];
      }
      const next = [...prev];
      next[idx] = rec;
      return next;
    });
    return rec;
  }, []);

  const contactsForGroup = React.useCallback(
    (groupId: string) => contactsByGroup[groupId] ?? [],
    [contactsByGroup]
  );

  const groupStats = React.useCallback(
    (groupId: string) => {
      const g = groups.find((x) => x.id === groupId);
      return (
        g?.stats ?? {
          total: 0,
          verified: 0,
          unverified: 0,
          invalid: 0,
        }
      );
    },
    [groups]
  );

  const globalStats = React.useCallback(() => {
    return groups.reduce(
      (acc, g) => ({
        totalContacts: acc.totalContacts + g.stats.total,
        groups: acc.groups + 1,
        verified: acc.verified + g.stats.verified,
        unverified: acc.unverified + g.stats.unverified,
        invalid: acc.invalid + g.stats.invalid,
      }),
      {
        totalContacts: 0,
        groups: 0,
        verified: 0,
        unverified: 0,
        invalid: 0,
      }
    );
  }, [groups]);

  const addGroup = React.useCallback(
    async (name: string) => {
      const data = await apiJson<CreateContactGroupResponse>(
        "/v1/contact-groups",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      const record = groupApiToRecord(data.group);
      setGroups((g) => [record, ...g]);
      setContactsByGroup((c) => ({ ...c, [record.id]: [] }));
      return record;
    },
    []
  );

  const renameGroup = React.useCallback(async (groupId: string, name: string) => {
    const data = await apiJson<UpdateContactGroupResponse>(
      `/v1/contact-groups/${groupId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }
    );
    const record = groupApiToRecord(data.group);
    setGroups((prev) => prev.map((g) => (g.id === groupId ? record : g)));
  }, []);

  const deleteGroup = React.useCallback(async (groupId: string) => {
    await apiJson(`/v1/contact-groups/${groupId}`, { method: "DELETE" });
    setGroups((g) => g.filter((x) => x.id !== groupId));
    setContactsByGroup((c) => {
      const next = { ...c };
      delete next[groupId];
      return next;
    });
  }, []);

  const addContact = React.useCallback(
    async (groupId: string, input: { name: string; phone: string }) => {
      await apiJson<CreateContactResponse>(
        `/v1/contact-groups/${groupId}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.name.trim() || "Contact",
            phone: input.phone,
          }),
        }
      );
      await refreshGroups();
      if (contactsByGroupRef.current[groupId]) {
        await ensureGroupContacts(groupId);
      }
    },
    [ensureGroupContacts, refreshGroups]
  );

  const bulkAddContacts = React.useCallback(
    async (groupId: string, lines: string[]) => {
      const out = await apiJson<BulkContactsResponse>(
        `/v1/contact-groups/${groupId}/contacts/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines }),
        }
      );
      await refreshGroups();
      if (contactsByGroupRef.current[groupId]) {
        await ensureGroupContacts(groupId);
      }
      return out;
    },
    [ensureGroupContacts, refreshGroups]
  );

  const BULK_MAX = 2000;

  const importContactLines = React.useCallback(
    async (groupId: string, lines: string[]) => {
      const trimmed = lines.map((l) => l.trim()).filter(Boolean);
      const skipped: BulkContactsResponse["skipped"] = [];
      let created = 0;
      for (let i = 0; i < trimmed.length; i += BULK_MAX) {
        const chunk = trimmed.slice(i, i + BULK_MAX);
        const out = await apiJson<BulkContactsResponse>(
          `/v1/contact-groups/${groupId}/contacts/bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lines: chunk }),
          }
        );
        created += out.created.length;
        skipped.push(...out.skipped);
      }
      await refreshGroups();
      if (contactsByGroupRef.current[groupId]) {
        await ensureGroupContacts(groupId);
      }
      return { created, skipped };
    },
    [ensureGroupContacts, refreshGroups]
  );

  const updateContact = React.useCallback(
    async (
      groupId: string,
      contactId: string,
      input: { name?: string; phone?: string; status?: ContactRowStatus }
    ) => {
      const body: Record<string, string> = {};
      if (input.name !== undefined) body.name = input.name;
      if (input.phone !== undefined) body.phone = input.phone;
      if (input.status !== undefined) body.status = input.status;
      const data = await apiJson<UpdateContactResponse>(
        `/v1/contacts/${contactId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const row = contactApiToRow(data.contact);
      setContactsByGroup((prev) => {
        const list = prev[groupId];
        if (!list) return prev;
        return {
          ...prev,
          [groupId]: list.map((c) => (c.id === contactId ? row : c)),
        };
      });
      await refreshGroups();
    },
    [refreshGroups]
  );

  const deleteContact = React.useCallback(
    async (groupId: string, contactId: string) => {
      await apiJson(`/v1/contacts/${contactId}`, { method: "DELETE" });
      setContactsByGroup((prev) => {
        const list = prev[groupId];
        if (!list) return prev;
        return {
          ...prev,
          [groupId]: list.filter((c) => c.id !== contactId),
        };
      });
      await refreshGroups();
    },
    [refreshGroups]
  );

  const removeInvalidInGroup = React.useCallback(
    async (groupId: string) => {
      const data = await apiJson<RemoveInvalidResponse>(
        `/v1/contact-groups/${groupId}/actions/remove-invalid`,
        { method: "POST" }
      );
      await refreshGroups();
      if (contactsByGroupRef.current[groupId]) {
        await ensureGroupContacts(groupId);
      }
      return data.removed;
    },
    [ensureGroupContacts, refreshGroups]
  );

  const revalidateAllPhones = React.useCallback(async () => {
    const data = await apiJson<RevalidatePhonesResponse>(
      "/v1/contact-groups/actions/revalidate-phones",
      { method: "POST" }
    );
    await refreshGroups();
    const loaded = Object.keys(contactsByGroupRef.current);
    await Promise.all(loaded.map((id) => ensureGroupContacts(id)));
    return data;
  }, [ensureGroupContacts, refreshGroups]);

  const revalidateGroupPhones = React.useCallback(
    async (groupId: string) => {
      const data = await apiJson<RevalidatePhonesResponse>(
        `/v1/contact-groups/${groupId}/actions/revalidate-phones`,
        { method: "POST" }
      );
      await refreshGroups();
      if (contactsByGroupRef.current[groupId]) {
        await ensureGroupContacts(groupId);
      }
      return data;
    },
    [ensureGroupContacts, refreshGroups]
  );

  const value = React.useMemo(
    () => ({
      loading,
      groups,
      contactsByGroup,
      refreshGroups,
      ensureGroupContacts,
      addGroup,
      renameGroup,
      deleteGroup,
      addContact,
      bulkAddContacts,
      importContactLines,
      updateContact,
      deleteContact,
      removeInvalidInGroup,
      revalidateAllPhones,
      revalidateGroupPhones,
      contactsForGroup,
      groupStats,
      globalStats,
    }),
    [
      loading,
      groups,
      contactsByGroup,
      refreshGroups,
      ensureGroupContacts,
      addGroup,
      renameGroup,
      deleteGroup,
      addContact,
      bulkAddContacts,
      importContactLines,
      updateContact,
      deleteContact,
      removeInvalidInGroup,
      revalidateAllPhones,
      revalidateGroupPhones,
      contactsForGroup,
      groupStats,
      globalStats,
    ]
  );

  return (
    <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = React.useContext(ContactsContext);
  if (!ctx) {
    throw new Error("useContacts must be used within ContactsProvider");
  }
  return ctx;
}

