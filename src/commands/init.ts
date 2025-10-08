import fs from 'fs-extra';
import path from 'path';
import {
  validateBranchName,
  validateGitHubIds,
  validateGitHubIdsExistence,
  validateWorkspaceName,
} from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError, ValidationError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import { isNonInteractive } from '../utils/globalOptions.js';
import { executeGitCommand, executeShellCommand } from '../utils/secureExecution.js';
import { initCoordinator } from '../utils/asyncCoordinator.js';
import { fileOps, createTestFileName } from '../utils/init-helpers.js';
import { ContextDataFetcher } from '../services/contextData.js';
import { progressIndicator, type ProgressStep } from '../utils/progressIndicator.js';
import { ensureProjectsConfigured } from '../utils/projectValidation.js';
import { getWorkflowTemplatesWithChoice } from '../utils/workflow.js';
import readline from 'node:readline/promises';
import { setupWorktrees } from '../services/gitWorktrees.js';
import { stdin as input, stdout as output } from 'node:process';
import {
  extractGitHubRepoInfo,
  getCachedPullRequestInfo,
  isGitHubCliAvailable,
} from '../utils/githubUtils.js';
import type { Command } from 'commander';
import type {
  ProjectConfig,
  WorkspacePaths,
  GitHubIssueData,
  PlaceholderValues,
  InitializeWorkspaceOptions,
  GenerateTemplatesOptions,
  GenerateWorkspaceInfoOptions,
} from '../types/index.js';

/**
 * Interface for analysis-only workspace initialization
 */
interface AnalysisOnlyOptions {
  project: ProjectConfig;
  projectKey: string;
  issueIds: number[];
  branchName: string;
  workspaceName: string;
  paths: WorkspacePaths;
  isDryRun: boolean;
  isVerbose: boolean;
  isSilent: boolean;
  withContext: boolean;
}

/**
 * Result of post-init command execution
 */
interface PostInitResult {
  success: boolean;
  output?: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
  };
  error?: Error;
}

/**
 * Parse command arguments for simplified repo-name based structure
 * New signature: space init <repo_name> <...github_ids> prefix/branch_name
 */
function parseRepoInitArguments(args: string[]): { issueIds: number[]; branchName: string } {
  if (args.length < 1) {
    throw new Error('Branch name is required as the last argument');
  }

  // Last argument is always the branch name
  const branchName = args[args.length - 1];

  // Everything in between (if any) are GitHub IDs
  const issueIds = args.slice(0, -1);

  const validatedBranchName = validateBranchName(branchName);
  const validatedIssueIds = validateGitHubIds(issueIds);

  return { issueIds: validatedIssueIds, branchName: validatedBranchName };
}

/**
 * Extract workspace path from args array for PR mode
 * In PR mode, the workspace path is typically the last argument (if provided)
 * @param args - Array of command line arguments
 * @returns The workspace path if found, undefined otherwise
 */
export function extractWorkspacePathFromArgs(args: string[]): string | undefined {
  if (args.length === 0) {
    return undefined;
  }

  // In PR mode, the last argument should be the workspace path
  // We don't need to validate GitHub IDs here since we're in PR mode
  const lastArg = args[args.length - 1];

  // Basic validation - if it looks like a number, it's probably a GitHub ID, not a workspace path
  if (/^\d+$/.test(lastArg)) {
    return undefined;
  }

  // Apply workspace name validation
  try {
    return validateWorkspaceName(lastArg);
  } catch (error) {
    throw new Error(`Invalid workspace path "${lastArg}": ${(error as Error).message}`);
  }
}

/**
 * Initialize workspace for a specific project
 */
