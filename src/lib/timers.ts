export type StepTimer = { label: string; seconds: number };

const UNIT: Record<string, number> = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600 };
const RE = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|h|m|s)\b(?:\s*(?:and\s*)?(\d+)\s*(minutes?|mins?|m)\b)?/gi;

/** Find durations in a step ("simmer for 10–15 minutes", "1 hr 20 min"). Ranges use the upper bound. */
export function findTimers(text: string): StepTimer[] {
  const out: StepTimer[] = [];
  for (const m of text.matchAll(RE)) {
    const n = Number(m[2] ?? m[1]);
    const unit = UNIT[m[3].toLowerCase()];
    if (!unit || !Number.isFinite(n) || n <= 0) continue;
    let seconds = Math.round(n * unit);
    if (m[4] && m[5]) seconds += Number(m[4]) * 60;
    if (seconds < 5 || seconds > 24 * 3600) continue;
    out.push({ label: m[0].trim(), seconds });
  }
  return out;
}

export function formatClock(total: number): string {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}
