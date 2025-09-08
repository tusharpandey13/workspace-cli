import fs from 'fs-extra';
import path from 'path';
import { validateBranchName, validateGitHubIds, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import { executeCommand, fileOps, createTestFileName } from '../utils/init-helpers.js';
import { ContextDataFetcher } from '../services/contextData.js';
import { PromptSelector } from '../services/promptSelector.js';
import readline from 'node:readline/promises';
import { setupWorktrees } from '../services/gitWorktrees.js';
import { stdin as input, stdout as output } from 'node:process';
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
}

/**
 * Parse command arguments for new project-based structure
 */
function parseProjectInitArguments(args: string[]): { issueIds: number[]; branchName: string } {
  let issueIds: string[] = [];
  let branchName: string;

  if (args.length === 1) {
    issueIds = [];
    branchName = args[0];
  } else {
    issueIds = args.slice(0, -1);
    branchName = args[args.length - 1];
  }

  const validatedBranchName = validateBranchName(branchName);
  const validatedIssueIds = validateGitHubIds(issueIds);

  return { issueIds: validatedIssueIds, branchName: validatedBranchName };
}

/**
 * Initialize workspace for a specific project
 */
async function initializeWorkspace(options: InitializeWorkspaceOptions): Promise<void> {
  const { project, projectKey, issueIds, branchName, paths, isDryRun } = options;

  // Check if workspace already exists
  await handleExistingWorkspace(paths.workspaceDir, isDryRun);

  // Create workspace directories
  logger.step(1, 6, 'Creating workspace directories...');
  await fileOps.ensureDir(
    paths.workspaceDir,
    `workspace directory: ${paths.workspaceDir}`,
    isDryRun,
  );

  // Setup git worktrees
  logger.step(2, 6, 'Setting up git worktrees...');
  await setupWorktrees(project, paths, branchName, isDryRun);

  // Collect additional context
  logger.step(3, 6, 'Collecting additional context...');
  const additionalContext = await collectAdditionalContext();

  // Fetch GitHub data
  logger.step(4, 6, 'Fetching GitHub data...');
  const contextFetcher = new ContextDataFetcher();
  const githubData = await contextFetcher.fetchGitHubData(
    issueIds,
    project.github_org,
    project.sdk_repo,
    isDryRun,
  );

  // Setup environment and dependencies
  logger.step(5, 6, 'Setting up environment and dependencies...');
  await setupEnvironmentAndDependencies(project, projectKey, paths, isDryRun);

  // Generate templates and documentation
  logger.step(6, 6, 'Generating templates and documentation...');
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

  const summary =
    issueIds.length > 0
      ? `${project.name} workspace created for GitHub IDs [${issueIds.join(', ')}]`
      : `${project.name} workspace created for branch ${branchName}`;

  logger.success(summary);
  logger.info(`Workspace location: ${paths.workspaceDir}`);

  if (isDryRun) {
    logger.info('🧪 DRY-RUN COMPLETE: No actual changes were made');
  }
}

/**
 * Initialize workspace for analysis only - skips worktree creation
 */
async function initializeAnalysisOnlyWorkspace(options: AnalysisOnlyOptions): Promise<void> {
  const { project, projectKey, issueIds, branchName, paths, isDryRun } = options;

  // Check if workspace already exists
  await handleExistingWorkspace(paths.workspaceDir, isDryRun);

  // Create workspace directories (but not worktrees)
  logger.step(1, 4, 'Creating workspace directories...');
  await fileOps.ensureDir(
    paths.workspaceDir,
    `workspace directory: ${paths.workspaceDir}`,
    isDryRun,
  );

  // Collect additional context
  logger.step(2, 4, 'Collecting additional context...');
  const additionalContext = await collectAdditionalContext();

  // Fetch GitHub data
  logger.step(3, 4, 'Fetching GitHub data...');
  const contextFetcher = new ContextDataFetcher();
  const githubData = await contextFetcher.fetchGitHubData(
    issueIds,
    project.github_org,
    project.sdk_repo,
    isDryRun,
  );

  // Generate templates and documentation (using mock paths for key files)
  logger.step(4, 4, 'Generating analysis templates...');
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

  const summary =
    issueIds.length > 0
      ? `${project.name} analysis workspace created for GitHub IDs [${issueIds.join(', ')}]`
      : `${project.name} analysis workspace created for branch ${branchName}`;

  logger.success(summary);
  logger.info(`Analysis workspace location: ${paths.workspaceDir}`);
  logger.info('📝 Prompt files populated with GitHub data and context');
  logger.info('⚠️  Note: No git worktrees were created (analysis mode)');

  if (isDryRun) {
    logger.info('🧪 DRY-RUN COMPLETE: No actual changes were made');
  }
}