async function initializeWorkspace(options: InitializeWorkspaceOptions): Promise<void> {
  const { project, projectKey, issueIds, branchName, paths, isDryRun, isSilent, withContext } =
    options;

  // Handle existing workspace first to determine if cleanup is needed
  const workspaceExists = await fs.pathExists(paths.workspaceDir);
  let willCleanup = false;

  // Check if we'll actually clean up (in silent mode or user confirms)
  if (workspaceExists && !isDryRun && (await fs.readdir(paths.workspaceDir)).length > 0) {
    if (isSilent) {
      willCleanup = true;
    } else if (!isNonInteractive()) {
      // We'll ask the user, but we can't know the answer yet
      // So we'll set up progress indicators after the user decides
    }
  }

  // Setup progress indicators (only if not silent) - but wait for user decision if needed
  if (!isSilent && process.env.WORKSPACE_DISABLE_PROGRESS !== '1') {
    if (!workspaceExists || willCleanup || isSilent) {
      // Either no existing workspace, or we know we'll clean up
      const steps: ProgressStep[] = [];

      // Add cleanup step if we know we'll clean up
      if (willCleanup) {
        steps.push({ id: 'cleanup', description: 'Cleaning existing workspace', weight: 1 });
      }

      steps.push(
        { id: 'directories', description: 'Creating workspace', weight: 1 },
        { id: 'worktrees', description: 'Creating worktrees', weight: 3 },
        { id: 'context', description: 'Preparing context', weight: 2 },
        { id: 'postinit', description: 'Running post-init', weight: 1 },
      );

      progressIndicator.initialize(steps, {
        title: 'Setting up workspace',
        showETA: false,
      });
    }
    // If workspace exists and we're interactive, we'll initialize progress after user input
  }

  // Handle existing workspace as part of progress tracking
  await handleExistingWorkspace(
    paths.workspaceDir,
    branchName,
    project,
    paths,
    isDryRun,
    isSilent,
    issueIds,
  );

  // Setup progress indicators if not already initialized
  if (
    !progressIndicator.isActive() &&
    !isSilent &&
    process.env.WORKSPACE_DISABLE_PROGRESS !== '1'
  ) {
    const steps: ProgressStep[] = [
      { id: 'directories', description: 'Creating workspace', weight: 1 },
      { id: 'worktrees', description: 'Creating worktrees', weight: 3 },
      { id: 'context', description: 'Preparing context', weight: 2 },
      { id: 'postinit', description: 'Running post-init', weight: 1 },
    ];

    progressIndicator.initialize(steps, {
      title: 'Setting up workspace',
      showETA: false,
    });
  }

  // Setup parallel operations for independent tasks
  initCoordinator.clear();

  // Operation 1: Directory creation (critical - must complete first)
  initCoordinator.addOperation({
    id: 'directories',
    description: 'Creating workspace directories',
    priority: 'critical',
    execute: async () => {
      await fileOps.ensureDir(
        paths.workspaceDir,
        `workspace directory: ${paths.workspaceDir}`,
        isDryRun,
      );
    },
  });

  // Operation 2: Context gathering (can run in parallel with worktrees)
  initCoordinator.addOperation({
    id: 'context',
    description: 'Gathering GitHub context and data',
    priority: 'normal',
    execute: async () => {
      return await gatherInitializationContext(project, issueIds, isDryRun, withContext);
    },
    dependencies: ['directories'],
  });

  // Operation 3: Git worktrees setup (can run in parallel with context)
  initCoordinator.addOperation({
    id: 'worktrees',
    description: 'Setting up git worktrees',
    priority: 'normal',
    execute: async () => {
      try {
        await setupWorktrees(project, paths, branchName, isDryRun);
        return { success: true };
      } catch (error) {
        // Gracefully handle worktree failures
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes('already used by worktree') ||
          errorMessage.includes('already checked out') ||
          errorMessage.includes('worktree already exists') ||
          errorMessage.includes('invalid reference') ||
          errorMessage.includes('Failed to create new worktree branch') ||
          errorMessage.includes('does not appear to be a git repository') ||
          errorMessage.includes('No such remote')
        ) {
          if (options.isVerbose) {
            console.log('\n🔄 Worktree creation failed due to branch conflicts.');
            console.log('📁 Continuing with workspace-only mode (no git worktrees).');
            console.log('💡 You can still use the workspace directory for development.\n');
          }
          logger.verbose(`Worktree setup failed: ${errorMessage}`);
          logger.verbose('Falling back to workspace-only mode');
          return { success: false, fallback: true };
        }
        throw error;
      }
    },
    dependencies: ['directories'],
  });

  // Execute critical operations first, then parallel operations
  if (!isSilent) {
    progressIndicator.startStep('directories');
  }

  const directoryResult = await initCoordinator.executeInParallel(['directories']);
  if (!directoryResult[0].success) {
    throw directoryResult[0].error;
  }

  progressIndicator.completeStep('directories');

  // Execute context and worktrees in parallel
  if (!isSilent) {
    progressIndicator.startStep('worktrees');
    progressIndicator.startStep('context');
  }

  const parallelResults = await initCoordinator.executeInParallel(['context', 'worktrees']);

  const contextResult = parallelResults.find((r) => r.id === 'context');
  const worktreeResult = parallelResults.find((r) => r.id === 'worktrees');

  if (!contextResult?.success) {
    throw contextResult?.error || new Error('Context gathering failed');
  }

  // Extract context data from result
  const { githubData, additionalContext } = contextResult.result;
  const worktreesCreated = worktreeResult?.success && !worktreeResult.result?.fallback;

  progressIndicator.completeStep('worktrees');
  progressIndicator.completeStep('context');

  // Generate templates and documentation
  logger.verbose('📝 Generating templates and documentation...');
  await generateTemplatesAndDocs({
    project,
    projectKey,
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
    isDryRun,
  });

  // Execute optional post-init command in background (non-blocking)
  let postInitPromise: Promise<PostInitResult | null> | null = null;
  if (project['post-init']) {
    if (!isSilent) {
      progressIndicator.startStep('postinit');
    }

    // Start post-init in background
    postInitPromise = executePostInitCommand(project, paths, isDryRun, worktreesCreated, options);
  } else {
    logger.verbose('No post-init command configured, skipping post-init setup');
  }

  // Complete progress bar immediately (don't wait for post-init)
  if (!isSilent) {
    if (project['post-init']) {
      progressIndicator.completeStep('postinit');
    }
    progressIndicator.complete();
  }

  // Show workspace ready message immediately
  if (!isSilent) {
    logger.info('Workspace ready');
  }

  if (isDryRun) {
    console.log('DRY-RUN COMPLETE: No actual changes were made');
  } else if (isSilent) {
    // Show brief success message even in silent/non-interactive mode
    console.log(`Workspace location: ${paths.workspaceDir}`);
  }

  // Wait for post-init completion in background and handle result
  if (postInitPromise) {
    postInitPromise
      .then((postInitResult) => {
        if (postInitResult && !postInitResult.success) {
          // Post-init failed - show warning but don't fail the entire init
          console.error(`\n⚠️  Post-init command failed (workspace is still ready):`);
          if (postInitResult.output) {
            if (postInitResult.output.stdout) {
              console.error('STDOUT:', postInitResult.output.stdout);
            }
            if (postInitResult.output.stderr) {
              console.error('STDERR:', postInitResult.output.stderr);
            }
            if (postInitResult.output.exitCode) {
              console.error(`Exit Code: ${postInitResult.output.exitCode}`);
            }
          }
          if (postInitResult.error) {
            console.error('Error:', postInitResult.error.message);
          }
          console.error('Note: The workspace is still ready for development.');
        }
      })
      .catch((error) => {
        // Handle unexpected post-init errors
        console.error(
          `\n⚠️  Post-init command encountered an unexpected error (workspace is still ready):`,
        );
        console.error('Error:', (error as Error).message);
        console.error('Note: The workspace is still ready for development.');
      });
  }
}

/**
 * Initialize workspace for analysis only - skips worktree creation
 */
async function initializeAnalysisOnlyWorkspace(options: AnalysisOnlyOptions): Promise<void> {
  const { project, projectKey, issueIds, branchName, paths, isDryRun, isSilent, withContext } =
    options;

  // Check if workspace already exists and handle cleanup
  await handleExistingWorkspace(
    paths.workspaceDir,
    branchName,
    project,
    paths,
    isDryRun,
    isSilent,
    issueIds,
  );

  // For analysis mode, we don't create worktrees anyway, so we can ignore conflicts

  // Create workspace directories (but not worktrees)
  console.log('[1/3] Creating workspace directories...');
  await fileOps.ensureDir(
    paths.workspaceDir,
    `workspace directory: ${paths.workspaceDir}`,
    isDryRun,
  );

  // Gather context and generate templates (consolidated step)
  console.log('[2/3] Gathering context...');

  // Sample app analysis handled automatically by templates

  // Use shared context gathering to eliminate duplication
  const { githubData, additionalContext } = await gatherInitializationContext(
    project,
    issueIds,
    isDryRun,
    withContext,
  );

  // Generate templates and documentation (using mock paths for key files)
  logger.verbose('📝 Generating analysis templates...');
  await generateAnalysisTemplatesAndDocs({
    project,
    projectKey,
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
    isDryRun,
  });

  // Show completion
  console.log('[3/3] Analysis complete');
  console.log('\nWorkspace ready');
  console.log(`Workspace location: ${paths.workspaceDir}`);

  const summary =
    issueIds.length > 0
      ? `${project.name} analysis workspace created for GitHub IDs [${issueIds.join(', ')}]`
      : `${project.name} analysis workspace created for branch ${branchName}`;

  console.log(summary);
  console.log('Note: No git worktrees were created (analysis mode)');

  if (isDryRun) {
    console.log('DRY-RUN COMPLETE: No actual changes were made');
  }
}

/**
 * Enhanced cleanup for existing workspace - removes directories AND associated git branches
 */
