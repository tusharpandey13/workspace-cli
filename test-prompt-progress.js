#!/usr/bin/env node
import { ProgressIndicator } from './dist/utils/progressIndicator.js';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const progressIndicator = new ProgressIndicator();

async function testProgressWithPrompt() {
  const steps = [
    {
      id: 'validation',
      description: 'Validating GitHub issues and preparing workspace',
      weight: 1,
    },
    { id: 'directories', description: 'Creating workspace directories', weight: 1 },
  ];

  progressIndicator.initialize(steps, {
    title: 'Testing progress with prompt',
    showETA: false,
  });

  // Start first step
  progressIndicator.startStep('validation');

  // Simulate some work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('\nSimulating overwrite prompt...');

  // Pause progress for user input
  progressIndicator.pause();

  const rl = readline.createInterface({ input, output });
  await rl.question('Test prompt - continue? [y/N] ');
  rl.close();

  // Resume progress
  progressIndicator.resume();

  // Complete first step
  progressIndicator.completeStep('validation');

  // Start and complete second step
  progressIndicator.startStep('directories');
  await new Promise((resolve) => setTimeout(resolve, 500));
  progressIndicator.completeStep('directories');

  progressIndicator.complete();
  console.log('Test completed successfully');
}

testProgressWithPrompt().catch(console.error);
