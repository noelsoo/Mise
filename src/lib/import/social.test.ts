import { describe, it, expect } from 'vitest';
import { captionToDraft, decodeEntities, parseInstagramHtml, parseTikTokOembed, socialSite } from './social';

describe('socialSite', () => {
  it.each([
    ['https://www.tiktok.com/@a/video/123', 'tiktok'],
    ['https://vm.tiktok.com/ZMabc/', 'tiktok'],
    ['https://www.instagram.com/reel/Cabc/', 'instagram'],
    ['https://instagr.am/p/abc', 'instagram'],
    ['https://nottiktok.com/x', null],
    ['https://tiktok.com.evil.example/x', null],
    ['not a url', null],
  ])('%s', (url, want) => expect(socialSite(url)).toBe(want));
});

describe('parseTikTokOembed', () => {
  it('reads caption, thumbnail and author', () => {
    expect(parseTikTokOembed({ title: 'Garlic noodles #easy', thumbnail_url: 'https://p16.tiktokcdn.com/a.jpeg', author_name: 'chef' })).toEqual({
      caption: 'Garlic noodles #easy', image: 'https://p16.tiktokcdn.com/a.jpeg', author: 'chef',
    });
  });
  it('rejects empty or malformed responses', () => {
    expect(parseTikTokOembed({ title: '' })).toBeNull();
    expect(parseTikTokOembed(null)).toBeNull();
  });
});

describe('parseInstagramHtml', () => {
  const html = `<meta property="og:title" content="chef on Instagram: &quot;Chilli oil eggs&#10;Ingredients&#10;2 eggs&quot;"><meta property="og:image" content="https://cdn.example/a.jpg?x=1&amp;y=2">`;
  it('reads the caption and decodes entities', () => {
    const post = parseInstagramHtml(html);
    expect(post?.caption).toBe('Chilli oil eggs\nIngredients\n2 eggs');
    expect(post?.image).toBe('https://cdn.example/a.jpg?x=1&y=2');
    expect(post?.author).toBe('chef');
  });
  it('falls back to og:description', () => {
    const d = `<meta property="og:description" content="1,234 likes, 56 comments - chef on March 3, 2024: &quot;Quick laksa&quot;.">`;
    expect(parseInstagramHtml(d)?.caption).toBe('Quick laksa');
  });
  it('returns null on a login wall', () => expect(parseInstagramHtml('<title>Login</title>')).toBeNull());
});

describe('captionToDraft', () => {
  it('parses a caption that contains a recipe and keeps hashtags as tags', () => {
    const { draft, warning } = captionToDraft({ caption: 'Garlic noodles\nIngredients\n200 g noodles\n3 cloves garlic\nMethod\nBoil the noodles.\nFry the garlic.\n#easy #Noodles', image: null, author: null }, 'https://www.tiktok.com/@a/video/1');
    expect(warning).toBeUndefined();
    expect(draft.title).toBe('Garlic noodles');
    expect(draft.ingredients).toHaveLength(2);
    expect(draft.tags).toEqual(['easy', 'noodles']);
    expect(draft.sourceUrl).toBe('https://www.tiktok.com/@a/video/1');
  });
  it('keeps the caption as notes and warns when there is no recipe in it', () => {
    const { draft, warning } = captionToDraft({ caption: 'Best chicken rice 🍗🔥 recipe in the video! #foodtok', image: 'https://x/y.jpg', author: 'chef' }, 'https://www.instagram.com/reel/a/');
    expect(warning).toMatch(/spoken in the video/);
    expect(draft.title).toBe('Best chicken rice recipe in the video');
    expect(draft.notes).toContain('Video by chef');
    expect(draft.imageUrls).toEqual(['https://x/y.jpg']);
  });
});

describe('decodeEntities', () => {
  it('handles named, decimal and hex, and ignores invalid code points', () => {
    expect(decodeEntities('a &amp; b &#39;c&#39; &#x1F35C; &#99999999;')).toBe("a & b 'c' 🍜 ");
  });
});
