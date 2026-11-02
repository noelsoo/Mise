import { parseRecipeText } from './text';
import type { RecipeDraft } from './types';

export type SocialSite = 'tiktok' | 'instagram';

export function socialSite(input: string): SocialSite | null {
  let host: string;
  try {
    host = new URL(input).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram';
  return null;
}

export function tiktokOembedUrl(videoUrl: string): string {
  return `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => safeCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

export function metaContent(html: string, property: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (key?.toLowerCase() !== property) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i);
    const value = content?.[1] ?? content?.[2];
    if (value) return decodeEntities(value).trim();
  }
  return null;
}

export type SocialPost = { caption: string; image: string | null; author: string | null };

export function parseTikTokOembed(json: unknown): SocialPost | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const caption = typeof o.title === 'string' ? o.title.trim() : '';
  const image = typeof o.thumbnail_url === 'string' ? o.thumbnail_url : null;
  // A video with no caption still has a thumbnail and author; an error response has neither.
  if (!caption && !image) return null;
  return { caption, image, author: typeof o.author_name === 'string' ? o.author_name : null };
}

/** Instagram puts the caption in og:title (`Name on Instagram: "caption"`) and og:description (`12 likes, 3 comments - name on date: "caption"`). */
export function parseInstagramHtml(html: string): SocialPost | null {
  const title = metaContent(html, 'og:title');
  const desc = metaContent(html, 'og:description');
  const fromTitle = title?.match(/^(.*?) on Instagram:\s*["“]([\s\S]*)["”]\s*$/)?.[2];
  const fromDesc = desc?.match(/^[\s\S]*?\s-\s[\s\S]*?:\s*["“]([\s\S]*?)["”]\.?\s*$/)?.[1];
  // Either can be truncated; keep the longer one.
  const caption = [fromTitle, fromDesc].filter((c): c is string => !!c).sort((a, b) => b.length - a.length)[0]?.trim();
  if (!caption) return null;
  return {
    caption,
    image: metaContent(html, 'og:image'),
    author: title?.match(/^(.*?) on Instagram:/)?.[1]?.trim() ?? null,
  };
}

const HASHTAG = /(^|\s)#([\p{L}\p{N}_]{2,40})/gu;

/** Turn a video caption into a draft. Falls back to a notes-only draft when the caption has no recipe in it. */
export function captionToDraft(post: SocialPost, sourceUrl: string): { draft: RecipeDraft; warning?: string } {
  const tags = [...post.caption.matchAll(HASHTAG)].map((m) => m[2].toLowerCase());
  const text = post.caption
    .replace(HASHTAG, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const draft = parseRecipeText(text);
  draft.tags = [...new Set([...draft.tags, ...tags])].slice(0, 10);
  draft.sourceUrl = sourceUrl;
  draft.imageUrls = post.image ? [post.image] : [];
  if (draft.ingredients.length || draft.steps.length) return { draft };
  const [first = '', ...rest] = text.split('\n');
  draft.title = first.replace(/[^\p{L}\p{N}\s'&,-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Video recipe';
  draft.notes = [rest.join('\n').trim() || text, post.author ? `Video by ${post.author}` : null].filter(Boolean).join('\n\n').slice(0, 4000);
  return { draft, warning: "The caption doesn't list ingredients or steps, so the recipe may be spoken in the video. Watch it and fill them in, or paste the recipe text instead." };
}
