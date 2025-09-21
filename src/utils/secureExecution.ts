import { execa, type Options } from 'execa';
import { validateCommand, sanitizeShellArg } from './validation.js';
import { logger } from './logger.js';

export interface SecureExecutionOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  stdio?: 'pipe' | 'inherit' | 'ignore';
  shell?: boolean;
}

/**
 * Secure wrapper for command execution with input validation
 */
export async function executeSecureCommand(
  command: string,
  args: string[] = [],
  options: SecureExecutionOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Validate command against allow-list
  validateCommand(command);

  // Sanitize all arguments
  const sanitizedArgs = args.map((arg) => sanitizeShellArg(arg));

  // Force shell to false for security
  const secureOptions: Options = {
    ...options,
    shell: false, // Never use shell mode to prevent command injection
    timeout: options.timeout || 30000, // Default 30 second timeout
    env: { ...process.env, ...options.env }, // Ensure environment is inherited
  };

  try {
    logger.debug(`Executing secure command: ${command} with args: ${sanitizedArgs.join(' ')}`);

    // Debug the execution environment
    logger.debug(`Environment has ${Object.keys(secureOptions.env || {}).length} variables`);
    logger.debug(
      `PATH in environment: ${(secureOptions.env as any)?.PATH ? 'present' : 'missing'}`,
    );

    const result = await execa(command, sanitizedArgs, secureOptions);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0,
    };
  } catch (error: any) {
    logger.error(`Command execution failed: ${command} - ${error.message}`);
    logger.debug(`Error details: ${JSON.stringify(error, null, 2)}`);

    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.exitCode || 1,
    };
  }
}

/**
 * Execute git command with enhanced security
 */
export async function executeGitCommand(
  args: string[],
  options: SecureExecutionOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return executeSecureCommand('git', args, options);
}

/**
 * Execute GitHub CLI command with enhanced security
 */
export async function executeGhCommand(
  args: string[],
  options: SecureExecutionOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return executeSecureCommand('gh', args, options);
}

/**
 * Execute shell command with enhanced security - use with extreme caution
 */
export async function executeShellCommand(
  shellCommand: string,
  options: SecureExecutionOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Shell commands are inherently dangerous - validate the command string
  if (!shellCommand || typeof shellCommand !== 'string') {
    throw new Error('Shell command must be a non-empty string');
  }

  // For shell commands, we pass the command as arguments to sh -c
  return executeSecureCommand('sh', ['-c', shellCommand], { ...options, shell: false });
}
