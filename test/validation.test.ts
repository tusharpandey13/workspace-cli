import { describe, it, expect } from 'vitest';
import {
  validateBranchName,
  validateGitHubIds,
  validateWorkspaceName,
  validateGitUrl,
  sanitizeShellArg,
  validateCommand,
} from '../src/utils/validation';

describe('validation utilities', () => {
  describe('validateBranchName', () => {
    it('should accept valid branch names', () => {
      expect(validateBranchName('feature/auth-fix')).toBe('feature/auth-fix');
      expect(validateBranchName('bugfix-123')).toBe('bugfix-123');
      expect(validateBranchName('main')).toBe('main');
    });

    it('should reject dangerous characters for security', () => {
      expect(() => validateBranchName('feature/auth-fix;rm -rf /')).toThrow(
        'unsafe characters or patterns',
      );
      expect(() => validateBranchName('test<script>')).toThrow('unsafe characters or patterns');
      expect(() => validateBranchName('branch|command')).toThrow('unsafe characters or patterns');
      expect(() => validateBranchName('branch&command')).toThrow('unsafe characters or patterns');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => validateBranchName('')).toThrow('Branch name is required');
      expect(() => validateBranchName(null as any)).toThrow('Branch name is required');
      expect(() => validateBranchName('--invalid')).toThrow('unsafe characters or patterns');
      expect(() => validateBranchName('test/../escape')).toThrow('unsafe characters or patterns');
    });

    it('should limit branch name length', () => {
      const longName = 'a'.repeat(150);
      expect(() => validateBranchName(longName)).toThrow('Branch name too long');
    });
  });

  describe('validateGitHubIds', () => {
    it('should accept valid GitHub IDs', () => {
      expect(validateGitHubIds(['123', '456'])).toEqual([123, 456]);
      expect(validateGitHubIds([])).toEqual([]);
    });

    it('should throw error for invalid IDs', () => {
      expect(() => validateGitHubIds(['abc'])).toThrow('Invalid GitHub ID');
      expect(() => validateGitHubIds(['123', 'invalid'])).toThrow('Invalid GitHub ID');
    });

    it('should require array input', () => {
      expect(() => validateGitHubIds(null as any)).toThrow('GitHub IDs must be an array');
      expect(() => validateGitHubIds('123' as any)).toThrow('GitHub IDs must be an array');
    });
  });

  describe('validateWorkspaceName', () => {
    it('should accept valid workspace names', () => {
      expect(validateWorkspaceName('my-workspace')).toBe('my-workspace');
      expect(validateWorkspaceName('project_123')).toBe('project_123');
    });

    it('should sanitize workspace names', () => {
      expect(validateWorkspaceName('workspace with spaces')).toBe('workspace-with-spaces');
      expect(validateWorkspaceName('UPPERCASE')).toBe('uppercase');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => validateWorkspaceName('')).toThrow('Workspace name is required');
      expect(() => validateWorkspaceName(null as any)).toThrow('Workspace name is required');
    });

    it('should limit workspace name length', () => {
      const longName = 'a'.repeat(200);
      const result = validateWorkspaceName(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('validateGitUrl', () => {
    it('should accept valid Git URLs', () => {
      expect(validateGitUrl('https://github.com/user/repo.git')).toBe(
        'https://github.com/user/repo.git',
      );
      expect(validateGitUrl('https://gitlab.com/user/repo.git')).toBe(
        'https://gitlab.com/user/repo.git',
      );
    });

    it('should reject invalid protocols', () => {
      expect(() => validateGitUrl('ftp://example.com/repo.git')).toThrow('Unsupported protocol');
      expect(() => validateGitUrl('file:///local/repo')).toThrow('Unsupported protocol');
    });

    it('should reject unauthorized hosts', () => {
      expect(() => validateGitUrl('https://evil.com/malicious.git')).toThrow(
        'Unsupported Git host',
      );
    });

    it('should reject dangerous URL patterns', () => {
      expect(() => validateGitUrl('https://github.com/user/repo/../../../etc/passwd')).toThrow(
        'dangerous path patterns',
      );
    });
  });

  describe('sanitizeShellArg', () => {
    it('should sanitize dangerous shell characters', () => {
      expect(sanitizeShellArg('normal-text')).toBe('normal-text');
      expect(sanitizeShellArg('file.txt')).toBe('file.txt');
    });

    it('should throw error for dangerous arguments', () => {
      expect(() => sanitizeShellArg('command;rm -rf /')).toThrow(
        'Shell argument becomes empty after sanitization',
      );
      expect(() => sanitizeShellArg('command&evil')).toThrow(
        'Shell argument becomes empty after sanitization',
      );
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeShellArg(null as any)).toThrow('Shell argument must be a string');
      expect(() => sanitizeShellArg(123 as any)).toThrow('Shell argument must be a string');
    });
  });

  describe('validateCommand', () => {
    it('should accept allowed commands', () => {
      expect(() => validateCommand('git')).not.toThrow();
      expect(() => validateCommand('gh')).not.toThrow();
      expect(() => validateCommand('node')).not.toThrow();
    });

    it('should reject unauthorized commands', () => {
      expect(() => validateCommand('rm')).toThrow('Unauthorized command');
      expect(() => validateCommand('curl')).toThrow('Unauthorized command');
      expect(() => validateCommand('wget')).toThrow('Unauthorized command');
    });

    it('should validate command input', () => {
      expect(() => validateCommand('')).toThrow('Command must be a non-empty string');
      expect(() => validateCommand(null as any)).toThrow('Command must be a non-empty string');
    });
  });
});