export async function cleanupExistingWorkspace(
  workspaceDir: string,
  branchName: string,
  _project: ProjectConfig,
  paths: WorkspacePaths,
  isDryRun: boolean,
): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would clean up workspace: ${workspaceDir}`);
    return;
  }

  logger.verbose('Performing comprehensive cleanup...');

  // Step 1: Remove any existing worktrees for this branch
  const sourceRepoPath = paths.sourceRepoPath;
  const destinationRepoPath = paths.destinationRepoPath;

  try {
    // Remove source worktree if it exists
    if (fs.existsSync(paths.sourcePath)) {
      logger.verbose(`Removing existing source worktree: ${paths.sourcePath}`);
      try {
        await executeGitCommand(['worktree', 'remove', paths.sourcePath, '--force'], {
          cwd: sourceRepoPath,
        });
        logger.verbose('Source worktree removed');
      } catch (error) {
        // If removal fails, the worktree might be stale - prune and continue
        logger.verbose('Source worktree removal failed, attempting prune...');
        await executeGitCommand(['worktree', 'prune'], { cwd: sourceRepoPath });
      }
    }

    // Remove destination worktree if it exists
    if (destinationRepoPath && fs.existsSync(paths.destinationPath!)) {
      logger.verbose(`Removing existing destination worktree: ${paths.destinationPath}`);
      try {
        await executeGitCommand(['worktree', 'remove', paths.destinationPath!, '--force'], {
          cwd: destinationRepoPath,
        });
        logger.verbose('Destination worktree removed');
      } catch (error) {
        // If removal fails, prune and continue
        logger.verbose('Destination worktree removal failed, attempting prune...');
        await executeGitCommand(['worktree', 'prune'], { cwd: destinationRepoPath });
      }
    }

    // Step 3: Prune worktrees first to clean up any stale references
    await executeGitCommand(['worktree', 'prune'], { cwd: sourceRepoPath });
    if (destinationRepoPath) {
      await executeGitCommand(['worktree', 'prune'], { cwd: destinationRepoPath });
    }

    // Step 4: Remove local branches with the same name to prevent conflicts
    try {
      logger.verbose(`Removing local branch: ${branchName} from source repo`);
      await executeGitCommand(['branch', '-D', branchName], { cwd: sourceRepoPath });
      logger.verbose(`Local branch ${branchName} removed from source repo`);
    } catch (error) {
      // Branch might not exist locally, or might be used by another worktree - that's fine for now
      logger.verbose(
        `Local branch ${branchName} does not exist in source repo or is in use (removal failed)`,
      );
    }

    if (destinationRepoPath) {
      try {
        logger.verbose(`Removing local branch: ${branchName} from destination repo`);
        await executeGitCommand(['branch', '-D', branchName], { cwd: destinationRepoPath });
        logger.verbose(`Local branch ${branchName} removed from destination repo`);
      } catch (error) {
        // Branch might not exist locally, or might be used by another worktree - that's fine for now
        logger.verbose(
          `Local branch ${branchName} does not exist in destination repo or is in use (removal failed)`,
        );
      }
    }
  } catch (error) {
    logger.warn(`Some cleanup operations failed: ${(error as Error).message}`);
    logger.warn('Continuing with directory removal...');
  }

  // Step 5: Remove the workspace directory
  logger.verbose(`Removing workspace directory: ${workspaceDir}`);
  await fileOps.removeFile(workspaceDir, `existing workspace directory: ${workspaceDir}`, isDryRun);

  logger.verbose('Comprehensive cleanup completed');
}

/**
 * Handle existing workspace directory with simple cleanup
 */
async function handleExistingWorkspace(
  workspaceDir: string,
  branchName: string,
  project: ProjectConfig,
  paths: WorkspacePaths,
  isDryRun: boolean,
  isSilent: boolean,
  _issueIds: number[],
): Promise<boolean> {
  const workspaceExists =
    !isDryRun && fs.existsSync(workspaceDir) && (await fs.readdir(workspaceDir)).length > 0;

  // Only handle workspace directory conflicts - git conflicts are handled gracefully later
  if (!workspaceExists) {
    return false; // No cleanup needed
  }

  if (isSilent) {
    logger.warn(`Workspace ${workspaceDir} already exists. Auto-removing in silent mode...`);
    // Start cleanup progress step (check if step exists to avoid errors)
    if (progressIndicator.isActive()) {
      try {
        progressIndicator.startStep('cleanup');
      } catch (error) {
        // If cleanup step doesn't exist, continue without progress tracking for cleanup
        logger.debug('Cleanup step not found in progress indicator, continuing...');
      }
    }
    await cleanupExistingWorkspace(workspaceDir, branchName, project, paths, isDryRun);
    // Complete cleanup step
    if (progressIndicator.isActive()) {
      try {
        progressIndicator.completeStep('cleanup');
      } catch (error) {
        // If cleanup step doesn't exist, continue without progress tracking for cleanup
        logger.debug('Cleanup step not found in progress indicator, continuing...');
      }
    }
    return true; // Cleanup was performed
  }

  if (isNonInteractive() || (!process.stdin.isTTY && process.env.NODE_ENV !== 'test')) {
    logger.error(`Workspace directory already exists: ${workspaceDir}`);
    logger.error('Cannot prompt for confirmation in non-interactive mode.');
    logger.info('Use --silent flag to automatically overwrite existing workspaces.');
    throw new Error('\nWorkspace directory conflict - cannot continue in non-interactive mode');
  }

  // Pause progress bar and ensure clean output for user input
  if (progressIndicator.isActive()) {
    progressIndicator.pause();
  }

  // Display workspace conflict in a simple format
  console.log(`\nWorkspace directory already exists: ${workspaceDir}\n`);
  process.stdout.write(`Clean and overwrite? [y/N] `);

  // Handle input - use simple line reading for test environments
  const answer = await new Promise<string>((resolve) => {
    // In test environments or when input is piped, use simple line reading
    if (process.env.NODE_ENV === 'test' || !process.stdin.isTTY) {
      const onData = (chunk: Buffer) => {
        const input = chunk.toString().trim().toLowerCase();
        process.stdin.removeListener('data', onData);
        process.stdin.pause();
        resolve(input);
      };

      process.stdin.resume();
      process.stdin.on('data', onData);
      return;
    }

    // For interactive terminal use, use raw mode for better UX
    let input = '';

    const onData = (chunk: Buffer) => {
      const char = chunk.toString();

      if (char === '\n' || char === '\r') {
        // User pressed Enter - process the input
        process.stdin.removeListener('data', onData);
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();

        // Show newline only after we've processed input
        process.stdout.write('\n');

        resolve(input.trim().toLowerCase());
      } else if (char === '\u0003') {
        // Ctrl+C - exit gracefully
        process.stdin.removeListener('data', onData);
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.exit(0);
      } else if (char === '\u007f' || char === '\b') {
        // Backspace - remove last character
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b'); // Move cursor back, write space, move back again
        }
      } else if (char.length === 1 && char >= ' ' && char <= '~') {
        // Printable character - add to input and echo
        input += char;
        process.stdout.write(char);
      }
    };

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('data', onData);
  });

  if (answer === 'y' || answer === 'yes') {
    // Initialize progress now that we know user wants cleanup
    if (
      !progressIndicator.isActive() &&
      !isSilent &&
      process.env.WORKSPACE_DISABLE_PROGRESS !== '1'
    ) {
      const steps: ProgressStep[] = [
        { id: 'cleanup', description: 'Cleaning existing workspace', weight: 1 },
        { id: 'directories', description: 'Creating workspace', weight: 1 },
        { id: 'worktrees', description: 'Creating worktrees', weight: 3 },
        { id: 'context', description: 'Preparing context', weight: 2 },
        { id: 'postinit', description: 'Running post-init', weight: 1 },
      ];
      progressIndicator.initialize(steps, {
        title: 'Setting up workspace',
        showETA: false,
      });
    }

    // Start cleanup progress step (check if step exists to avoid errors)
    if (progressIndicator.isActive()) {
      try {
        progressIndicator.startStep('cleanup');
      } catch (error) {
        // If cleanup step doesn't exist, continue without progress tracking for cleanup
        logger.debug('Cleanup step not found in progress indicator, continuing...');
      }
    }
    await cleanupExistingWorkspace(workspaceDir, branchName, project, paths, isDryRun);
    // Complete cleanup step
    if (progressIndicator.isActive()) {
      try {
        progressIndicator.completeStep('cleanup');
      } catch (error) {
        // If cleanup step doesn't exist, continue without progress tracking for cleanup
        logger.debug('Cleanup step not found in progress indicator, continuing...');
      }
    }
    return true; // Cleanup was performed
  } else {
    console.log('Continuing with existing');
    return false; // No cleanup performed
  }
}

/**
 * Shared context gathering for both workspace modes
 * Eliminates duplicate context collection and GitHub data fetching
 */
async function gatherInitializationContext(
  project: ProjectConfig,
  issueIds: number[],
  isDryRun: boolean,
  withContext: boolean,
): Promise<{
  repoInfo: ReturnType<typeof extractGitHubRepoInfo>;
  githubData: GitHubIssueData[];
  additionalContext: string[];
}> {
  // Collect additional context (only once)
  logger.verbose('📊 Collecting additional context...');
  const additionalContext = await collectAdditionalContext(!withContext);

  // Extract GitHub org and repo using cached utility (only once)
  const repoInfo = extractGitHubRepoInfo(project.repo);

  // Fetch GitHub data
  logger.verbose('🔍 Fetching GitHub data...');
  const contextFetcher = new ContextDataFetcher();
  const githubData = await contextFetcher.fetchGitHubData(
    issueIds,
    repoInfo.org,
    repoInfo.repo,
    isDryRun,
  );

  return { repoInfo, githubData, additionalContext };
}
async function collectAdditionalContext(skipContextCollection: boolean = true): Promise<string[]> {
  if (skipContextCollection || isNonInteractive()) {
    if (isNonInteractive()) {
      logger.verbose('⏭️  Skipping context collection (non-interactive mode)');
    } else {
      logger.verbose('⏭️  Skipping additional context collection');
    }
    return [];
  }

  console.log('\n🔗 Additional Context Collection');
  const rl = readline.createInterface({ input, output });

  console.log(
    'Enter any additional context that might be helpful for analysis (press Enter on empty line to finish):',
  );
  const additionalContext: string[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const context = (await rl.question('  Context: ')).trim();
    if (!context) break;
    additionalContext.push(context);
  }

  rl.close();
  return additionalContext;
}

/**
 * Cleanup failed workspace directories and worktrees
 */
async function cleanupFailedWorkspace(
  paths: WorkspacePaths,
  _branchName: string,
  isDryRun: boolean,
): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would cleanup failed workspace at ${paths.workspaceDir}`);
    return;
  }

  try {
    logger.verbose('🧹 Cleaning up failed workspace...');

    // Remove workspace directory if it exists
    if (fs.existsSync(paths.workspaceDir)) {
      await fileOps.removeFile(
        paths.workspaceDir,
        `failed workspace directory: ${paths.workspaceDir}`,
        isDryRun,
      );
      logger.verbose(`✅ Removed workspace directory: ${paths.workspaceDir}`);
    }

    // Clean up any dangling worktrees
    if (paths.sourceRepoPath && fs.existsSync(paths.sourceRepoPath)) {
      try {
        await executeGitCommand(['worktree', 'prune'], { cwd: paths.sourceRepoPath });
        logger.verbose('✅ Pruned source repository worktrees');
      } catch (error) {
        logger.debug(`Could not prune source worktrees: ${error}`);
      }
    }

    if (paths.destinationRepoPath && fs.existsSync(paths.destinationRepoPath)) {
      try {
        await executeGitCommand(['worktree', 'prune'], { cwd: paths.destinationRepoPath });
        logger.verbose('✅ Pruned destination repository worktrees');
      } catch (error) {
        logger.debug(`Could not prune destination worktrees: ${error}`);
      }
    }

    logger.info('🧹 Workspace cleanup completed');
  } catch (cleanupError) {
    logger.warn(`⚠️ Cleanup failed: ${(cleanupError as Error).message}`);
    logger.warn('   You may need to manually remove workspace directories');
  }
}
async function executePostInitCommand(
  project: ProjectConfig,
  paths: WorkspacePaths,
  isDryRun: boolean,
  worktreesCreated: boolean = true,
  options: { isVerbose: boolean } = { isVerbose: false },
): Promise<PostInitResult> {
  if (!project['post-init']) {
    logger.verbose('No post-init command configured, skipping...');
    return { success: true };
  }

  // If worktrees failed to create, check if post-init command needs worktrees
  if (!worktreesCreated) {
    // Check if the command appears to reference worktree directories
    const postInitCommand = project['post-init'];
    const containsWorktreeReferences = /cd\s+[a-zA-Z0-9_-]+(\s|&&|$)/.test(postInitCommand);

    if (containsWorktreeReferences) {
      logger.verbose(
        'Skipping post-init command because it appears to reference worktree directories that were not created',
      );
      if (options.isVerbose) {
        console.log('⏭️  Skipping post-init command (requires worktrees that failed to create)');
      }
      return { success: true };
    } else {
      logger.verbose(
        'Post-init command appears to be workspace-independent, running despite worktree creation failure',
      );
      if (options.isVerbose) {
        console.log('⚡ Running post-init command (workspace-independent)');
      }
    }
  }

  // Copy environment file if configured
  if (project.env_file) {
    const envFilePath = configManager.getEnvFilePath(project.key);
    const targetPath = paths.destinationPath
      ? path.join(paths.destinationPath, '.env.local')
      : null;

    if (!isDryRun && envFilePath && fs.existsSync(envFilePath) && targetPath) {
      logger.verbose(`🔑 Copying environment variables from ${envFilePath}...`);
      await fileOps.copyFile(
        envFilePath,
        targetPath,
        `environment file from ${envFilePath} to ${targetPath}`,
        isDryRun,
      );
    }
  }

  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would execute: ${project['post-init']}`);
    return { success: true };
  }

  try {
    // Capture output instead of inheriting stdio - buffer all output
    const result = await executeShellCommand(project['post-init'], {
      cwd: paths.workspaceDir,
      stdio: 'pipe', // Capture output instead of inheriting,
      timeout: 3 * 60 * 1000, // TODO: make this configurable
    });

    if (result.exitCode !== 0) {
      return {
        success: false,
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
      };
    }

    // Success: return success result
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Setup environment and install dependencies
 */
/**
 * Generate templates and documentation
 */
async function generateTemplatesAndDocs(options: GenerateTemplatesOptions): Promise<void> {
  const {
    project,
    projectKey,
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
    isDryRun,
  } = options;

  // Select templates based on project configuration
  const hasGitHubContext = githubData && githubData.length > 0;
  const workflowTemplates = getWorkflowTemplatesWithChoice(project, hasGitHubContext);

  logger.verbose(`📋 Selected templates: ${workflowTemplates.join(', ')}`);

  // Copy selected workflow templates
  const templates = configManager.getTemplates();
  const templatesDir = templates.dir || path.join(configManager.getCliRoot(), 'src/templates');

  logger.verbose(`📄 Copying templates from ${templatesDir}...`);

  // Copy each workflow template
  for (const templateFile of workflowTemplates) {
    const sourcePath = path.join(templatesDir, templateFile);
    const destPath = path.join(paths.workspaceDir, templateFile);

    if (await fs.pathExists(sourcePath)) {
      await fileOps.copyFile(sourcePath, destPath, `template ${templateFile}`, isDryRun);
    } else {
      logger.warn(`WARNING: Template not found: ${templateFile}`);
    }
  }

  // Verify all expected templates were created
  if (!isDryRun) {
    const missingTemplates: string[] = [];
    for (const templateFile of workflowTemplates) {
      const templatePath = path.join(paths.workspaceDir, templateFile);
      if (!(await fs.pathExists(templatePath))) {
        missingTemplates.push(templateFile);
      }
    }

    if (missingTemplates.length > 0) {
      logger.warn(`⚠️ Some templates were not created: ${missingTemplates.join(', ')}`);
    } else {
      logger.verbose(`✅ All ${workflowTemplates.length} workflow templates created successfully`);
    }
  }

  // Copy workspace copilot instructions
  const workspaceCopilotInstructionsSource = path.join(
    templatesDir,
    'workspace-copilot-instructions.md',
  );
  const workspaceCopilotInstructionsDest = path.join(
    paths.workspaceDir,
    '.github',
    'copilot-instructions.md',
  );

  if (await fs.pathExists(workspaceCopilotInstructionsSource)) {
    await fileOps.ensureDir(
      path.dirname(workspaceCopilotInstructionsDest),
      '.github directory',
      isDryRun,
    );
    await fileOps.copyFile(
      workspaceCopilotInstructionsSource,
      workspaceCopilotInstructionsDest,
      'workspace copilot instructions',
      isDryRun,
    );
  }

  // Generate placeholder values and update templates
  const placeholderValues = createPlaceholderValues({
    project,
    projectKey,
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
  });

  if (!isDryRun) {
    const promptFiles = (await fs.readdir(paths.workspaceDir)).filter((f) =>
      f.endsWith('.prompt.md'),
    );

    logger.verbose(`📝 Updating ${promptFiles.length} prompt files with placeholders...`);
    for (const file of promptFiles) {
      const promptPath = path.join(paths.workspaceDir, file);
      let contents = await fs.readFile(promptPath, 'utf8');
      for (const [placeholder, value] of Object.entries(placeholderValues)) {
        contents = contents.split(placeholder).join(value);
      }
      await fileOps.writeFile(
        promptPath,
        contents,
        `prompt file ${file} with placeholders`,
        isDryRun,
      );
    }

    // Update workspace copilot instructions with placeholders
    const copilotInstructionsPath = path.join(
      paths.workspaceDir,
      '.github',
      'copilot-instructions.md',
    );
    if (await fs.pathExists(copilotInstructionsPath)) {
      let contents = await fs.readFile(copilotInstructionsPath, 'utf8');
      for (const [placeholder, value] of Object.entries(placeholderValues)) {
        contents = contents.split(placeholder).join(value);
      }
      await fileOps.writeFile(
        copilotInstructionsPath,
        contents,
        'copilot instructions with placeholders',
        isDryRun,
      );
    }
  }

  // Generate bug report or workspace info file
  await generateWorkspaceInfoFile({
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
    isDryRun,
  });
}

/**
 * Generate templates and documentation for analysis-only workspace
 * This version creates mock key files lists since no worktrees exist
 */
async function generateAnalysisTemplatesAndDocs(options: GenerateTemplatesOptions): Promise<void> {
  const {
    project,
    projectKey,
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
    isDryRun,
  } = options;

  // Select templates based on project configuration
  const hasGitHubContext = githubData && githubData.length > 0;
  const workflowTemplates = getWorkflowTemplatesWithChoice(project, hasGitHubContext);

  logger.verbose(`� Selected templates: ${workflowTemplates.join(', ')}`);

  // Copy selected templates
  const templates = configManager.getTemplates();
  const templatesDir = templates.dir || path.join(configManager.getCliRoot(), 'src/templates');

  logger.verbose(`📄 Copying workflow-specific templates from ${templatesDir}...`);

  for (const templateName of workflowTemplates) {
    const sourcePath = path.join(templatesDir, templateName);
    const destPath = path.join(paths.workspaceDir, templateName);

    if (fs.existsSync(sourcePath)) {
      await fileOps.copyFile(sourcePath, destPath, `template ${templateName}`, isDryRun);
    } else {
      logger.verbose(`WARNING: Template ${templateName} not found, skipping`);
    }
  }

  // Verify all expected templates were created
  if (!isDryRun) {
    const missingTemplates: string[] = [];
    for (const templateName of workflowTemplates) {
      const templatePath = path.join(paths.workspaceDir, templateName);
      if (!(await fs.pathExists(templatePath))) {
        missingTemplates.push(templateName);
      }
    }

    if (missingTemplates.length > 0) {
      logger.warn(`⚠️ Some workflow templates were not created: ${missingTemplates.join(', ')}`);
    } else {
      logger.verbose(`✅ All ${workflowTemplates.length} workflow templates verified successfully`);
    }
  }

  // Copy workspace copilot instructions
  const workspaceCopilotInstructionsSource = path.join(
    templatesDir,
    'workspace-copilot-instructions.md',
  );
  const workspaceCopilotInstructionsDest = path.join(
    paths.workspaceDir,
    '.github',
    'copilot-instructions.md',
  );

  if (await fs.pathExists(workspaceCopilotInstructionsSource)) {
    await fileOps.ensureDir(
      path.dirname(workspaceCopilotInstructionsDest),
      '.github directory',
      isDryRun,
    );
    await fileOps.copyFile(
      workspaceCopilotInstructionsSource,
      workspaceCopilotInstructionsDest,
      'workspace copilot instructions',
      isDryRun,
    );
  }

  // Generate placeholder values for analysis mode (with mock key files)
  const placeholderValues = createAnalysisPlaceholderValues({
    project,
    projectKey,
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
  });

  if (!isDryRun) {
    const promptFiles = (await fs.readdir(paths.workspaceDir)).filter((f) =>
      f.endsWith('.prompt.md'),
    );

    logger.verbose(`📝 Updating ${promptFiles.length} prompt files with placeholders...`);
    for (const file of promptFiles) {
      const promptPath = path.join(paths.workspaceDir, file);
      let contents = await fs.readFile(promptPath, 'utf8');
      for (const [placeholder, value] of Object.entries(placeholderValues)) {
        contents = contents.split(placeholder).join(value);
      }
      await fileOps.writeFile(
        promptPath,
        contents,
        `prompt file ${file} with placeholders`,
        isDryRun,
      );
    }

    // Update workspace copilot instructions with placeholders
    const copilotInstructionsPath = path.join(
      paths.workspaceDir,
      '.github',
      'copilot-instructions.md',
    );
    if (await fs.pathExists(copilotInstructionsPath)) {
      let contents = await fs.readFile(copilotInstructionsPath, 'utf8');
      for (const [placeholder, value] of Object.entries(placeholderValues)) {
        contents = contents.split(placeholder).join(value);
      }
      await fileOps.writeFile(
        copilotInstructionsPath,
        contents,
        'copilot instructions with placeholders',
        isDryRun,
      );
    }
  }

  // Generate bug report or workspace info file
  await generateWorkspaceInfoFile({
    issueIds,
    branchName,
    paths,
    githubData,
    additionalContext,
    isDryRun,
  });
}

/**
 * Create placeholder values for template substitution
 */
function createPlaceholderValues({
  project,
  projectKey,
  issueIds,
  branchName,
  paths,
  githubData,
  additionalContext: _additionalContext,
}: {
  project: ProjectConfig;
  projectKey: string;
  issueIds: number[];
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  additionalContext: string[];
}): PlaceholderValues {
  const testFileName = createTestFileName(githubData);

  // Reference CONTEXT.md instead of embedding data for regular mode too
  const contextReference = 'See CONTEXT.md for detailed GitHub data and external context.';

  // Generate key files lists
  const repoKeyFiles = generateRepoKeyFiles(paths.sourcePath, paths.workspaceDir);
  const sampleKeyFiles = paths.destinationPath
    ? generateSampleKeyFiles(paths.destinationPath, paths.workspaceDir)
    : '';

  return {
    '{{PROJECT_NAME}}': project.name || project.repo,
    '{{PROJECT_KEY}}': projectKey,
    '{{BRANCH_NAME}}': branchName,
    '{{WORKSPACE_DIR}}': paths.workspaceDir,
    '{{SDK_PATH}}': paths.sourcePath,
    '{{SAMPLE_PATH}}': paths.destinationPath || '',
    '{{SOURCE_PATH}}': paths.sourcePath,
    '{{DESTINATION_PATH}}': paths.destinationPath || '',
    '{{GITHUB_DATA}}': contextReference,
    '{{GITHUB_IDS}}': issueIds.join(', ') || 'None',
    '{{SDK_KEY_FILES}}': repoKeyFiles,
    '{{SAMPLE_KEY_FILES}}': sampleKeyFiles,
    '{{SOURCE_KEY_FILES}}': repoKeyFiles,
    '{{RELATED_ISSUES_PRS}}': contextReference,
    '{{ADDITIONAL_CONTEXT}}': contextReference,
    '{{TEST_FILE_NAME}}': testFileName,
    '{{POST_INIT_COMMAND}}': project['post-init'] || 'echo "No post-init command configured"',
  };
}

/**
 * Create placeholder values for analysis mode (without actual worktree files)
 */
function createAnalysisPlaceholderValues({
  project,
  projectKey,
  issueIds,
  branchName,
  paths,
  githubData,
  additionalContext: _additionalContext,
}: {
  project: ProjectConfig;
  projectKey: string;
  issueIds: number[];
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  additionalContext: string[];
}): PlaceholderValues {
  const testFileName = createTestFileName(githubData);

  // Reference CONTEXT.md instead of embedding data
  const contextReference = 'See CONTEXT.md for detailed GitHub data and external context.';

  // Generate mock key files lists for analysis mode
  const repoKeyFiles = generateMockRepoKeyFiles(project);
  const sampleKeyFiles = generateMockSampleKeyFiles(project);

  return {
    '{{PROJECT_NAME}}': project.name || project.repo,
    '{{PROJECT_KEY}}': projectKey,
    '{{BRANCH_NAME}}': branchName,
    '{{WORKSPACE_DIR}}': paths.workspaceDir,
    '{{SOURCE_PATH}}': `${paths.sourcePath} (not created in analysis mode)`,
    '{{DESTINATION_PATH}}': `${paths.destinationPath || 'N/A'} (not created in analysis mode)`,
    '{{SDK_PATH}}': `${paths.sourcePath} (not created in analysis mode)`,
    '{{SAMPLE_PATH}}': `${paths.destinationPath || 'N/A'} (not created in analysis mode)`,
    '{{GITHUB_DATA}}': contextReference,
    '{{GITHUB_IDS}}': issueIds.join(', ') || 'None',
    '{{SOURCE_KEY_FILES}}': repoKeyFiles,
    '{{SAMPLE_KEY_FILES}}': sampleKeyFiles,
    '{{SDK_KEY_FILES}}': repoKeyFiles,
    '{{RELATED_ISSUES_PRS}}': contextReference,
    '{{ADDITIONAL_CONTEXT}}': contextReference,
    '{{TEST_FILE_NAME}}': testFileName,
    '{{POST_INIT_COMMAND}}': project['post-init'] || 'echo "No post-init command configured"',
  };
}

/**
 * Format GitHub data for templates
 */
function formatGitHubData(githubData: GitHubIssueData[]): string {
  return githubData
    .map((item) => {
      let formatted = `### ${item.type === 'issue' ? 'Issue' : 'PR'} #${item.id}: ${item.title}\n`;
      formatted += `- **URL**: ${item.url}\n`;
      formatted += `- **State**: ${item.state}\n`;
      formatted += `- **Created**: ${item.created_at}\n`;
      formatted += `- **Updated**: ${item.updated_at}\n`;

      if (item.labels.length > 0) {
        formatted += `- **Labels**: ${item.labels.join(', ')}\n`;
      }
      if (item.assignees.length > 0) {
        formatted += `- **Assignees**: ${item.assignees.join(', ')}\n`;
      }

      formatted += `\n**Description**:\n${item.body || 'No description provided.'}\n`;

      if (item.links && item.links.length > 0) {
        const linkList = item.links.map((link) => `- ${link}`).join('\n');
        formatted += `\n**Referenced Links**:\n${linkList}\n`;
      }

      if (item.comments && item.comments.length > 0) {
        formatted += `\n**Comments**:\n`;
        item.comments.forEach((comment, i) => {
          formatted += `${i + 1}. **${comment.author}** (${comment.created_at}): ${comment.body}\n`;
          if (comment.links.length > 0) {
            formatted += `   Links: ${comment.links.join(', ')}\n`;
          }
        });
      }

      return formatted;
    })
    .join('\n---\n\n');
}

