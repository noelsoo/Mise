import { describe, it, expect } from 'vitest';
import { assertSafeUrl, isPrivateAddress } from './fetch-page';

describe('assertSafeUrl', () => {
  it('accepts public http(s) URLs', () => {
    expect(assertSafeUrl('https://example.com/a').hostname).toBe('example.com');
    expect(assertSafeUrl('http://8.8.8.8/').hostname).toBe('8.8.8.8');
  });
  it.each([
    'ftp://example.com',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'not a url',
    'https://user:pw@example.com',
    'http://localhost:3000',
    'http://foo.localhost',
    'http://printer.local',
    'http://db.internal',
    'http://127.0.0.1',
    'http://10.0.0.5',
    'http://192.168.1.1',
    'http://172.16.0.1',
    'http://169.254.169.254/latest/meta-data',
    'http://100.64.0.1',
    'http://0.0.0.0',
    'http://[::1]/',
    'http://[fc00::1]/',
    'http://[fd12:3456::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://2130706433/',
  ])('rejects %s', (u) => {
    expect(() => assertSafeUrl(u)).toThrow();
  });
});

describe('isPrivateAddress', () => {
  it('flags private ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.31.255.255', '192.168.0.1', '169.254.1.1', '100.100.0.1', '::1', '::', 'fc00::1', 'fe80::abcd', '::ffff:10.0.0.1', '::ffff:7f00:1', 'garbage']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it('allows public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
