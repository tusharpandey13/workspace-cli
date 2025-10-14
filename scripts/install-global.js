#!/usr/bin/env node

/**
 * Smart global installation script for workspace-cli
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
 * Run a command and return a promise
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
      shell: true,
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
 * Detect available package manager and return config
 */
async function detectPackageManager() {
  console.log('🔍 Detecting available package manager...');

  const hasPnpm = await isCommandAvailable('pnpm');
  const hasNpm = await isCommandAvailable('npm');

  if (hasPnpm) {
    console.log('✅ Using pnpm (preferred)');
    return {
      manager: 'pnpm',
      buildCmd: ['pnpm', 'run', 'build'],
      linkCmd: ['pnpm', 'link', '--global'],
      testCmd: ['pnpm', 'run', 'test:install'],
    };
  } else if (hasNpm) {
    console.log('✅ Using npm (fallback)');
    return {
      manager: 'npm',
      buildCmd: ['npm', 'run', 'build'],
      linkCmd: ['npm', 'link'],
      testCmd: ['npm', 'run', 'test:install'],
    };
  } else {
    throw new Error('❌ Neither pnpm nor npm found. Please install Node.js and npm.');
  }
}

/**
 * Test if the globally installed CLI works
 */
async function testGlobalInstallation() {
  console.log('🧪 Testing global installation...');

  try {
    // Test direct command
    await runCommand('space', ['--version']);
    console.log('✅ Global CLI test passed');
    return true;
  } catch (error) {
    console.warn('⚠️ Direct command failed, trying alternative paths...');

    try {
      // Try with npx
      await runCommand('npx', ['space', '--version']);
      console.log('✅ Global CLI test passed (via npx)');
      return true;
    } catch (altError) {
      console.error('❌ Global CLI test failed');
      throw new Error(`Global installation test failed: ${error.message}`);
    }
  }
}

/**
 * Verify that globally installed version matches package.json version
 */
async function verifyVersionConsistency() {
  console.log('🔍 Verifying version consistency...');

  try {
    // Get version from package.json
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const { readFile } = await import('fs/promises');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    const expectedVersion = packageJson.version;

    // Get version from globally installed CLI
    const { spawn } = await import('child_process');
    const globalVersion = await new Promise((resolve, reject) => {
      const child = spawn('space', ['--version'], { stdio: 'pipe' });
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Failed to get global version, exit code: ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });

    if (globalVersion === expectedVersion) {
      console.log(`✅ Version consistency verified: ${expectedVersion}`);
      return true;
    } else {
      throw new Error(
        `❌ Version mismatch! Package.json: ${expectedVersion}, Global: ${globalVersion}`,
      );
    }
  } catch (error) {
    console.error('❌ Version verification failed:', error.message);
    console.error('💡 This indicates a stale global installation that could cause issues.');
    throw error;
  }
}

/**
 * Main installation process
 */
async function installGlobal() {
  console.log('🚀 Starting global installation...');

  try {
    // Step 1: Detect package manager
    const pm = await detectPackageManager();

    // Step 2: Clean and build project
    console.log('🔨 Building project...');
    await runCommand(pm.buildCmd[0], pm.buildCmd.slice(1));

    // Step 3: Link globally
    console.log('🔗 Linking globally...');
    await runCommand(pm.linkCmd[0], pm.linkCmd.slice(1));

    // Step 4: Test installation
    if (process.env.SKIP_INSTALL_TEST !== 'true') {
      await testGlobalInstallation();

      // Step 5: Verify version consistency
      await verifyVersionConsistency();
    }

    console.log('\n🎉 Global installation completed successfully!');
    console.log('✨ Try running: space --help');
    console.log(`📦 Installed using: ${pm.manager}`);
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure you have Node.js v18+ installed');
    console.error('2. Try running with sudo if you get permission errors');
    console.error('3. Check that your package manager global directory is writable');
    console.error('4. For npm: npm config get prefix should point to a writable location');
    console.error('5. For pnpm: pnpm config get global-bin-dir should be in your PATH');
    console.error('6. If version mismatch: clean build and retry installation');
    process.exit(1);
  }
}

// Run installation if this script is executed directly
if (
  process.argv[1] === __filename ||
  (process.argv[1] && process.argv[1].endsWith('install-global.js'))
) {
  installGlobal();
}

export { installGlobal, detectPackageManager };