/**
 * Generate repo key files list (stack-agnostic)
 */
function generateRepoKeyFiles(repoPath: string, _workspaceDir: string): string {
  const commonFiles = [
    'README.md',
    'src/index.*',
    'lib/index.*',
    'package.json',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'CMakeLists.txt',
  ];

  const foundFiles: string[] = [];

  for (const pattern of commonFiles) {
    if (pattern.includes('*')) {
      // Handle simple wildcard patterns
      const basePattern = pattern.replace('*', '');
      try {
        const dirPath = path.join(repoPath, path.dirname(pattern));
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            if (file.startsWith(path.basename(basePattern))) {
              foundFiles.push(path.join(path.dirname(pattern), file));
            }
          }
        }
      } catch {
        // Ignore errors
      }
    } else if (fs.existsSync(path.join(repoPath, pattern))) {
      foundFiles.push(pattern);
    }
  }

  return foundFiles.length > 0
    ? foundFiles.map((rel) => `- ${path.basename(repoPath)}/${rel}`).join('\n')
    : '- Repository files (inspect manually)';
}

/**
 * Generate sample key files list (stack-agnostic)
 */
function generateSampleKeyFiles(destinationPath: string, workspaceDir: string): string {
  const commonPatterns = ['README.md', 'src/', 'examples/', 'demo/', 'samples/'];
  const matches: string[] = [];

  const walk = (dir: string, depth: number = 0): void => {
    if (depth > 2) return; // Limit recursion depth

    try {
      for (const entry of fs.readdirSync(dir)) {
        if (['node_modules', '.git', 'dist', 'build', 'target'].includes(entry)) continue;

        const fp = path.join(dir, entry);
        const stat = fs.statSync(fp);

        if (stat.isDirectory()) {
          if (commonPatterns.some((pattern) => entry.includes(pattern.replace('/', '')))) {
            matches.push(path.relative(workspaceDir, fp));
          }
          walk(fp, depth + 1);
        } else if (
          entry === 'README.md' ||
          entry.startsWith('example') ||
          entry.startsWith('demo')
        ) {
          matches.push(path.relative(workspaceDir, fp));
        }
      }
    } catch {
      // Ignore errors reading directories
    }
  };

  walk(destinationPath);
  return matches.length > 0
    ? matches
        .slice(0, 10)
        .map((rel) => `- ${rel}`)
        .join('\n')
    : '- Sample files (inspect manually)';
}

