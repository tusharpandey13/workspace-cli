import { describe, it, expect, beforeEach } from 'vitest';
import { ContextDataFetcher } from '../src/services/contextData.js';

describe('URL Security Filtering', () => {
  let contextDataFetcher: ContextDataFetcher;

  beforeEach(() => {
    contextDataFetcher = new ContextDataFetcher();
  });

  describe('extractUrlsFromText', () => {
    it('should allow trusted domains', () => {
      const text = `
        Check out this GitHub repo: https://github.com/auth0/nextjs-auth0
        Documentation: https://docs.auth0.com/libraries/nextjs
        Stack Overflow: https://stackoverflow.com/questions/123456/help
        NPM package: https://npmjs.com/package/nextjs-auth0
        Python docs: https://docs.python.org/3/library/
      `;

      const urls = contextDataFetcher.extractUrlsFromText(text);

      expect(urls).toEqual([
        'https://github.com/auth0/nextjs-auth0',
        'https://docs.auth0.com/libraries/nextjs',
        'https://stackoverflow.com/questions/123456/help',
        'https://npmjs.com/package/nextjs-auth0',
        'https://docs.python.org/3/library/',
      ]);
    });

    it('should block untrusted domains that match dangerous patterns', () => {
      const text = `
        Malicious API: https://myapi.com/steal-data
        Fake docs: https://docs.malicious.com/hack
        Evil developer site: https://developer.evil.com/exploit
        Dangerous API: https://api.attacker.com/ssrf
        Internal network: https://10.0.0.1:8080/admin
        Bad domain: https://auth0.evil.com/phishing
      `;

      const urls = contextDataFetcher.extractUrlsFromText(text);

      // Should return empty array since none are trusted
      expect(urls).toEqual([]);
    });

    it('should handle mixed trusted and untrusted URLs', () => {
      const text = `
        Good: https://github.com/auth0/auth0-react
        Bad: https://myapi.com/evil
        Good: https://docs.auth0.com/quickstart
        Bad: https://api.malicious.com/steal
        Good: https://stackoverflow.com/questions/12345
      `;

      const urls = contextDataFetcher.extractUrlsFromText(text);

      expect(urls).toEqual([
        'https://github.com/auth0/auth0-react',
        'https://docs.auth0.com/quickstart',
        'https://stackoverflow.com/questions/12345',
      ]);
    });

    it('should handle malformed URLs gracefully', () => {
      const text = `
        Good URL: https://github.com/auth0/auth0-react
        Malformed: https://[invalid-url
        Another good: https://docs.auth0.com/test
        Bad protocol: ftp://github.com/test
      `;

      const urls = contextDataFetcher.extractUrlsFromText(text);

      expect(urls).toEqual(['https://github.com/auth0/auth0-react', 'https://docs.auth0.com/test']);
    });

    it('should reject the specific problematic domain from the user report', () => {
      const text = 'Check this API: https://myapi.com/endpoint';
      const urls = contextDataFetcher.extractUrlsFromText(text);

      expect(urls).toEqual([]);
    });

    it('should handle subdomain variations correctly', () => {
      const text = `
        Trusted subdomain: https://raw.githubusercontent.com/auth0/auth0-react/main/README.md
        Untrusted subdomain: https://evil.github.com/malicious
        Another trusted: https://www.npmjs.com/package/auth0
      `;

      const urls = contextDataFetcher.extractUrlsFromText(text);

      expect(urls).toEqual([
        'https://raw.githubusercontent.com/auth0/auth0-react/main/README.md',
        'https://www.npmjs.com/package/auth0',
      ]);
    });
  });

  describe('SSRF protection scenarios', () => {
    it('should block common SSRF attack patterns', () => {
      const ssrfUrls = [
        'https://127.0.0.1:8080/admin',
        'https://localhost:3000/internal',
        'https://10.0.0.1/private',
        'https://192.168.1.1/router',
        'https://169.254.169.254/metadata', // AWS metadata
        'https://metadata.google.internal/computeMetadata', // GCP metadata
      ];

      for (const url of ssrfUrls) {
        const urls = contextDataFetcher.extractUrlsFromText(url);
        expect(urls).toEqual([]);
      }
    });

    it('should block URLs that could bypass with similar domain names', () => {
      const maliciousDomains = [
        'https://github.com.evil.com/fake',
        'https://auth0.com.malicious.org/phishing',
        'https://npmjs.com.attacker.net/trojan',
        'https://stackoverflow.com.fake.site/bad',
      ];

      for (const url of maliciousDomains) {
        const urls = contextDataFetcher.extractUrlsFromText(url);
        expect(urls).toEqual([]);
      }
    });
  });
});
