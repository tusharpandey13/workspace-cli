import { describe, it, expect } from 'vitest';
import { validateProjectKey } from '../src/utils/validation.js';

describe('Project validation', () => {
  describe('validateProjectKey', () => {
    it('should accept valid project keys', () => {
      expect(validateProjectKey('next')).toBe('next');
      expect(validateProjectKey('node-auth')).toBe('node-auth');
      expect(validateProjectKey('react_sdk')).toBe('react_sdk');
      expect(validateProjectKey('test123')).toBe('test123');
    });

    it('should reject invalid project keys', () => {
      expect(() => validateProjectKey('')).toThrow('Project key is required');
      expect(() => validateProjectKey(null as any)).toThrow('Project key is required');
      expect(() => validateProjectKey('test space')).toThrow('invalid characters');
      expect(() => validateProjectKey('test@special')).toThrow('invalid characters');
      expect(() => validateProjectKey('test.dot')).toThrow('invalid characters');
    });

    it('should limit project key length', () => {
      const longKey = 'a'.repeat(100);
      expect(() => validateProjectKey(longKey)).toThrow('invalid characters');
    });

    it('should preserve exact valid input', () => {
      const validKey = 'my-project_123';
      expect(validateProjectKey(validKey)).toBe(validKey);
    });
  });
});