/**
 * Generate generic mock repo key files list for analysis mode
 */
function generateMockRepoKeyFiles(project: ProjectConfig): string {
  const repoName = path.basename(project.repo, '.git');
  return [
    `- ${repoName}/README.md (analysis mode - no worktree)`,
    `- ${repoName}/src/main-entry-point (analysis mode - no worktree)`,
    `- ${repoName}/src/core-functionality (analysis mode - no worktree)`,
    `- ${repoName}/tests/* (analysis mode - no worktree)`,
  ].join('\n');
}

/**
 * Generate generic mock sample key files list for analysis mode
 */
function generateMockSampleKeyFiles(project: ProjectConfig): string {
  if (!project.sample_repo) {
    return '- No sample repository configured';
  }

  const sampleRepoName = path.basename(project.sample_repo, '.git');
  return [
    `- ${sampleRepoName}/README.md (analysis mode - no worktree)`,
    `- ${sampleRepoName}/src/example-usage (analysis mode - no worktree)`,
    `- ${sampleRepoName}/src/demo-files (analysis mode - no worktree)`,
  ].join('\n');
}

/**
 * Generate workspace info or bug report file
 */
async function generateWorkspaceInfoFile(options: GenerateWorkspaceInfoOptions): Promise<void> {
  const { issueIds, branchName, paths, githubData, additionalContext, isDryRun } = options;

  // Always create CONTEXT.md with GitHub data and external context
  const contextPath = path.join(paths.workspaceDir, 'CONTEXT.md');

  if (!isDryRun) {
    const githubDataFormatted = formatGitHubData(githubData);
    const additionalContextFormatted =
      additionalContext.length > 0
        ? additionalContext.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')
        : 'No additional context provided.';

    const contextContent = `# Context Data for ${branchName}

## GitHub Issues/PRs

${githubDataFormatted}

## Additional Context

${additionalContextFormatted}

## Repository Information

- **Branch**: ${branchName}
- **GitHub IDs**: ${issueIds.length > 0 ? issueIds.join(', ') : 'None'}
- **Workspace**: ${paths.workspaceDir}

---

*This file contains all external context data. Reference this file from prompts instead of embedding data directly.*
`;

    await fileOps.writeFile(contextPath, contextContent, 'CONTEXT.md with GitHub data', isDryRun);
    logger.verbose(`📋 Created CONTEXT.md with GitHub data and external context`);
  }
}

