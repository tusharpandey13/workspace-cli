import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const CLI_PATH = path.resolve(__dirname, '../dist/bin/workspace.js');

describe('CLI Help Tests', () => {
  it('should display main help with --help', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf8' });

    expect(output).toContain('Stack-agnostic workspace CLI tool');
    expect(output).toContain('Global Options:');
    expect(output).toContain('Examples:');
    expect(output).toContain('Getting Started:');
    expect(output).toContain('workspace init');
    expect(output).toContain('workspace list');
    expect(output).toContain('workspace projects');
  });

  it('should display init command help with -h', () => {
    const output = execSync(`node ${CLI_PATH} init -h`, { encoding: 'utf8' });

    expect(output).toContain('Initialize a new workspace with git worktrees');
    expect(output).toContain('Examples:');
    expect(output).toContain('Description:');
    expect(output).toContain('Related commands:');
    expect(output).toContain('workspace init next feature/my-new-feature');
  });

  it('should display list command help', () => {
    const output = execSync(`node ${CLI_PATH} list --help`, { encoding: 'utf8' });

    expect(output).toContain('List all active workspaces');
    expect(output).toContain('Examples:');
    expect(output).toContain('workspace list next');
    expect(output).toContain('Related commands:');
  });

  it('should display projects command help', () => {
    const output = execSync(`node ${CLI_PATH} projects --help`, { encoding: 'utf8' });

    expect(output).toContain('List all available projects');
    expect(output).toContain('Examples:');
    expect(output).toContain('Description:');
    expect(output).toContain('Project keys are used');
  });

  it('should display info command help', () => {
    const output = execSync(`node ${CLI_PATH} info --help`, { encoding: 'utf8' });

    expect(output).toContain('Display detailed workspace status');
    expect(output).toContain('Examples:');
    expect(output).toContain('✅ Ready - Component is properly set up');
    expect(output).toContain('workspace info next feature_my-new-feature');
  });

  it('should display clean command help', () => {
    const output = execSync(`node ${CLI_PATH} clean --help`, { encoding: 'utf8' });

    expect(output).toContain('Clean up and remove workspace');
    expect(output).toContain('⚠️  WARNING: This action is irreversible!');
    expect(output).toContain('Examples:');
    expect(output).toContain('Related commands:');
  });

  it('should display submit command help', () => {
    const output = execSync(`node ${CLI_PATH} submit --help`, { encoding: 'utf8' });

    expect(output).toContain(
      '**HUMAN-SUPERVISED**: Review, commit, push changes, and create a pull request',
    );
    expect(output).toContain('Examples:');
    expect(output).toContain('Requirements:');
    expect(output).toContain('GitHub CLI (gh) must be installed');
  });
});
