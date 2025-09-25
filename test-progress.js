#!/usr/bin/env node
import { ProgressIndicator } from './dist/utils/progressIndicator.js';

const progressIndicator = new ProgressIndicator();

const steps = [
  { id: 'directories', description: 'Creating workspace directories', weight: 1 },
  { id: 'worktrees', description: 'Setting up git worktrees', weight: 3 },
  { id: 'context', description: 'Generating templates and documentation', weight: 2 },
  { id: 'postinit', description: 'Installing dependencies', weight: 1 },
];

progressIndicator.initialize(steps, {
  title: 'Setting up workspace',
  showETA: false,
});

async function simulateProgress() {
  console.log('Starting progress simulation...');
  console.log('TTY:', process.stdout.isTTY);
  console.log('CI:', process.env.CI);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  for (const step of steps) {
    // Don't use console.log during progress - let cli-progress handle display
    progressIndicator.startStep(step.id);

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 800));

    progressIndicator.completeStep(step.id);
  }

  progressIndicator.complete();

  // Only use console.log after progress is complete
  console.log('\n✅ Workspace location: /example/workspace/location');
  console.log('✅ Workspace initialization completed successfully');
}

simulateProgress().catch(console.error);
