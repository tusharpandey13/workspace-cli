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

    const result = await execa(command, sanitizedArgs, secureOptions);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0,
    };
  } catch (error: any) {
    // Only log as error if it's not an expected failure
    const isExpectedFailure =
      error.exitCode === 1 &&
      (error.stderr?.includes('not found') ||
        error.stderr?.includes('does not exist') ||
        error.stderr?.includes('No such file or directory') ||
        // Git show-ref --verify --quiet fails silently with exit code 1 for missing refs
        (command === 'git' &&
          sanitizedArgs.includes('show-ref') &&
          sanitizedArgs.includes('--quiet')));

    if (isExpectedFailure) {
      logger.debug(`Command failed as expected: ${command} - ${error.message}`);
    } else {
      logger.error(`Command execution failed: ${command} - ${error.message}`);
    }

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

  // For shell commands, we bypass normal sanitization since we're using sh -c
  // The shell command itself may contain legitimate shell operators like && and |

  // Ensure npm/pnpm/node from nvm takes precedence over shims for better subprocess compatibility
  const enhancedEnv = { ...process.env, ...options.env };
  if ((shellCommand.includes('npm') || shellCommand.includes('pnpm')) && enhancedEnv.NVM_BIN) {
    // Put NVM_BIN at the front of PATH to ensure real npm/pnpm is used instead of shims
    enhancedEnv.PATH = `${enhancedEnv.NVM_BIN}:${enhancedEnv.PATH}`;
    const packageManager = shellCommand.includes('pnpm') ? 'pnpm' : 'npm';
    logger.debug(
      `Enhanced PATH for ${packageManager} command: ${enhancedEnv.PATH.split(':').slice(0, 3).join(', ')}...`,
    );
  }

  const secureOptions: Options = {
    ...options,
    shell: false, // We still use sh -c rather than shell: true
    timeout: options.timeout || 30000,
    env: enhancedEnv,
  };

  try {
    logger.debug(`Executing shell command via sh -c: ${shellCommand}`);

    // Verify critical executables are available before proceeding
    if (shellCommand.includes('npm') || shellCommand.includes('pnpm')) {
      // Check if the appropriate package manager is available in the PATH
      const executable = shellCommand.includes('pnpm') ? 'pnpm' : 'npm';
      logger.debug(`Validating ${executable} availability for command: ${shellCommand}`);

      const executableCheck = await execa('which', [executable], {
        env: secureOptions.env || process.env,
        reject: false,
      });
      if (executableCheck.exitCode !== 0) {
        logger.error(`${executable} executable not found in PATH for shell command execution`);
        logger.debug(`PATH: ${secureOptions.env?.PATH}`);
        logger.debug(`Shell command: ${shellCommand}`);
        return {
          stdout: '',
          stderr: `${executable} executable not found in PATH. This may be an environment inheritance issue.`,
          exitCode: 127,
        };
      } else {
        logger.debug(`${executable} found at: ${executableCheck.stdout}`);
      }
    }

    const result = await execa('sh', ['-c', shellCommand], secureOptions);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0,
    };
  } catch (error: any) {
    // Provide better error context for environment-related failures
    if (error.exitCode === 127 && error.stderr?.includes('not found')) {
      logger.error('Command execution failed due to missing executable');
      logger.error(`Command: ${shellCommand}`);
      logger.error(`PATH: ${secureOptions.env?.PATH}`);
      logger.error('This may indicate an environment inheritance issue');
    }

    // Error details are captured in return value for proper handling upstream
    // Avoid logging here to prevent interference with progress indicators
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.exitCode || 1,
    };
  }
}
