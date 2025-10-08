import { describe, it, expect } from 'vitest';
import { ContextDataFetcher } from '../src/services/contextData.js';

describe('PR #2344 Security Fix Verification', () => {
  it('should block the problematic myapi.com URL that caused the original error', () => {
    const contextDataFetcher = new ContextDataFetcher();

    // Simulate the problematic URL from PR #2344
    const prText = `
      API Integration Example:
      You can test our API at https://myapi.com/v1/users
      For more information, see our docs at https://api.example.org/documentation
    `;

    const extractedUrls = contextDataFetcher.extractUrlsFromText(prText);

    // Both URLs should be blocked as they are not in the trusted domains list
    expect(extractedUrls).toEqual([]);
  });

  it('should show the old vulnerable behavior would have allowed these URLs', () => {
    const contextDataFetcher = new ContextDataFetcher();

    // URLs that would have passed the old dangerous pattern matching
    const vulnerableUrls = [
      'https://myapi.com/steal-data', // matched 'api.'
      'https://docs.malicious.com/hack', // matched 'docs.'
      'https://developer.evil.com/exploit', // matched 'developer.'
      'https://api.attacker.com/ssrf', // matched 'api.'
    ];

    for (const url of vulnerableUrls) {
      const extractedUrls = contextDataFetcher.extractUrlsFromText(url);
      expect(extractedUrls).toEqual([]);
    }
  });
});
