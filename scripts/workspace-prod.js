#!/usr/bin/env node

// Production wrapper that clears NODE_OPTIONS to prevent VS Code debugger interference
import { spawn } from 'child_process';
import { join } from 'path';

// Clean environment for production usage
const cleanEnv = { ...process.env };
if (cleanEnv.NODE_OPTIONS && !cleanEnv.DEBUG_CLI) {
  delete cleanEnv.NODE_OPTIONS;
}

// Path to the actual CLI script
const cliScript = join(__dirname, '../dist/bin/workspace.js');

// Execute the main CLI with clean environment
const child = spawn(process.argv[0], [cliScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: cleanEnv,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start workspace CLI:', err.message);
  process.exit(1);
});
