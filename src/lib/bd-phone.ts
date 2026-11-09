/**
 * Normalises a phone typed by a Bangladeshi user to E.164.
 * "01711-111111", "8801711111111" and "+8801711111111" all become "+8801711111111";
 * numbers already starting with "+" are kept as typed (digits only).
 */
export function normalizeBdPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}
