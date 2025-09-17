import { describe, it, expect } from 'vitest';
import {
  validateBranchName,
  validateGitHubIds,
  validateWorkspaceName,
} from '../src/utils/validation.js';

describe('validation utilities', () => {
  describe('validateBranchName', () => {
    it('should accept valid branch names', () => {
      expect(validateBranchName('feature/auth-fix')).toBe('feature/auth-fix');
      expect(validateBranchName('bugfix-123')).toBe('bugfix-123');
      expect(validateBranchName('main')).toBe('main');
    });

    it('should sanitize dangerous characters', () => {
      expect(validateBranchName('feature/auth-fix;rm -rf /')).toBe('feature/auth-fix');
      expect(validateBranchName('test<script>')).toBe('testscript');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => validateBranchName('')).toThrow('Branch name is required');
      expect(() => validateBranchName(null as any)).toThrow('Branch name is required');
      expect(() => validateBranchName('--invalid')).toThrow('invalid patterns');
      expect(() => validateBranchName('test/../escape')).toThrow('invalid patterns');
    });

    it('should limit branch name length', () => {
      const longName = 'a'.repeat(150);
      const result = validateBranchName(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('validateGitHubIds', () => {
    it('should accept valid GitHub IDs', () => {
      expect(validateGitHubIds(['123', '456'])).toEqual([123, 456]);
      expect(validateGitHubIds(['1'])).toEqual([1]);
    });

    it('should throw error for invalid IDs', () => {
      expect(() => validateGitHubIds(['abc'])).toThrow('Invalid GitHub ID');
      expect(() => validateGitHubIds(['0'])).toThrow('Invalid GitHub ID');
      expect(() => validateGitHubIds(['-1'])).toThrow('Invalid GitHub ID');
      expect(() => validateGitHubIds(['9999999'])).toThrow('Invalid GitHub ID');
    });

    it('should require array input', () => {
      expect(() => validateGitHubIds('123' as any)).toThrow('must be an array');
    });
  });

  describe('validateWorkspaceName', () => {
    it('should accept valid workspace names', () => {
      expect(validateWorkspaceName('my-workspace')).toBe('my-workspace');
      expect(validateWorkspaceName('test_123')).toBe('test_123');
    });

    it('should sanitize workspace names', () => {
      expect(validateWorkspaceName('my workspace!')).toBe('myworkspace');
      expect(validateWorkspaceName('test@#$%')).toBe('test');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => validateWorkspaceName('')).toThrow('Workspace name is required');
      expect(() => validateWorkspaceName('!@#$%')).toThrow('no valid characters');
    });

    it('should limit workspace name length', () => {
      const longName = 'a'.repeat(100);
      const result = validateWorkspaceName(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });
});