/**
 * Handle PR initialization when --pr option is used
 */
async function handlePRInitialization(
  projectKey: string,
  prIdStr: string,
  options: { verbose?: boolean; dryRun?: boolean; analyse?: boolean; silent?: boolean },
  isSilent: boolean,
  workspacePath?: string,
): Promise<void> {
  const isVerbose = options.verbose || options.dryRun;
  const isDryRun = options.dryRun || false;
  const isAnalyseMode = options.analyse || false;

  if (isVerbose) {
    logger.verbose(`Initializing workspace for PR #${prIdStr} in project ${projectKey}`);
  }

  const prId = parseInt(prIdStr, 10);
  if (isNaN(prId) || prId <= 0) {
    throw new Error(`Invalid PR ID: ${prIdStr}. Must be a positive number.`);
  }

  // Get project configuration
  const { project } = configManager.findProject(projectKey);

  // Extract GitHub repository information
  const repoInfo = extractGitHubRepoInfo(project.repo);

  // Use GitHub API for PR identification if available (replaces git clone)
  if (repoInfo.isGitHub) {
    try {
      const isCliAvailable = await isGitHubCliAvailable();
      if (!isCliAvailable) {
        throw new Error('GitHub CLI is required for PR initialization but is not available');
      }

      logger.verbose(`🔍 Fetching PR #${prId} information via GitHub API...`);

      // Get PR information directly from GitHub API (no clone needed)
      const prInfo = await getCachedPullRequestInfo(prId, repoInfo.org, repoInfo.repo, isDryRun);

      const issueIds = [prId];
      const branchName = prInfo.branchName;
      const workspaceName = workspacePath || branchName;
      const paths = configManager.getWorkspacePaths(project.key, workspaceName);

      logger.success(`PR #${prId} branch identified: ${branchName}`);

      if (isAnalyseMode) {
        await initializeAnalysisOnlyWorkspace({
          project,
          projectKey,
          issueIds,
          branchName,
          workspaceName,
          paths,
          isDryRun,
          isVerbose: isVerbose || false,
          isSilent,
          withContext: false,
        });
      } else {
        await initializeWorkspace({
          project,
          projectKey,
          issueIds,
          branchName,
          workspaceName,
          paths,
          isDryRun,
          isVerbose: isVerbose || false,
          isSilent,
          withContext: false,
        });
      }
      return;
    } catch (error) {
      // Enhanced error handling with better user guidance
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('GitHub CLI is not available')) {
        throw new Error(
          `GitHub CLI is required for PR initialization but is not installed.\n` +
            `Please install GitHub CLI: https://cli.github.com/`,
        );
      }

      if (errorMessage.includes('not found in') || errorMessage.includes('Access denied to')) {
        throw new Error(
          `PR #${prId} not found or access denied.\n` +
            `Please verify the PR exists and you have access to ${project.repo}`,
        );
      }

      if (!project.repo.includes('github.com')) {
        throw new Error(
          `PR initialization is only supported for GitHub repositories.\n` +
            `For non-GitHub repos, please use: space init ${projectKey} ${prIdStr} <branch-name>`,
        );
      }

      // Re-throw with enhanced context
      throw new Error(`PR #${prId} initialization failed: ${errorMessage}`);
    }
  }
}

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new space with git worktrees for development')
    .argument(
      '[project_identifier]',
      'Project key or repo name (e.g., java/auth0-java, next/nextjs-auth0). If omitted, interactive mode will be used.',
    )
    .argument(
      '[args...]',
      'GitHub issue IDs followed by branch name. Format: init <project> <...github_ids> <branch_name>',
    )
    .option('-v, --verbose', 'Enable verbose logging output')
    .option('--dry-run', 'Show what would be done without executing (implies verbose)')
    .option(
      '--analyse',
      'Analysis mode: create workspace and populate prompt files without setting up git worktrees',
    )
    .option(
      '--silent',
      'Silent mode: skip all user input prompts with sensible defaults (fire-and-forget mode)',
    )
    .option(
      '--with-context',
      'Enable interactive context collection prompt (optional additional context)',
    )
    .addHelpText(
      'after',
      `
Examples:
  $ space init next feature/my-new-feature
    Initialize space for 'next' project using project key

  $ space init auth0-java feature/my-new-feature  
    Initialize space for 'java' project using repository name

  $ space init java 123 456 bugfix/issue-123
    Initialize space for java project for GitHub issues 123 & 456

  $ space init nextjs-auth0 --pr 789
    Initialize space using repo name for pull request #789 (uses detected branch name)

  $ space init nextjs-auth0 --pr 789 review/feature-branch
    Initialize space for PR #789 with custom workspace path

  $ space init spa feature/test --dry-run
    Preview what would be done without making changes

  $ space init node 123 feature/fix-bug --analyse
    Create analysis space for issue 123 without setting up git worktrees

Description:
  This command creates a new development space with git worktrees for both
  the main repository and optional sample repository. It sets up the necessary 
  directory structure, creates or switches to the specified branch, and generates 
  template files for development workflows.

  The command signature is: init <project_identifier> <...github_ids> <branch_name>
  where project_identifier can be either:
  - A project key from config.yaml (e.g., next, spa, node, java)
  - A repository name extracted from the repo URL (e.g., nextjs-auth0, auth0-spa-js)

  Use --analyse to create an analysis-only space that populates prompt files
  with GitHub data and project context without setting up git worktrees. This is
  useful for quick analysis tasks.

  When GitHub issue IDs are provided, relevant context is extracted and used
  in generated templates. When using --pr, the space is set up on the PR's
  branch with PR context included in templates.

Related commands:
  space projects    List available projects
  space list        List existing spaces
  space info        Show space details`,
    )
    .action(
      async (
        projectIdentifier: string | undefined,
        args: string[],
        options: {
          verbose?: boolean;
          dryRun?: boolean;
          analyse?: boolean;
          silent?: boolean;
          withContext?: boolean;
        },
      ) => {
        try {
          // If no project identifier provided, go to interactive mode
          if (!projectIdentifier) {
            if (isNonInteractive()) {
              logger.error('Project identifier is required in non-interactive mode.');
              logger.info('Usage: space init <project> [github-ids...] <branch-name>');
              logger.info('Run "space projects" to see available projects.');
              throw new ValidationError('Project identifier is required in non-interactive mode');
            }

            const prompts = (await import('prompts')).default;

            if (!ensureProjectsConfigured(true)) {
              return;
            }

            const projects = configManager.listProjects();
            console.log("🚀 Let's create a new workspace!\n");

            // Interactive prompts for init
            const initResponse = await prompts([
              {
                type: 'select',
                name: 'project',
                message: 'Select a project:',
                choices: projects.map((key) => {
                  const project = configManager.getProject(key);
                  return {
                    title: `${key} → ${project.name}`,
                    value: key,
                    description: project.repo,
                  };
                }),
              },
              {
                type: 'text',
                name: 'branchName',
                message: 'Enter branch name:',
                initial: 'feature/new-feature',
                validate: (val: string) => (val.trim() ? true : 'Branch name is required'),
              },
              {
                type: 'text',
                name: 'githubIds',
                message: 'GitHub issue IDs (optional, space-separated):',
                initial: '',
              },
            ]);

            if (!initResponse.project) {
              console.log('Init cancelled.');
              return;
            }

            // Update parameters for the rest of the execution
            projectIdentifier = initResponse.project;
            args = [];

            // Add GitHub IDs if provided
            if (initResponse.githubIds.trim()) {
              const ids = initResponse.githubIds.trim().split(/\s+/);
              args.push(...ids);
            }

            args.push(initResponse.branchName);

            console.log(`\n⚡ Creating workspace: ${projectIdentifier} ${args.join(' ')}\n`);
          }

          // Calculate common options first
          const isVerbose = options.verbose || options.dryRun;
          const isDryRun = options.dryRun || false;
          const isAnalyseMode = options.analyse || false;
          const isSilent = options.silent || isNonInteractive() || isDryRun || false;

          // Check if --pr option was used globally FIRST (before interactive mode checks)
          const globalOpts = program.opts();
          if (globalOpts.pr) {
            // Handle PR initialization - use new findProject method for better resolution
            const { projectKey } = configManager.findProject(projectIdentifier!);
            // Extract workspace path from args if provided
            const workspacePath = extractWorkspacePathFromArgs(args);
            return await handlePRInitialization(
              projectKey,
              globalOpts.pr,
              options,
              isSilent,
              workspacePath,
            );
          }

          // If no args provided but project identifier exists, go to interactive mode for args
          if (projectIdentifier && (!args || args.length === 0)) {
            if (isNonInteractive()) {
              logger.error(
                'Branch name and optional GitHub issue IDs are required in non-interactive mode.',
              );
              logger.info('Usage: space init <project> [github-ids...] <branch-name>');
              return;
            }

            const prompts = (await import('prompts')).default;

            console.log("🚀 Let's create a new workspace!\n");

            // Interactive prompts for init
            const initResponse = await prompts([
              {
                type: 'text',
                name: 'branchName',
                message: 'Enter branch name:',
                initial: 'feature/new-feature',
                validate: (val: string) => (val.trim() ? true : 'Branch name is required'),
              },
              {
                type: 'text',
                name: 'githubIds',
                message: 'GitHub issue IDs (optional, space-separated):',
                initial: '',
              },
            ]);

            if (!initResponse.branchName) {
              console.log('Init cancelled.');
              return;
            }

            // Build args array
            args = [];

            // Add GitHub IDs if provided
            if (initResponse.githubIds.trim()) {
              const ids = initResponse.githubIds.trim().split(/\s+/);
              args.push(...ids);
            }

            args.push(initResponse.branchName);

            console.log(`\n⚡ Creating workspace: ${projectIdentifier} ${args.join(' ')}\n`);
          }

          // Find project by repo name or project key using improved resolution
          const { projectKey, project } = configManager.findProject(projectIdentifier!);

          // Parse arguments using new signature
          const { issueIds, branchName } = parseRepoInitArguments(args);
          const withContext = options.withContext || false;

          // Early GitHub ID validation for existing issues
          if (issueIds.length > 0 && !isDryRun) {
            // Get GitHub org and repo name from project config or repo URL
            let githubOrg = project.github_org || 'unknown';
            let repoName = path.basename(project.repo).replace(/\.git$/, '');

            // If no explicit github_org in config, try to parse from repo URL
            if (githubOrg === 'unknown' && project.repo.includes('github.com')) {
              const match = project.repo.match(/github\.com[/:]([^/]+)\/([^/.]+)\.git/);
              if (match) {
                githubOrg = match[1];
                repoName = match[2];
              }
            }

            // Only validate if we have a valid GitHub org (either explicit or parsed from URL)
            if (githubOrg !== 'unknown') {
              // Validate that the GitHub issues exist
              await validateGitHubIdsExistence(issueIds, githubOrg, repoName);
            }
          }

          if (isSilent && options.silent) {
            logger.info('SILENT MODE: Skipping all user input prompts');
          } else if (isSilent && isNonInteractive()) {
            logger.info('NON-INTERACTIVE MODE: Skipping all user input prompts');
          }

          if (isDryRun) {
            logger.info('DRY-RUN MODE: No actual changes will be made');
          }

          if (isAnalyseMode) {
            logger.info('ANALYSIS MODE: Skipping git worktree creation');
          }

          // Get workspace paths for this project
          const workspaceName = branchName;
          const paths = configManager.getWorkspacePaths(projectKey, workspaceName);

          const initMessage =
            issueIds.length > 0
              ? `Initializing ${project.name} workspace for GitHub IDs [${issueIds.join(', ')}] with branch: ${branchName}`
              : `Initializing ${project.name} workspace with branch: ${branchName}`;
          console.log(initMessage);
          logger.info(`Final workspace path:\n${paths.workspaceDir}`);

          logger.verbose(`📍 Project: ${project.name} (${projectKey})`);
          logger.verbose(`📍 Workspace directory: ${paths.workspaceDir}`);
          logger.verbose(`📍 Repository path: ${paths.sourcePath}`);
          logger.verbose(`📍 Sample repository path: ${paths.destinationPath || 'N/A'}`);

          // Initialize workspace (choose analysis or full mode)
          try {
            if (isAnalyseMode) {
              await initializeAnalysisOnlyWorkspace({
                project,
                projectKey,
                issueIds,
                branchName,
                workspaceName,
                paths,
                isDryRun,
                isVerbose: isVerbose || false,
                isSilent,
                withContext,
              });
            } else {
              await initializeWorkspace({
                project,
                projectKey,
                issueIds,
                branchName,
                workspaceName,
                paths,
                isDryRun,
                isVerbose: isVerbose || false,
                isSilent,
                withContext,
              });
            }
          } catch (initError) {
            logger.verbose('Workspace initialization failed, attempting cleanup...');
            await cleanupFailedWorkspace(paths, branchName, isDryRun);
            throw initError; // Re-throw to be handled by outer catch
          }
        } catch (error) {
          handleError(error as Error, logger);
        }
      },
    );
}
