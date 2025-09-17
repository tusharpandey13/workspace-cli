import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileOps } from '../src/utils/init-helpers.js';
import path from 'path';
import fs from 'fs-extra';

describe('End-to-End CONTEXT.md Generation', () => {
  const testWorkspaceDir = '/tmp/vitest-e2e-context-test';

  beforeEach(async () => {
    // Clean up any existing test directory
    await fs.remove(testWorkspaceDir);
    await fs.ensureDir(testWorkspaceDir);
  });

  afterEach(async () => {
    // Clean up after test
    await fs.remove(testWorkspaceDir);
  });

  it('should create CONTEXT.md file with GitHub data', async () => {
    const contextPath = path.join(testWorkspaceDir, 'CONTEXT.md');

    const contextContent = `# GitHub Context Data

## Issue #123: Test Issue

**Status:** open  
**URL:** https://github.com/example/repo/issues/123  
**Created:** 2024-01-01T00:00:00Z  
**Updated:** 2024-01-01T00:00:00Z  
**Author:** testuser

### Description

This is a test issue body

### External Context

No additional external URLs provided.

### Comments

No comments available.

### Linked Issues

No linked issues found.`;

    // Simulate writing CONTEXT.md
    await fileOps.writeFile(contextPath, contextContent, 'Test CONTEXT.md', false);

    // Verify the file exists and has expected content
    expect(await fs.pathExists(contextPath)).toBe(true);

    const fileContent = await fs.readFile(contextPath, 'utf-8');
    expect(fileContent).toContain('# GitHub Context Data');
    expect(fileContent).toContain('Issue #123: Test Issue');
    expect(fileContent).toContain('Status:** open');
    expect(fileContent).toContain('testuser');
  });

  it('should handle multiple GitHub issues in CONTEXT.md', async () => {
    const contextPath = path.join(testWorkspaceDir, 'CONTEXT.md');

    const contextContent = `# GitHub Context Data

## Issue #123: First Issue
**Status:** open

## Issue #124: Second Issue  
**Status:** closed

### External Context
No additional external URLs provided.`;

    await fileOps.writeFile(contextPath, contextContent, 'Multi-issue CONTEXT.md', false);

    expect(await fs.pathExists(contextPath)).toBe(true);

    const fileContent = await fs.readFile(contextPath, 'utf-8');
    expect(fileContent).toContain('Issue #123: First Issue');
    expect(fileContent).toContain('Issue #124: Second Issue');
  });
});