/**
 * Handle existing workspace directory
 */
async function handleExistingWorkspace(workspaceDir: string, isDryRun: boolean): Promise<void> {
  if (!isDryRun && fs.existsSync(workspaceDir) && (await fs.readdir(workspaceDir)).length > 0) {
    const rl = readline.createInterface({ input, output });
    const answer = (
      await rl.question(`Workspace ${workspaceDir} already exists. Clean and overwrite? [y/N] `)
    )
      .trim()
      .toLowerCase();
    rl.close();

    if (answer === 'y' || answer === 'yes') {
      logger.info('🧹 Removing existing workspace...');
      await fileOps.removeFile(
        workspaceDir,
        `existing workspace directory: ${workspaceDir}`,
        isDryRun,
      );
    } else {
      logger.info('➡️  Continuing with existing workspace.');
    }
  }
}

/**
 * Collect additional context from user
 */
async function collectAdditionalContext(): Promise<string[]> {
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
 * Setup environment and install dependencies
 */
async function setupEnvironmentAndDependencies(
  project: ProjectConfig,
  projectKey: string,
  paths: WorkspacePaths,
  isDryRun: boolean,
): Promise<void> {
  // Copy environment file
  const envFilePath = configManager.getEnvFilePath(projectKey);
  if (!isDryRun && envFilePath && fs.existsSync(envFilePath)) {
    logger.verbose(`🔑 Copying environment variables from ${envFilePath}...`);
    await fileOps.copyFile(
      envFilePath,
      path.join(paths.sampleAppPath, '.env.local'),
      `environment file from ${envFilePath} to sample app`,
      isDryRun,
    );
  }

  const global = configManager.getGlobal();
  const packageManager = global.package_manager || 'pnpm';

  // Install SDK dependencies
  logger.verbose(`📦 Installing SDK dependencies (${packageManager})...`);
  await executeCommand(
    packageManager,
    ['install', '--prefer-offline', '--silent'],
    { cwd: paths.sdkPath, stdio: 'pipe' },
    'install SDK dependencies',
    isDryRun,
  );

  // Try to publish SDK to yalc (optional step - don't fail if it doesn't work)
  logger.verbose('📤 Publishing SDK to yalc...');
  try {
    await executeCommand(
      packageManager,
      ['yalc', 'publish', '--silent'],
      { cwd: paths.sdkPath, stdio: 'pipe' },
      'publish SDK to yalc',
      isDryRun,
    );
  } catch (error) {
    logger.warn(`⚠️  Failed to publish SDK to yalc: ${(error as Error).message}`);
    logger.warn(
      '   This is optional - you can manually build and publish the SDK later if needed.',
    );
  }

  // Install sample app dependencies
  logger.verbose(`📦 Installing sample app dependencies (${packageManager})...`);
  await executeCommand(
    packageManager,
    ['install', '--prefer-offline', '--silent'],
    { cwd: paths.sampleAppPath, stdio: 'pipe' },
    'install sample app dependencies',
    isDryRun,
  );

  // Try to link SDK into sample app via yalc (optional step - only works if publish succeeded)
  logger.verbose('🔗 Linking SDK into sample app via yalc...');
  const packageName = `@auth0/${path.basename(project.sdk_repo)}`;
  try {
    await executeCommand(
      packageManager,
      ['yalc', 'add', packageName, '--silent'],
      { cwd: paths.sampleAppPath, stdio: 'pipe' },
      'link SDK into sample app',
      isDryRun,
    );
  } catch (error) {
    logger.warn(`⚠️  Failed to link SDK into sample app: ${(error as Error).message}`);
    logger.warn('   This is optional - the workspace is still ready for development.');
  }
}

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

  // Initialize PromptSelector with workflows from config
  const workflowConfigs = configManager.getWorkflows();
  const promptSelector = new PromptSelector(workflowConfigs);

  // Select appropriate prompts based on context
  const promptSelection = promptSelector.selectPrompts(githubData, branchName, projectKey);

  logger.info(`🎯 Workflow detected: ${promptSelection.workflowType}`);
  logger.info(`📋 Selected prompts: ${promptSelection.selectedPrompts.join(', ')}`);
  logger.debug(`🔍 ${promptSelection.detectionReason}`);

  // Copy only the selected prompt templates
  const templates = configManager.getTemplates();
  const templatesDir = templates.dir || path.join(configManager.getCliRoot(), 'src/templates');

  logger.verbose(`📄 Copying selected templates from ${templatesDir}...`);

  // Copy each selected prompt individually
  for (const promptFile of promptSelection.selectedPrompts) {
    const sourcePath = path.join(templatesDir, promptFile);
    const destPath = path.join(paths.workspaceDir, promptFile);

    if (await fs.pathExists(sourcePath)) {
      await fileOps.copyFile(
        sourcePath,
        destPath,
        `selected prompt template ${promptFile}`,
        isDryRun,
      );
    } else {
      logger.warn(`⚠️  Selected prompt template not found: ${promptFile}`);
    }
  }

  // Also copy common non-prompt templates (like PR description template)
  const allFiles = await fs.readdir(templatesDir);
  const nonPromptFiles = allFiles.filter(
    (file) => !file.endsWith('.prompt.md') && file.endsWith('.md') && !file.startsWith('.'),
  );

  for (const file of nonPromptFiles) {
    const sourcePath = path.join(templatesDir, file);
    const destPath = path.join(paths.workspaceDir, file);

    await fileOps.copyFile(sourcePath, destPath, `common template ${file}`, isDryRun);
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

  // Copy templates
  const templates = configManager.getTemplates();
  const templatesDir = templates.dir || path.join(configManager.getCliRoot(), 'src/templates');

  logger.verbose(`📄 Copying templates from ${templatesDir}...`);
  await fileOps.copyFile(
    templatesDir,
    paths.workspaceDir,
    `templates from ${templatesDir} to workspace`,
    isDryRun,
  );

  // Remove unnecessary templates if no GitHub IDs
  if (issueIds.length === 0) {
    logger.verbose('⚠️  No GitHub IDs provided - removing analysis and fix-and-test prompts');
    const analysisPrompt = path.join(paths.workspaceDir, 'analysis.prompt.md');
    const fixPrompt = path.join(paths.workspaceDir, 'fix-and-test.prompt.md');

    if (!isDryRun) {
      if (fs.existsSync(analysisPrompt)) {
        await fileOps.removeFile(analysisPrompt, 'analysis.prompt.md (no GitHub IDs)', isDryRun);
      }
      if (fs.existsSync(fixPrompt)) {
        await fileOps.removeFile(fixPrompt, 'fix-and-test.prompt.md (no GitHub IDs)', isDryRun);
      }
    }
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
  additionalContext,
}: {
  project: ProjectConfig;
  projectKey: string;
  issueIds: number[];
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  additionalContext: string[];
}): PlaceholderValues {
  const primaryIssueId = issueIds.length > 0 ? issueIds[0] : null;
  const testFileName = createTestFileName(githubData);

  // Format GitHub data
  const githubDataFormatted =
    githubData.length > 0 ? formatGitHubData(githubData) : 'No GitHub issues or PRs provided.';

  const additionalContextFormatted =
    additionalContext.length > 0
      ? additionalContext.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')
      : 'No additional context provided.';

  // Generate key files lists
  const sdkKeyFiles = generateSdkKeyFiles(paths.sdkPath, paths.workspaceDir);
  const sampleKeyFiles = generateSampleKeyFiles(paths.samplesPath, paths.workspaceDir);

  const bugReportPath = primaryIssueId
    ? path.join(paths.workspaceDir, `BUGREPORT_${primaryIssueId}.md`)
    : path.join(paths.workspaceDir, 'WORKSPACE_INFO.md');

  return {
    '{{PROJECT_NAME}}': project.name || project.sdk_repo,
    '{{PROJECT_KEY}}': projectKey,
    '{{BRANCH_NAME}}': branchName,
    '{{WORKSPACE_DIR}}': paths.workspaceDir,
    '{{SDK_PATH}}': paths.sdkPath,
    '{{SAMPLE_PATH}}': paths.samplesPath,
    '{{GITHUB_DATA}}': githubDataFormatted,
    '{{SDK_KEY_FILES}}': sdkKeyFiles,
    '{{SAMPLE_KEY_FILES}}': sampleKeyFiles,
    '{{BUGREPORT_FILE}}': path.basename(bugReportPath),
    '{{RELATED_ISSUES_PRS}}': 'No additional related issues or PRs provided via user input.',
    '{{ADDITIONAL_CONTEXT}}': additionalContextFormatted,
    '{{TEST_FILE_NAME}}': testFileName,
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
  additionalContext,
}: {
  project: ProjectConfig;
  projectKey: string;
  issueIds: number[];
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  additionalContext: string[];
}): PlaceholderValues {
  const primaryIssueId = issueIds.length > 0 ? issueIds[0] : null;
  const testFileName = createTestFileName(githubData);

  // Format GitHub data
  const githubDataFormatted =
    githubData.length > 0 ? formatGitHubData(githubData) : 'No GitHub issues or PRs provided.';

  const additionalContextFormatted =
    additionalContext.length > 0
      ? additionalContext.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')
      : 'No additional context provided.';

  // Generate mock key files lists for analysis mode
  const sdkKeyFiles = generateMockSdkKeyFiles(project);
  const sampleKeyFiles = generateMockSampleKeyFiles(project);

  const bugReportPath = primaryIssueId
    ? path.join(paths.workspaceDir, `BUGREPORT_${primaryIssueId}.md`)
    : path.join(paths.workspaceDir, 'WORKSPACE_INFO.md');

  return {
    '{{PROJECT_NAME}}': project.name || project.sdk_repo,
    '{{PROJECT_KEY}}': projectKey,
    '{{BRANCH_NAME}}': branchName,
    '{{WORKSPACE_DIR}}': paths.workspaceDir,
    '{{SDK_PATH}}': `${paths.sdkPath} (not created in analysis mode)`,
    '{{SAMPLE_PATH}}': `${paths.samplesPath} (not created in analysis mode)`,
    '{{GITHUB_DATA}}': githubDataFormatted,
    '{{SDK_KEY_FILES}}': sdkKeyFiles,
    '{{SAMPLE_KEY_FILES}}': sampleKeyFiles,
    '{{BUGREPORT_FILE}}': path.basename(bugReportPath),
    '{{RELATED_ISSUES_PRS}}': 'No additional related issues or PRs provided via user input.',
    '{{ADDITIONAL_CONTEXT}}': additionalContextFormatted,
    '{{TEST_FILE_NAME}}': testFileName,
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
 * Generate SDK key files list
 */
function generateSdkKeyFiles(sdkPath: string, _workspaceDir: string): string {
  const commonFiles = [
    'src/server/auth-client.ts',
    'src/server/client.ts',
    'src/server/cookies.ts',
    'src/index.ts',
  ];
  return (
    commonFiles
      .filter((rel) => fs.existsSync(path.join(sdkPath, rel)))
      .map((rel) => `- ${path.basename(sdkPath)}/${rel}`)
      .join('\n') || '- No key files found'
  );
}

/**
 * Generate sample key files list
 */
function generateSampleKeyFiles(samplesPath: string, workspaceDir: string): string {
  const targetFiles = ['auth.js', 'middleware.js', 'pages/api/auth/[...auth0].js'];
  const matches: string[] = [];

  const walk = (dir: string, depth: number = 0): void => {
    if (depth > 3) return; // Limit recursion depth

    try {
      for (const entry of fs.readdirSync(dir)) {
        if (['node_modules', '.next', '.yalc'].includes(entry)) continue;

        const fp = path.join(dir, entry);
        const stat = fs.statSync(fp);

        if (stat.isDirectory()) {
          walk(fp, depth + 1);
        } else if (targetFiles.some((target) => entry === target || fp.endsWith(target))) {
          matches.push(path.relative(workspaceDir, fp));
        }
      }
    } catch {
      // Ignore errors reading directories
    }
  };

  walk(samplesPath);
  return matches.map((rel) => `- ${rel}`).join('\n') || '- No key files found';
}

/**
 * Generate mock SDK key files list for analysis mode
 */
function generateMockSdkKeyFiles(project: ProjectConfig): string {
  const projectTypeFiles: Record<string, string[]> = {
    next: [
      'src/server/auth-client.ts',
      'src/server/client.ts',
      'src/server/cookies.ts',
      'src/index.ts',
      'src/client/index.ts',
      'src/client/use-user.ts',
    ],
    spa: [
      'src/index.ts',
      'src/auth0-client.ts',
      'src/auth0-spa-js.ts',
      'src/cache/index.ts',
      'src/token.worker.ts',
    ],
    node: [
      'src/index.ts',
      'src/auth/base-auth-api.ts',
      'src/auth/oauth-api.ts',
      'src/management/index.ts',
    ],
    react: [
      'src/index.tsx',
      'src/auth0-provider.tsx',
      'src/use-auth0.tsx',
      'src/auth0-context.tsx',
    ],
  };

  const projectKey = project.key || 'generic';
  const files = projectTypeFiles[projectKey] || projectTypeFiles['next']; // Default to next.js files

  return files
    .map((rel) => `- ${path.basename(project.sdk_repo)}/${rel} (mock - analysis mode)`)
    .join('\n');
}

/**
 * Generate mock sample key files list for analysis mode
 */
function generateMockSampleKeyFiles(project: ProjectConfig): string {
  const projectTypeFiles: Record<string, string[]> = {
    next: [
      'pages/api/auth/[...auth0].js',
      'pages/_app.js',
      'pages/index.js',
      'pages/profile.js',
      'middleware.js',
      'auth.js',
    ],
    spa: ['src/index.js', 'src/app.js', 'public/index.html', 'webpack.config.js'],
    node: ['server.js', 'routes/auth.js', 'routes/protected.js', 'app.js'],
    react: [
      'src/index.js',
      'src/App.js',
      'src/components/Profile.js',
      'src/components/LoginButton.js',
    ],
  };

  const projectKey = project.key || 'generic';
  const files = projectTypeFiles[projectKey] || projectTypeFiles['next']; // Default to next.js files
  const sampleAppPath = project.sample_app_path || 'Sample-01';

  return files.map((rel) => `- ${sampleAppPath}/${rel} (mock - analysis mode)`).join('\n');
}

/**
 * Generate workspace info or bug report file
 */
async function generateWorkspaceInfoFile(options: GenerateWorkspaceInfoOptions): Promise<void> {
  const { issueIds, branchName, paths, githubData, additionalContext, isDryRun } = options;

  const primaryIssueId = issueIds.length > 0 ? issueIds[0] : null;
  const bugReportPath = primaryIssueId
    ? path.join(paths.workspaceDir, `BUGREPORT_${primaryIssueId}.md`)
    : path.join(paths.workspaceDir, 'WORKSPACE_INFO.md');

  if (!isDryRun && !fs.existsSync(bugReportPath)) {
    const githubDataFormatted = formatGitHubData(githubData);
    const additionalContextFormatted =
      additionalContext.length > 0
        ? additionalContext.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')
        : 'No additional context provided.';

    const fileContent = primaryIssueId
      ? `# Bug Report for #${primaryIssueId}

*Fill this out while completing the analysis prompt.*

## Summary

## Root Cause

## Reproduction Steps

## Proposed Fix

## GitHub Issues/PRs Context

${githubDataFormatted}

## Related Issues/PRs (User Input)

No additional related issues or PRs provided via user input.

## Additional Context

${additionalContextFormatted}
`
      : `# Workspace Info for ${branchName}

*This workspace was created without specific GitHub IDs.*

## Branch Purpose

## GitHub Issues/PRs Context

${githubDataFormatted}

## Related Issues/PRs (User Input)

No additional related issues or PRs provided via user input.

## Additional Context

${additionalContextFormatted}

## Notes

`;
    await fileOps.writeFile(
      bugReportPath,
      fileContent,
      primaryIssueId ? `bug report for #${primaryIssueId}` : `workspace info for ${branchName}`,
      isDryRun,
    );
  }
}

/**
 * Handle PR initialization when --pr option is used
 */
async function handlePRInitialization(
  projectKey: string,
  prIdStr: string,
  options: { verbose?: boolean; dryRun?: boolean; analyse?: boolean },
): Promise<void> {
  // Import PR functionality
  const { initializePRWorkspace, fetchPRData } = await import('./pr.js');

  // Validate project key
  const validatedProjectKey = validateProjectKey(projectKey);
  const project = configManager.validateProject(validatedProjectKey);

  // Parse PR ID
  const prId = parseInt(prIdStr, 10);
  if (isNaN(prId) || prId <= 0) {
    throw new Error(`Invalid PR ID: ${prIdStr}. Must be a positive integer.`);
  }

  const isDryRun = options.dryRun || false;
  const isAnalyseMode = options.analyse || false;

  if (isAnalyseMode) {
    throw new Error(
      'Analysis mode (--analyse) is not yet supported with PR initialization. Use regular init with --analyse instead.',
    );
  }

  if (isDryRun) {
    logger.info('🧪 DRY-RUN MODE: No actual changes will be made');
  }

  logger.info(`🚀 Initializing ${project.name} workspace for PR #${prId}`);

  // Fetch PR data to get branch name
  const { data: prData, branchName } = await fetchPRData(prId, project, isDryRun);

  // Get workspace paths for this project
  const workspaceName = `pr-${prId}-${branchName.replace(/\//g, '_')}`;
  const paths = configManager.getWorkspacePaths(validatedProjectKey, workspaceName);

  logger.verbose(`📍 Project: ${project.name} (${validatedProjectKey})`);
  logger.verbose(`📍 PR: #${prId} (${prData.title})`);
  logger.verbose(`📍 Branch: ${branchName}`);
  logger.verbose(`📍 Workspace directory: ${paths.workspaceDir}`);
  logger.verbose(`📍 SDK path: ${paths.sdkPath}`);
  logger.verbose(`📍 Samples path: ${paths.samplesPath}`);

  // Initialize workspace for PR
  await initializePRWorkspace({
    project,
    projectKey: validatedProjectKey,
    prId,
    branchName,
    workspaceName,
    paths,
    isDryRun,
  });
}

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new workspace with git worktrees for development')
    .argument(
      '<project>',
      'Project key (e.g., next, node, react) - use "workspace projects" to see available projects',
    )
    .argument(
      '[args...]',
      'GitHub issue IDs followed by branch name, or just branch name (optional when using --pr)',
    )
    .option('-v, --verbose', 'Enable verbose logging output')
    .option('--dry-run', 'Show what would be done without executing (implies verbose)')
    .option(
      '--analyse',
      'Analysis mode: create workspace and populate prompt files without setting up git worktrees',
    )
    .addHelpText(
      'after',
      `
Examples:
  $ workspace init next feature/my-new-feature
    Initialize a Next.js workspace with branch "feature/my_new_feature"

  $ workspace init node 123 456 bugfix/issue-123
    Initialize a Node.js workspace for GitHub issues 123 & 456 with branch "bugfix/issue-123"

  $ workspace init react --pr 789
    Initialize a React workspace for pull request #789 (uses global --pr option)

  $ workspace init next feature/test --dry-run
    Preview what would be done without making changes

  $ workspace init next 123 feature/fix-bug --analyse
    Create analysis workspace for issue 123 without setting up git worktrees

Description:
  This command creates a new development workspace with git worktrees for both
  the SDK and samples repositories. It sets up the necessary directory structure,
  creates or switches to the specified branch, and generates template files for
  development workflows.

  Use --analyse to create an analysis-only workspace that populates prompt files
  with GitHub data and project context without setting up git worktrees. This is
  useful for quick analysis tasks.

  When GitHub issue IDs are provided, relevant context is extracted and used
  in generated templates. When using --pr, the workspace is set up on the PR's
  branch with PR context included in templates.

Related commands:
  workspace projects    List available projects
  workspace list        List existing workspaces
  workspace info        Show workspace details`,
    )
    .action(
      async (
        projectKey: string,
        args: string[],
        options: { verbose?: boolean; dryRun?: boolean; analyse?: boolean },
      ) => {
        try {
          // Check if --pr option was used globally
          const globalOpts = program.opts();
          if (globalOpts.pr) {
            // Handle PR initialization
            return await handlePRInitialization(projectKey, globalOpts.pr, options);
          }

          // Ensure args are provided for normal init
          if (!args || args.length === 0) {
            throw new Error(
              'Branch name is required when not using --pr option. Usage: init <project> <branch-name> OR init <project> --pr <pr-id>',
            );
          }

          // Normal init flow
          // Validate project key
          const validatedProjectKey = validateProjectKey(projectKey);
          const project = configManager.validateProject(validatedProjectKey);

          // Parse arguments
          const { issueIds, branchName } = parseProjectInitArguments(args);

          const isVerbose = options.verbose || options.dryRun;
          const isDryRun = options.dryRun || false;
          const isAnalyseMode = options.analyse || false;

          if (isDryRun) {
            logger.info('🧪 DRY-RUN MODE: No actual changes will be made');
          }

          if (isAnalyseMode) {
            logger.info('🔍 ANALYSIS MODE: Skipping git worktree creation');
          }

          const initMessage =
            issueIds.length > 0
              ? `🚀 Initializing ${project.name} workspace for GitHub IDs [${issueIds.join(', ')}] with branch: ${branchName}`
              : `🚀 Initializing ${project.name} workspace with branch: ${branchName}`;
          logger.info(initMessage);

          // Get workspace paths for this project
          const workspaceName = branchName.replace(/\//g, '_');
          const paths = configManager.getWorkspacePaths(validatedProjectKey, workspaceName);

          logger.verbose(`📍 Project: ${project.name} (${validatedProjectKey})`);
          logger.verbose(`📍 Workspace directory: ${paths.workspaceDir}`);
          logger.verbose(`📍 SDK path: ${paths.sdkPath}`);
          logger.verbose(`📍 Samples path: ${paths.samplesPath}`);

          // Initialize workspace (choose analysis or full mode)
          if (isAnalyseMode) {
            await initializeAnalysisOnlyWorkspace({
              project,
              projectKey: validatedProjectKey,
              issueIds,
              branchName,
              workspaceName,
              paths,
              isDryRun,
              isVerbose: isVerbose || false,
            });
          } else {
            await initializeWorkspace({
              project,
              projectKey: validatedProjectKey,
              issueIds,
              branchName,
              workspaceName,
              paths,
              isDryRun,
              isVerbose: isVerbose || false,
            });
          }
        } catch (error) {
          handleError(error as Error, logger);
        }
      },
    );
}
