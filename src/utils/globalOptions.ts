/**
 * Global options utility for accessing program-level options across commands
 */

interface GlobalOptions {
  env?: string;
  config?: string;
  verbose?: boolean;
  debug?: boolean;
  pr?: string;
  nonInteractive?: boolean;
  noConfig?: boolean;
}

let globalOptions: GlobalOptions = {};

/**
 * Set global options (called from preAction hook)
 */
export function setGlobalOptions(options: GlobalOptions): void {
  globalOptions = { ...options };
}

/**
 * Get global options
 */
export function getGlobalOptions(): GlobalOptions {
  return globalOptions;
}

/**
 * Check if non-interactive mode is enabled
 */
export function isNonInteractive(): boolean {
  return globalOptions.nonInteractive || false;
}

/**
 * Check if verbose logging is enabled
 */
export function isVerbose(): boolean {
  return globalOptions.verbose || false;
}

/**
 * Check if debug logging is enabled
 */
export function isDebug(): boolean {
  return globalOptions.debug || false;
}
