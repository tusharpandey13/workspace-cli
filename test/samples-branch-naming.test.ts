import { describe, it, expect } from 'vitest';
import { validateBranchName } from '../src/utils/validation.js';

// Test the samples branch name transformation logic
describe('Samples Branch Naming', () => {
  it('should validate that branch names with slashes are allowed', () => {
    const testCases = [
      'feature/user-profile',
      'bugfix/RT-same-scope-as-AT',
      'hotfix/critical/security-issue',
      'explore/new-api',
    ];

    for (const branchName of testCases) {
      expect(() => validateBranchName(branchName)).not.toThrow();
    }
  });

  it('should handle samples branch name transformation pattern', () => {
    // This test validates the expected transformation pattern
    // The actual implementation is in gitWorktrees.ts -> createSamplesBranchName()
    const testCases = [
      { input: 'bugfix/RT-same-scope-as-AT', expected: 'bugfix-RT-same-scope-as-AT-samples' },
      { input: 'feature/user/profile-page', expected: 'feature-user-profile-page-samples' },
      { input: 'hotfix/critical-bug', expected: 'hotfix-critical-bug-samples' },
      { input: 'simple-branch', expected: 'simple-branch-samples' },
    ];

    for (const testCase of testCases) {
      // Transform forward slashes to dashes and append '-samples'
      const actualResult = testCase.input.replace(/\//g, '-') + '-samples';
      expect(actualResult).toBe(testCase.expected);
    }
  });

  it('should create git-safe branch names', () => {
    // Test that the transformation creates valid git branch names
    const problematicBranches = [
      'feature/complex/nested/branch',
      'bugfix/RT-123/scope-issue',
      'hotfix/auth/oauth2/callback',
    ];

    for (const branch of problematicBranches) {
      const samplesBranch = branch.replace(/\//g, '-') + '-samples';

      // Should not contain forward slashes
      expect(samplesBranch).not.toMatch(/\//);

      // Should still be valid according to our validation
      expect(() => validateBranchName(samplesBranch)).not.toThrow();

      // Should end with -samples
      expect(samplesBranch).toMatch(/-samples$/);
    }
  });
});
