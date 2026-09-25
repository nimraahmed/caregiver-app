import type { SelectedCard } from "./types";

const MAX = 1500;

/** WhatsApp share text: title, This-week items, footer; capped at ~1,500 chars. */
export function buildShareText(cards: SelectedCard[]): string {
  const week = cards.filter((c) => c.urgency === "this_week");
  const header = "Home adaptation plan — this week:\n";
  const footer = "\n\nMade with Home Adaptation Companion. Not medical advice — ask a doctor or nurse for health questions.";
  const lines: string[] = [];
  let length = header.length + footer.length;
  for (const c of week) {
    const line = `• ${c.action}${c.owner === "caregiver" ? " (you)" : ""}`;
    if (length + line.length + 1 > MAX) {
      lines.push(`…and ${week.length - lines.length} more`);
      break;
    }
    lines.push(line);
    length += line.length + 1;
  }
  return header + lines.join("\n") + footer;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
