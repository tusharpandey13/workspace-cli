// This command is temporarily disabled while making the CLI stack-agnostic
// TODO: Refactor PR command to be stack-agnostic

import { logger } from '../utils/logger.js';

export async function prCommand(_projectName: string, _options: any) {
  logger.error('The PR command is temporarily disabled while making the CLI stack-agnostic.');
  logger.info('This feature will be restored in a future version with generic project support.');
  logger.info('For now, please use standard Git commands to manage your pull requests.');
  process.exit(1);
}
