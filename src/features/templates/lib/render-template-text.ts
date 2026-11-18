import type { TemplateVariableApi } from "@/types/templates-api";

/** Mirrors the server: {key} or {key|fallback}; {{1}} is left alone. */
const PLACEHOLDER_RE = /(?<!\{)\{([a-zA-Z][a-zA-Z0-9_]{0,31})(?:\|([^{}\n]{0,100}))?\}(?!\})/g;
const BUILT_IN = ["name", "phone"];

export const BUILT_IN_VARIABLE_KEYS = BUILT_IN;

export type RenderContext = { name?: string | null; phone?: string | null };

export function renderTemplateText(
  text: string,
  variables: TemplateVariableApi[],
  ctx: RenderContext = {}
): string {
  const byKey = new Map(variables.map((v) => [v.key.toLowerCase(), v.value]));
  const own: Record<string, string> = { name: ctx.name?.trim() ?? "", phone: ctx.phone?.trim() ?? "" };
  const DROP = "\u0000";
  return text
    .replace(PLACEHOLDER_RE, (whole, rawKey: string, inline?: string) => {
      const key = rawKey.toLowerCase();
      const value = own[key] || inline?.trim() || byKey.get(key) || "";
      if (value) return value;
      return BUILT_IN.includes(key) ? DROP : whole;
    })
    .replace(/[ \t]*\u0000/g, "")
    .replace(/\u0000/g, "");
}

export function normalizeVariableKey(raw: string): string | null {
  const k = raw.trim().replace(/^\{|\}$/g, "").toLowerCase();
  return /^[a-z][a-z0-9_]{0,31}$/.test(k) ? k : null;
}

/** Keys used in the text that are neither built in nor defined yet. */
export function undefinedVariableKeys(texts: string[], variables: TemplateVariableApi[]): string[] {
  const known = new Set([...BUILT_IN, ...variables.map((v) => v.key)]);
  const found = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(PLACEHOLDER_RE)) {
      const k = m[1].toLowerCase();
      if (!known.has(k) && !m[2]) found.add(k);
    }
  }
  return [...found];
}

export const SHOW_IN_OPTIONS: { id: "follow_up" | "auto_reply" | "campaign" | "live_chat"; label: string }[] = [
  { id: "follow_up", label: "Follow-ups" },
  { id: "auto_reply", label: "Auto-reply" },
  { id: "campaign", label: "Campaigns" },
  { id: "live_chat", label: "Live chat quick replies" },
];

/** Folder label: old fixed categories get nice names, owner folders show as typed. */
export function folderLabel(value: string): string {
  const legacy: Record<string, string> = {
    general: "General",
    marketing: "Marketing",
    transactional: "Transactional",
    utility: "Utility",
  };
  return legacy[value] ?? value;
}

/** Whether a picker should list this template ("Show this template in"); keeps the current pick. */
export function isOfferedIn(
  t: { id: string; active?: boolean; showIn?: string[] },
  place: "follow_up" | "auto_reply" | "campaign" | "live_chat",
  keepId?: string | null
): boolean {
  if (keepId && t.id === keepId) return true;
  if (t.active === false) return false;
  return !t.showIn || t.showIn.includes(place);
}
