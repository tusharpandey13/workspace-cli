import fs from 'fs-extra';
import path from 'path';
import { validateBranchName, validateGitHubIds } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import { executeCommand, fileOps, createTestFileName } from '../utils/init-helpers.js';
import { ContextDataFetcher } from '../services/contextData.js';
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
  isSilent: boolean;
}

/**
 * Parse command arguments for simplified repo-name based structure
 * New signature: workspace init <repo_name> <...github_ids> prefix/branch_name
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
 * Initialize workspace for a specific project
 */
async function initializeWorkspace(options: InitializeWorkspaceOptions): Promise<void> {
  const { project, projectKey, issueIds, branchName, paths, isDryRun, isSilent } = options;

  // Check if workspace already exists
  await handleExistingWorkspace(paths.workspaceDir, isDryRun, isSilent);

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
  const additionalContext = await collectAdditionalContext(isSilent);

  // Fetch GitHub data
  logger.step(4, 6, 'Fetching GitHub data...');
  const contextFetcher = new ContextDataFetcher();

  // Try to extract GitHub org and repo from repo URL if it's a GitHub URL
  let githubOrg = 'unknown';
  let repoName = path.basename(project.repo).replace(/\.git$/, ''); // Remove .git suffix

  if (project.repo.includes('github.com')) {
    const match = project.repo.match(/github\.com[/:]([^/]+)\/([^/.]+)\.git/);
    if (match) {
      githubOrg = match[1];
      repoName = match[2];
    }
  }

  const githubData = await contextFetcher.fetchGitHubData(issueIds, githubOrg, repoName, isDryRun);

  // Execute optional post-init command
  logger.step(5, 6, 'Running post-init setup...');
  await executePostInitCommand(project, paths, isDryRun);

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
  const { project, projectKey, issueIds, branchName, paths, isDryRun, isSilent } = options;

  // Check if workspace already exists
  await handleExistingWorkspace(paths.workspaceDir, isDryRun, isSilent);

  // Create workspace directories (but not worktrees)
  logger.step(1, 4, 'Creating workspace directories...');
  await fileOps.ensureDir(
    paths.workspaceDir,
    `workspace directory: ${paths.workspaceDir}`,
    isDryRun,
  );

  // Collect additional context
  logger.step(2, 4, 'Collecting additional context...');
  const additionalContext = await collectAdditionalContext(isSilent);

  // Fetch GitHub data
  logger.step(3, 4, 'Fetching GitHub data...');
  const contextFetcher = new ContextDataFetcher();

  // Try to extract GitHub org and repo from repo URL if it's a GitHub URL
  let githubOrg = 'unknown';
  let repoName = path.basename(project.repo).replace(/\.git$/, ''); // Remove .git suffix

  if (project.repo.includes('github.com')) {
    const match = project.repo.match(/github\.com[/:]([^/]+)\/([^/.]+)\.git/);
    if (match) {
      githubOrg = match[1];
      repoName = match[2];
    }
  }

  const githubData = await contextFetcher.fetchGitHubData(issueIds, githubOrg, repoName, isDryRun);

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
async function handleExistingWorkspace(
  workspaceDir: string,
  isDryRun: boolean,
  isSilent: boolean = false,
): Promise<void> {
  if (!isDryRun && fs.existsSync(workspaceDir) && (await fs.readdir(workspaceDir)).length > 0) {
    if (isSilent) {
      logger.warn(`⚠️  Workspace ${workspaceDir} already exists. Auto-removing in silent mode...`);
      await fileOps.removeFile(
        workspaceDir,
        `existing workspace directory: ${workspaceDir}`,
        isDryRun,
      );
      return;
    }

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
async function collectAdditionalContext(isSilent: boolean = false): Promise<string[]> {
  if (isSilent) {
    logger.verbose('🔕 Silent mode: Skipping additional context collection');
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
 * Execute optional post-init command if configured
 */
async function executePostInitCommand(
  project: ProjectConfig,
  paths: WorkspacePaths,
  isDryRun: boolean,
): Promise<void> {
  if (!project['post-init']) {
    logger.verbose('No post-init command configured, skipping...');
    return;
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

  logger.verbose(`🚀 Running post-init command: ${project['post-init']}`);

  try {
    await executeCommand(
      'sh',
      ['-c', project['post-init']],
      { cwd: paths.sourcePath, stdio: 'pipe' },
      'post-init command',
      isDryRun,
    );
    logger.success('Post-init command completed successfully');
  } catch (error) {
    logger.warn(`⚠️  Post-init command failed: ${(error as Error).message}`);
    logger.warn('   This is optional - the workspace is still ready for development.');
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

  // Simplified template copying - use only common templates from config
  const templates = configManager.getTemplates();
  const templatesDir = templates.dir || path.join(configManager.getCliRoot(), 'src/templates');
  const commonTemplates = templates.common || [
    'analysis.prompt.md',
    'review-changes.prompt.md',
    'tests.prompt.md',
    'fix-and-test.prompt.md',
    'PR_DESCRIPTION_TEMPLATE.md',
  ];

  logger.info(`📋 Copying common templates: ${commonTemplates.join(', ')}`);
  logger.verbose(`📄 Copying templates from ${templatesDir}...`);

  // Copy each common template
  for (const templateFile of commonTemplates) {
    const sourcePath = path.join(templatesDir, templateFile);
    const destPath = path.join(paths.workspaceDir, templateFile);

    if (await fs.pathExists(sourcePath)) {
      await fileOps.copyFile(sourcePath, destPath, `template ${templateFile}`, isDryRun);
    } else {
      logger.warn(`⚠️  Template not found: ${templateFile}`);
    }
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
  const repoKeyFiles = generateRepoKeyFiles(paths.sourcePath, paths.workspaceDir);
  const sampleKeyFiles = paths.destinationPath
    ? generateSampleKeyFiles(paths.destinationPath, paths.workspaceDir)
    : '';

  const bugReportPath = primaryIssueId
    ? path.join(paths.workspaceDir, `BUGREPORT_${primaryIssueId}.md`)
    : path.join(paths.workspaceDir, 'WORKSPACE_INFO.md');

  return {
    '{{PROJECT_NAME}}': project.name || project.repo,
    '{{PROJECT_KEY}}': projectKey,
    '{{BRANCH_NAME}}': branchName,
    '{{WORKSPACE_DIR}}': paths.workspaceDir,
    '{{SDK_PATH}}': paths.sourcePath,
    '{{SAMPLE_PATH}}': paths.destinationPath || '',
    '{{GITHUB_DATA}}': githubDataFormatted,
    '{{SDK_KEY_FILES}}': repoKeyFiles,
    '{{SAMPLE_KEY_FILES}}': sampleKeyFiles,
    '{{BUGREPORT_FILE}}': path.basename(bugReportPath),
    '{{RELATED_ISSUES_PRS}}': 'No additional related issues or PRs provided via user input.',
    '{{ADDITIONAL_CONTEXT}}': additionalContextFormatted,
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
  const repoKeyFiles = generateMockRepoKeyFiles(project);
  const sampleKeyFiles = generateMockSampleKeyFiles(project);

  const bugReportPath = primaryIssueId
    ? path.join(paths.workspaceDir, `BUGREPORT_${primaryIssueId}.md`)
    : path.join(paths.workspaceDir, 'WORKSPACE_INFO.md');

  return {
    '{{PROJECT_NAME}}': project.name || project.repo,
    '{{PROJECT_KEY}}': projectKey,
    '{{BRANCH_NAME}}': branchName,
    '{{WORKSPACE_DIR}}': paths.workspaceDir,
    '{{SDK_PATH}}': `${paths.sourcePath} (not created in analysis mode)`,
    '{{SAMPLE_PATH}}': `${paths.destinationPath || 'N/A'} (not created in analysis mode)`,
    '{{GITHUB_DATA}}': githubDataFormatted,
    '{{SDK_KEY_FILES}}': repoKeyFiles,
    '{{SAMPLE_KEY_FILES}}': sampleKeyFiles,
    '{{BUGREPORT_FILE}}': path.basename(bugReportPath),
    '{{RELATED_ISSUES_PRS}}': 'No additional related issues or PRs provided via user input.',
    '{{ADDITIONAL_CONTEXT}}': additionalContextFormatted,
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
  _projectKey: string,
  _prIdStr: string,
  _options: { verbose?: boolean; dryRun?: boolean; analyse?: boolean },
): Promise<void> {
  // PR functionality is temporarily disabled while making the CLI stack-agnostic
  logger.error(
    'The PR initialization feature is temporarily disabled while making the CLI stack-agnostic.',
  );
  logger.info('This feature will be restored in a future version with generic project support.');
  logger.info('For now, please use the regular init command without PR arguments.');
  process.exit(1);
}

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new workspace with git worktrees for development')
    .argument(
      '<project_identifier>',
      'Project key or repo name (e.g., java/auth0-java, next/nextjs-auth0)',
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
    .addHelpText(
      'after',
      `
Examples:
  $ workspace init next feature/my-new-feature
    Initialize workspace for 'next' project using project key

  $ workspace init auth0-java feature/my-new-feature  
    Initialize workspace for 'java' project using repository name

  $ workspace init java 123 456 bugfix/issue-123
    Initialize workspace for java project for GitHub issues 123 & 456

  $ workspace init nextjs-auth0 --pr 789
    Initialize workspace using repo name for pull request #789 (uses global --pr option)

  $ workspace init spa feature/test --dry-run
    Preview what would be done without making changes

  $ workspace init node 123 feature/fix-bug --analyse
    Create analysis workspace for issue 123 without setting up git worktrees

Description:
  This command creates a new development workspace with git worktrees for both
  the main repository and optional sample repository. It sets up the necessary 
  directory structure, creates or switches to the specified branch, and generates 
  template files for development workflows.

  The command signature is: init <project_identifier> <...github_ids> <branch_name>
  where project_identifier can be either:
  - A project key from config.yaml (e.g., next, spa, node, java)
  - A repository name extracted from the repo URL (e.g., nextjs-auth0, auth0-spa-js)

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
        projectIdentifier: string,
        args: string[],
        options: { verbose?: boolean; dryRun?: boolean; analyse?: boolean; silent?: boolean },
      ) => {
        try {
          // Check if --pr option was used globally
          const globalOpts = program.opts();
          if (globalOpts.pr) {
            // Handle PR initialization - use new findProject method for better resolution
            const { projectKey } = configManager.findProject(projectIdentifier);
            return await handlePRInitialization(projectKey, globalOpts.pr, options);
          }

          // Ensure args are provided for normal init
          if (!args || args.length === 0) {
            throw new Error(
              'Branch name is required. Usage: init <project_identifier> <...github_ids> <branch_name>',
            );
          }

          // Find project by repo name or project key using improved resolution
          const { projectKey, project } = configManager.findProject(projectIdentifier);

          // Parse arguments using new signature
          const { issueIds, branchName } = parseRepoInitArguments(args);

          const isVerbose = options.verbose || options.dryRun;
          const isDryRun = options.dryRun || false;
          const isAnalyseMode = options.analyse || false;
          const isSilent = options.silent || false;

          if (isSilent) {
            logger.info('🔕 SILENT MODE: Skipping all user input prompts');
          }

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
          const paths = configManager.getWorkspacePaths(projectKey, workspaceName);

          logger.verbose(`📍 Project: ${project.name} (${projectKey})`);
          logger.verbose(`📍 Workspace directory: ${paths.workspaceDir}`);
          logger.verbose(`📍 Repository path: ${paths.sourcePath}`);
          logger.verbose(`📍 Sample repository path: ${paths.destinationPath || 'N/A'}`);

          // Initialize workspace (choose analysis or full mode)
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
            });
          }
        } catch (error) {
          handleError(error as Error, logger);
        }
      },
    );
}
