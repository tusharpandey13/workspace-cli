#!/usr/bin/env node

/**
 * Smart global uninstallation script for workspace-cli
 * Detects available package manager (pnpm → npm) and uses appropriate commands
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

/**
 * Check if a command is available in PATH
 */
function isCommandAvailable(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'], {
      stdio: 'ignore',
      shell: true,
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Run a command and return a promise (non-failing)
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    console.log(`🔧 Running: ${command} ${Array.isArray(args) ? args.join(' ') : args}`);

    const child = spawn(command, Array.isArray(args) ? args : [args], {
      stdio: 'inherit',
      cwd: projectRoot,
      shell: true,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Command completed successfully');
      } else {
        console.log('⚠️ Command completed with non-zero exit (this may be expected)');
      }
      resolve();
    });

    child.on('error', (err) => {
      console.log('⚠️ Command failed (this may be expected):', err.message);
      resolve();
    });
  });
}

/**
 * Detect available package manager and return uninstall commands
 */
async function detectPackageManager() {
  console.log('🔍 Detecting available package manager...');

  const hasPnpm = await isCommandAvailable('pnpm');
  const hasNpm = await isCommandAvailable('npm');

  const commands = [];

  if (hasPnpm) {
    console.log('✅ Found pnpm - will attempt pnpm uninstall');
    commands.push({
      manager: 'pnpm',
      removeCmd: ['pnpm', 'remove', '-g', '@tusharpandey13/space-cli'],
      unlinkCmd: ['pnpm', 'unlink', '--global', '@tusharpandey13/space-cli'],
    });
  }

  if (hasNpm) {
    console.log('✅ Found npm - will attempt npm uninstall');
    commands.push({
      manager: 'npm',
      removeCmd: ['npm', 'uninstall', '-g', '@tusharpandey13/space-cli'],
      unlinkCmd: ['npm', 'unlink', '-g', '@tusharpandey13/space-cli'],
    });
  }

  if (commands.length === 0) {
    console.log('⚠️ No package managers found, but continuing...');
  }

  return commands;
}

/**
 * Test if the CLI is still globally available
 */
async function testUninstallation() {
  console.log('🧪 Verifying uninstallation...');

  return new Promise((resolve) => {
    const child = spawn('space', ['--version'], {
      stdio: 'ignore',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('⚠️ CLI is still globally available - uninstall may not be complete');
        resolve(false);
      } else {
        console.log('✅ CLI is no longer globally available');
        resolve(true);
      }
    });

    child.on('error', () => {
      console.log('✅ CLI is no longer globally available');
      resolve(true);
    });
  });
}

/**
 * Main uninstallation process
 */
async function uninstallGlobal() {
  console.log('🗑️  Starting global uninstallation...');

  try {
    // Step 1: Detect package managers and get uninstall commands
    const pmCommands = await detectPackageManager();

    // Step 2: Try all available uninstall methods
    for (const pm of pmCommands) {
      console.log(`\n🔄 Trying ${pm.manager} uninstall methods...`);

      // Try remove command
      await runCommand(pm.removeCmd[0], pm.removeCmd.slice(1));

      // Try unlink command
      await runCommand(pm.unlinkCmd[0], pm.unlinkCmd.slice(1));
    }

    // Step 3: Also try generic commands that might work
    console.log('\n🔄 Trying additional cleanup methods...');
    await runCommand('npm', ['uninstall', '-g', 'workspace-cli']);
    await runCommand('npm', ['unlink', '-g', 'workspace-cli']);

    // Step 4: Test uninstallation
    if (process.env.SKIP_UNINSTALL_TEST !== 'true') {
      const success = await testUninstallation();
      if (!success) {
        console.log('\n⚠️ The CLI may still be available globally.');
        console.log('💡 This could be due to:');
        console.log('   - Multiple installation methods were used');
        console.log('   - Different package manager was used originally');
        console.log('   - Manual installation outside package managers');
      }
    }

    console.log('\n✅ Uninstallation process completed!');
    console.log(
      '🧹 If the CLI is still available, you may need to manually remove it from your PATH',
    );
  } catch (error) {
    // Don't fail the uninstall process - just warn
    console.warn('\n⚠️ Uninstallation encountered issues:', error.message);
    console.log('✅ This is often normal - the package may not have been installed globally');
  }
}

// Run uninstallation if this script is executed directly
if (
  process.argv[1] === __filename ||
  (process.argv[1] && process.argv[1].endsWith('uninstall-global.js'))
) {
  uninstallGlobal();
}

export { uninstallGlobal, detectPackageManager };
