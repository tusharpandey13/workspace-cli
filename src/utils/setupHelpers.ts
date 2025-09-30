/**
 * Setup wizard utilities to eliminate code duplication
 */

import { SetupWizard, SetupResult } from '../services/setupWizard.js';
import { logger } from './logger.js';

/**
 * Create and configure a new SetupWizard instance
 */
export function createSetupWizard(): SetupWizard {
  return new SetupWizard();
}

/**
 * Handle setup wizard result with consistent messaging
 */
export function handleSetupResult(result: SetupResult): void {
  if (result.completed) {
    logger.info('Setup completed! You can now use space-cli commands.');
  } else if (result.skipped) {
    logger.info('Setup was skipped. Run "space setup" when you\'re ready.');
  }
}

/**
 * Check if setup is needed and provide consistent messaging
 */
export function checkSetupNeeded(wizard: SetupWizard, force: boolean = false): boolean {
  if (!wizard.isSetupNeeded({}) && !force) {
    console.log('Configuration already exists. Proceeding with reconfiguration...');
    return false;
  }
  return true;
}
