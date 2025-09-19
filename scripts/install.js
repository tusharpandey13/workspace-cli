#!/usr/bin/env node

/**
 * Installation script for workspace-cli
 * This script ensures proper permissions and installation across different environments
 */

import { spawn } from 'child_process';
import { access, chmod, constants } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

/**
 * Run a command and return a promise
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Check if a file exists and is executable
 */
async function checkExecutable(filePath) {
  try {
    await access(filePath, constants.F_OK);
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make file executable
 */
async function makeExecutable(filePath) {
  try {
    await chmod(filePath, 0o755);
    console.log(`✅ Made ${filePath} executable`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to make ${filePath} executable:`, error.message);
    return false;
  }
}

/**
 * Test if the CLI works locally
 */
async function testLocal() {
  const cliPath = join(projectRoot, 'dist', 'bin', 'workspace.js');

  console.log('🧪 Testing local installation...');

  // Check if file exists and is executable
  const isExecutable = await checkExecutable(cliPath);
  if (!isExecutable) {
    console.log('🔧 Making CLI executable...');
    const success = await makeExecutable(cliPath);
    if (!success) {
      throw new Error('Failed to make CLI executable');
    }
  }

  // Test running the CLI locally
  try {
    await runCommand('node', [cliPath, '--version']);
    console.log('✅ Local CLI test passed');
  } catch (error) {
    throw new Error(`Local CLI test failed: ${error.message}`);
  }
}

/**
 * Test if the CLI works globally
 */
async function testGlobal() {
  console.log('🧪 Testing global installation...');

  try {
    await runCommand('workspace', ['--version']);
    console.log('✅ Global CLI test passed');
  } catch (error) {
    // Try alternative node path resolution
    try {
      await runCommand('npx', ['workspace', '--version']);
      console.log('✅ Global CLI test passed (via npx)');
    } catch (altError) {
      throw new Error(`Global CLI test failed: ${error.message}`);
    }
  }
}

/**
 * Clean up any existing installations
 */
async function cleanup() {
  console.log('🧹 Cleaning up existing installations...');

  try {
    await runCommand('npm', ['unlink', '-g', 'workspace-cli']);
  } catch {
    // Ignore errors - package might not be linked
  }

  try {
    await runCommand('npm', ['uninstall', '-g', 'workspace-cli']);
  } catch {
    // Ignore errors - package might not be installed
  }
}

/**
 * Main installation process
 */
async function install() {
  console.log('🚀 Starting workspace-cli installation...');

  try {
    // Step 1: Clean up
    await cleanup();

    // Step 2: Install dependencies
    console.log('📦 Installing dependencies...');
    await runCommand('npm', ['install']);

    // Step 3: Build project
    console.log('🔨 Building project...');
    await runCommand('npm', ['run', 'build']);

    // Step 4: Test local installation
    await testLocal();

    // Step 5: Link globally
    console.log('🔗 Linking globally...');
    await runCommand('npm', ['link']);

    // Step 6: Test global installation
    await testGlobal();

    console.log('\n🎉 Installation completed successfully!');
    console.log('🧪 Try running: workspace --help');
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure you have Node.js v18+ installed');
    console.error('2. Try running with sudo if you get permission errors');
    console.error('3. Check that npm global directory is writable');
    console.error('4. Consider using nvm to manage Node.js versions');
    process.exit(1);
  }
}

// Run installation if this script is executed directly
if (process.argv[1] === __filename) {
  install();
}

export { install, testLocal, testGlobal };
