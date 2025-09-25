#!/usr/bin/env node

// Simple test to validate progress bar fixes without running full CLI
import { ProgressIndicator } from './dist/utils/progressIndicator.js';

const progressIndicator = new ProgressIndicator();

const steps = [
  { id: 'validation', description: 'Preparing workspace', weight: 1 },
  { id: 'directories', description: 'Creating workspace directories', weight: 1 },
  { id: 'worktrees', description: 'Setting up git worktrees', weight: 3 },
  { id: 'context', description: 'Generating templates and documentation', weight: 2 },
  { id: 'postinit', description: 'Installing dependencies', weight: 1 },
];

progressIndicator.initialize(steps, {
  title: 'Setting up workspace',
  showETA: false,
});

async function testProgressFixes() {
  console.log('Testing progress bar fixes...');

  // Test 1: Validation step with GitHub validation message
  progressIndicator.startStep('validation');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate GitHub validation success message
  const issueIds = [2326];
  if (issueIds.length > 0) {
    progressIndicator.setCurrentOperation(
      `GitHub issues [${issueIds.join(',')}] validated successfully`,
    );
  }
  progressIndicator.completeStep('validation');

  // Test 2: Other steps
  for (const step of steps.slice(1)) {
    progressIndicator.startStep(step.id);
    await new Promise((resolve) => setTimeout(resolve, 800));
    progressIndicator.completeStep(step.id);
  }

  // Test 3: Clean completion (no extra emojis)
  progressIndicator.complete();
  console.log('Workspace initialization completed successfully');
}

testProgressFixes().catch(console.error);
