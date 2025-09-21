import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const CLI_PATH = path.resolve(__dirname, '../dist/bin/workspace.js');

describe('CLI Help Tests', () => {
  it('should display main help with --help', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf8' });

    expect(output).toContain('Stack-agnostic space CLI tool');
    expect(output).toContain('Global Options:');
    expect(output).toContain('Examples:');
    expect(output).toContain('Getting Started:');
    expect(output).toContain('space init');
    expect(output).toContain('space list');
    expect(output).toContain('space projects');
  });

  it('should display init command help with -h', () => {
    const output = execSync(`node ${CLI_PATH} init -h`, { encoding: 'utf8' });

    expect(output).toContain('Initialize a new space with git worktrees');
    expect(output).toContain('Examples:');
    expect(output).toContain('Description:');
    expect(output).toContain('Related commands:');
    expect(output).toContain('space init next feature/my-new-feature');
  });

  it('should display list command help', () => {
    const output = execSync(`node ${CLI_PATH} list --help`, { encoding: 'utf8' });

    expect(output).toContain('List all active spaces');
    expect(output).toContain('Examples:');
    expect(output).toContain('space list next');
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

    expect(output).toContain('Display detailed space status');
    expect(output).toContain('Examples:');
    expect(output).toContain('OK: Ready - Component is properly set up');
    expect(output).toContain('space info next feature_my-new-feature');
  });

  it('should display clean command help', () => {
    const output = execSync(`node ${CLI_PATH} clean --help`, { encoding: 'utf8' });

    expect(output).toContain('Clean up and remove space');
    expect(output).toContain('WARNING: This action is irreversible!');
    expect(output).toContain('Examples:');
    expect(output).toContain('Related commands:');
  });
});
