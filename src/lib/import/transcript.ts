import { z } from 'zod';
import { socialSite } from './social';

const API = 'https://api.supadata.ai/v1/transcript';
const MAX_CHARS = 20_000;

const done = z.object({ content: z.union([z.string(), z.array(z.object({ text: z.string() }))]) });
const queued = z.object({ jobId: z.string().min(1).max(200) });
const job = z.object({ status: z.string(), content: z.union([z.string(), z.array(z.object({ text: z.string() }))]).optional() });

/** Normalise the API's text-or-segments content into one capped string. */
export function transcriptText(content: string | { text: string }[]): string {
  const text = typeof content === 'string' ? content : content.map((c) => c.text).join(' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

async function getJson(url: string, key: string, signal: AbortSignal): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { headers: { 'x-api-key': key, Accept: 'application/json' }, signal, redirect: 'error' });
  const body: unknown = await res.json().catch(() => null);
  return { status: res.status, body };
}

/**
 * Transcript of a public TikTok or Instagram video via the Supadata API. Returns null when no key is
 * configured, the link isn't TikTok/Instagram, or anything fails: transcripts only ever add to an import.
 */
export async function fetchTranscript(videoUrl: string): Promise<string | null> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key || !socialSite(videoUrl)) return null;
  const signal = AbortSignal.timeout(40_000);
  try {
    const first = await getJson(`${API}?url=${encodeURIComponent(videoUrl)}&text=true&mode=auto`, key, signal);
    if (first.status === 200) {
      const ok = done.safeParse(first.body);
      return ok.success ? transcriptText(ok.data.content) || null : null;
    }
    if (first.status !== 202) return null;
    const q = queued.safeParse(first.body);
    if (!q.success) return null;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const res = await getJson(`${API}/${encodeURIComponent(q.data.jobId)}`, key, signal);
      const j = job.safeParse(res.body);
      if (!j.success) return null;
      if (j.data.status === 'completed') return j.data.content ? transcriptText(j.data.content) || null : null;
      if (j.data.status === 'failed') return null;
    }
    return null;
  } catch {
    return null;
  }
}
