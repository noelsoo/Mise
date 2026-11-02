import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = 'Mozilla/5.0 (compatible; MiseRecipeImporter/1.0)';

function isPrivateV4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && p[2] === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase().split('%')[0];
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const o = v4[1].split('.').map(Number);
    s = s.slice(0, -v4[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g)) ? groups : null;
}

export function isPrivateAddress(ip: string): boolean {
  const addr = ip.replace(/^\[|\]$/g, '');
  const kind = isIP(addr);
  if (kind === 4) return isPrivateV4(addr);
  if (kind !== 6) return true;
  const g = expandV6(addr);
  if (!g) return true;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
    // IPv4-mapped / compatible
    return isPrivateV4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  }
  if (g[0] === 0x64 && g[1] === 0xff9b) return true; // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  return false;
}

export function assertSafeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https URLs are allowed');
  if (url.username || url.password) throw new Error('URLs with credentials are not allowed');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) throw new Error('Invalid URL');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Host is not allowed');
  }
  const bare = host.replace(/^\[|\]$/g, '');
  if (isIP(bare) && isPrivateAddress(bare)) throw new Error('Address is not allowed');
  return url;
}

async function assertResolvesPublic(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return;
  const addrs = await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new Error('Host resolves to a disallowed address');
  }
}

/**
 * Fetch a public URL with SSRF protection: http(s) only, every hop (including
 * redirects) must resolve to a public address, 10 s timeout, size cap, and an
 * allow-listed content type. Returns the raw bytes.
 */
async function safeFetch(url: string, opts: { accept: string; type: RegExp; maxBytes: number }) {
  let current = assertSafeUrl(url);
  const signal = AbortSignal.timeout(10_000);
  for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
    await assertResolvesPublic(current);
    const res = await fetch(current, { redirect: 'manual', signal, headers: { 'User-Agent': USER_AGENT, Accept: opts.accept } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.body?.cancel();
      if (!loc) throw new Error('Redirect without Location');
      current = assertSafeUrl(new URL(loc, current).href);
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`Page returned status ${res.status}`);
    }
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!opts.type.test(type)) {
      await res.body?.cancel();
      throw new Error('Unexpected content type');
    }
    return { bytes: await readBytes(res, opts.maxBytes), type: type.split(';')[0].trim() };
  }
  throw new Error('Too many redirects');
}

async function readBytes(res: Response, max: number): Promise<Buffer> {
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new Error('Response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function fetchRecipePage(url: string): Promise<string> {
  const { bytes } = await safeFetch(url, { accept: 'text/html,application/xhtml+xml', type: /^(text\/html|application\/xhtml\+xml)\b/, maxBytes: MAX_BYTES });
  return new TextDecoder('utf-8').decode(bytes);
}

/** Download an image (JPEG/PNG/WebP/AVIF, max 5 MB) so we store our own copy. */
export async function fetchImage(url: string): Promise<{ bytes: Buffer; type: string }> {
  return safeFetch(url, { accept: 'image/avif,image/webp,image/jpeg,image/png', type: /^image\/(jpeg|png|webp|avif)\b/, maxBytes: 5 * 1024 * 1024 });
}
