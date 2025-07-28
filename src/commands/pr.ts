import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/config.js';
import { 
  executeCommand, 
  executeGit, 
  fileOps,
  extractRelevantContent,
  createTestFileName,
  fetchComments 
} from '../utils/init-helpers.js';
import type { 
  ProjectConfig, 
  WorkspacePaths, 
  GitHubIssueData, 
  PlaceholderValues
} from '../types/index.js';

/**
 * Fetch PR data and extract branch information
 */
export async function fetchPRData(prId: number, project: ProjectConfig, isDryRun: boolean): Promise<{ data: GitHubIssueData, branchName: string }> {
  logger.verbose(`📊 Fetching PR data for #${prId}...`);
  
  // Extract just the repo name from the SDK repo path
  const sdkRepoName = path.basename(project.sdk_repo);
  const endpoint = `repos/${project.github_org}/${sdkRepoName}/pulls/${prId}`;
  
  try {
    const result = await executeCommand('gh', ['api', endpoint], { stdio: 'pipe' }, `fetch ${endpoint}`, isDryRun);
    let rawData: any;
    
    if (!isDryRun) {
      rawData = JSON.parse(result.stdout);
    } else {
      rawData = createMockPRData(prId);
    }
    
    const extractedData = extractRelevantContent(rawData);
    
    // Fetch comments for the PR
    logger.verbose(`📝 Fetching comments for PR #${prId}...`);
    extractedData.comments = await fetchComments(rawData.comments_url, prId, isDryRun);
    
    // Extract branch name from PR data
    const branchName = rawData.head?.ref || `pr-${prId}`;
    
    return {
      data: extractedData,
      branchName: branchName
    };
  } catch (error) {
    throw new Error(`Failed to fetch PR #${prId}: ${(error as Error).message}`);
  }
}

/**
 * Create mock PR data for dry run
 */
function createMockPRData(prId: number): any {
  return {
    number: prId,
    title: 'Example PR: Add new session refresh mechanism',
    body: 'Dry run data - this would contain the actual PR body with detailed description',
    state: 'open',
    html_url: `https://github.com/auth0/repo/pull/${prId}`,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    comments_url: `https://api.github.com/repos/auth0/repo/issues/${prId}/comments`,
    pull_request: {},
    head: {
      ref: `feature/pr-${prId}-branch`,
      sha: 'abc123def456'
    },
    base: {
      ref: 'main'
    },
    labels: [{ name: 'enhancement' }, { name: 'feature' }],
    assignees: [{ login: 'example-user' }]
  };
}

/**
 * Get the default branch for a repository
 */
async function getDefaultBranch(repoPath: string, isDryRun: boolean): Promise<string> {
  if (isDryRun) {
    return 'main'; // Default for dry run
  }
  
  try {
    // Try to get the default branch from remote
    const result = await executeGit(['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoPath }, 'get default branch', false);
    const defaultRef = result.stdout.trim();
    const branchName = defaultRef.replace('refs/remotes/origin/', '');
    return branchName;
  } catch {
    // Fallback: check if main or master exists
    try {
      await executeGit(['show-ref', '--verify', '--quiet', 'refs/heads/main'], { cwd: repoPath }, 'check main branch', false);
      return 'main';
    } catch {
      try {
        await executeGit(['show-ref', '--verify', '--quiet', 'refs/heads/master'], { cwd: repoPath }, 'check master branch', false);
        return 'master';
      } catch {
        return 'main'; // Final fallback
      }
    }
  }
}

/**
 * Setup git worktrees for PR branch
 */
async function setupPRWorktrees(project: ProjectConfig, paths: WorkspacePaths, branchName: string, isDryRun: boolean): Promise<void> {
  const addWorktree = async (repoDir: string, worktreePath: string, targetBranch: string): Promise<void> => {
    if (!isDryRun && fs.existsSync(worktreePath)) {
      await fileOps.removeFile(worktreePath, `stale worktree directory: ${worktreePath}`, isDryRun);
    }
    
    try {
      await executeGit(['worktree', 'prune'], { cwd: repoDir }, `prune worktrees in ${repoDir}`, isDryRun);
    } catch {
      // Ignore prune failures
    }
    
    // For PR branch in SDK, we need to fetch it first if it doesn't exist locally
    if (repoDir === paths.sdkRepoPath) {
      try {
        await executeGit(['fetch', 'origin', `${targetBranch}:${targetBranch}`], { cwd: repoDir }, `fetch PR branch ${targetBranch}`, isDryRun);
      } catch {
        // Branch might already exist locally or fetch might fail, continue
      }
    }
    
    try {
      await executeGit(['worktree', 'add', worktreePath, '-b', targetBranch, 'main'], { cwd: repoDir }, `create new worktree with branch ${targetBranch}`, isDryRun);
    } catch {
      try {
        await executeGit(['worktree', 'add', worktreePath, targetBranch], { cwd: repoDir }, `add existing branch ${targetBranch} to worktree`, isDryRun);
      } catch {
        await executeGit(['worktree', 'add', '-f', worktreePath, targetBranch], { cwd: repoDir }, `force add branch ${targetBranch} to worktree`, isDryRun);
      }
    }
  };

  logger.verbose('🔀 Setting up SDK worktree for PR branch...');
  await addWorktree(paths.sdkRepoPath, paths.sdkPath, branchName);
  
  logger.verbose('🔀 Setting up samples worktree...');
  // For samples, use the default branch since PR branches typically don't exist in sample repos
  const defaultBranch = await getDefaultBranch(paths.sampleRepoPath, isDryRun);
  await addWorktree(paths.sampleRepoPath, paths.samplesPath, defaultBranch);
  
  logger.success('Git worktrees ready for PR');
}

/**
 * Setup environment and install dependencies for PR
 */
async function setupPREnvironmentAndDependencies(project: ProjectConfig, projectKey: string, paths: WorkspacePaths, isDryRun: boolean): Promise<void> {
  // Copy environment file
  const envFilePath = configManager.getEnvFilePath(projectKey);
  if (!isDryRun && envFilePath && fs.existsSync(envFilePath)) {
    logger.verbose(`🔑 Copying environment variables from ${envFilePath}...`);
    await fileOps.copyFile(envFilePath, path.join(paths.sampleAppPath, '.env.local'), `environment file from ${envFilePath} to sample app`, isDryRun);
  }

  const global = configManager.getGlobal();
  const packageManager = global.package_manager || 'pnpm';

  // Install SDK dependencies
  logger.verbose(`📦 Installing SDK dependencies (${packageManager})...`);
  await executeCommand(packageManager, ['install', '--prefer-offline', '--silent'], { cwd: paths.sdkPath, stdio: 'pipe' }, 'install SDK dependencies', isDryRun);
  
  // Try to publish SDK to yalc (optional step - don't fail if it doesn't work)
  logger.verbose('📤 Publishing SDK to yalc...');
  try {
    await executeCommand(packageManager, ['yalc', 'publish', '--silent'], { cwd: paths.sdkPath, stdio: 'pipe' }, 'publish SDK to yalc', isDryRun);
  } catch (error) {
    logger.warn(`⚠️  Failed to publish SDK to yalc: ${(error as Error).message}`);
    logger.warn('   This is optional - you can manually build and publish the SDK later if needed.');
  }

  // Install sample app dependencies
  logger.verbose(`📦 Installing sample app dependencies (${packageManager})...`);
  await executeCommand(packageManager, ['install', '--prefer-offline', '--silent'], { cwd: paths.sampleAppPath, stdio: 'pipe' }, 'install sample app dependencies', isDryRun);
  
  // Try to link SDK into sample app via yalc (optional step - only works if publish succeeded)
  logger.verbose('🔗 Linking SDK into sample app via yalc...');
  const packageName = `@auth0/${path.basename(project.sdk_repo)}`;
  try {
    await executeCommand(packageManager, ['yalc', 'add', packageName, '--silent'], { cwd: paths.sampleAppPath, stdio: 'pipe' }, 'link SDK into sample app', isDryRun);
  } catch (error) {
    logger.warn(`⚠️  Failed to link SDK into sample app: ${(error as Error).message}`);
    logger.warn('   This is optional - the workspace is still ready for development.');
  }
}

/**
 * Generate templates and documentation for PR
 */
async function generatePRTemplatesAndDocs(options: {
  project: ProjectConfig;
  projectKey: string;
  prId: number;
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  isDryRun: boolean;
}): Promise<void> {
  const {
    project,
    projectKey,
    prId,
    branchName,
    paths,
    githubData,
    isDryRun
  } = options;

  // Copy templates
  const templates = configManager.getTemplates();
  const templatesDir = templates.dir || path.join(configManager.getCliRoot(), 'src/templates');
  
  logger.verbose(`📄 Copying templates from ${templatesDir}...`);
  await fileOps.copyFile(templatesDir, paths.workspaceDir, `templates from ${templatesDir} to workspace`, isDryRun);

  // Generate placeholder values and update templates
  const placeholderValues = createPRPlaceholderValues({
    project,
    projectKey,
    prId,
    branchName,
    paths,
    githubData
  });

  if (!isDryRun) {
    const promptFiles = (await fs.readdir(paths.workspaceDir))
      .filter((f) => f.endsWith('.prompt.md'));

    logger.verbose(`📝 Updating ${promptFiles.length} prompt files with placeholders...`);
    for (const file of promptFiles) {
      const promptPath = path.join(paths.workspaceDir, file);
      let contents = await fs.readFile(promptPath, 'utf8');
      for (const [placeholder, value] of Object.entries(placeholderValues)) {
        contents = contents.split(placeholder).join(value);
      }
      await fileOps.writeFile(promptPath, contents, `prompt file ${file} with placeholders`, isDryRun);
    }
  }

  // Generate PR info file
  await generatePRInfoFile({
    prId,
    branchName,
    paths,
    githubData,
    isDryRun
  });
}

/**
 * Create placeholder values for PR template substitution
 */
function createPRPlaceholderValues({
  project,
  projectKey,
  prId,
  branchName,
  paths,
  githubData
}: {
  project: ProjectConfig;
  projectKey: string;
  prId: number;
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
}): PlaceholderValues {
  const testFileName = createTestFileName(githubData);
  
  // Format GitHub data
  const githubDataFormatted = githubData.length > 0 
    ? formatGitHubData(githubData)
    : 'No GitHub data available.';

  // Generate key files lists
  const sdkKeyFiles = generateSdkKeyFiles(paths.sdkPath, paths.workspaceDir);
  const sampleKeyFiles = generateSampleKeyFiles(paths.samplesPath, paths.workspaceDir);

  const prInfoPath = path.join(paths.workspaceDir, `PR_INFO_${prId}.md`);

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
    '{{BUGREPORT_FILE}}': path.basename(prInfoPath),
    '{{RELATED_ISSUES_PRS}}': `This workspace was created for PR #${prId}.`,
    '{{ADDITIONAL_CONTEXT}}': `PR Branch: ${branchName}`,
    '{{TEST_FILE_NAME}}': testFileName
  };
}

/**
 * Format GitHub data for templates
 */
function formatGitHubData(githubData: GitHubIssueData[]): string {
  return githubData.map(item => {
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
    
    if (item.links.length > 0) {
      const linkList = item.links.map(link => `- ${link}`).join('\n');
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
  }).join('\n---\n\n');
}

/**
 * Generate SDK key files list
 */
function generateSdkKeyFiles(sdkPath: string, workspaceDir: string): string {
  const commonFiles = ['src/server/auth-client.ts', 'src/server/client.ts', 'src/server/cookies.ts', 'src/index.ts'];
  return commonFiles
    .filter((rel) => fs.existsSync(path.join(sdkPath, rel)))
    .map((rel) => `- ${path.basename(sdkPath)}/${rel}`)
    .join('\n') || '- No key files found';
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
        } else if (targetFiles.some(target => entry === target || fp.endsWith(target))) {
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
 * Generate PR info file
 */
async function generatePRInfoFile(options: {
  prId: number;
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  isDryRun: boolean;
}): Promise<void> {
  const { prId, branchName, paths, githubData, isDryRun } = options;

  const prInfoPath = path.join(paths.workspaceDir, `PR_INFO_${prId}.md`);

  if (!isDryRun && !fs.existsSync(prInfoPath)) {
    const githubDataFormatted = formatGitHubData(githubData);

    const fileContent = `# PR Info for #${prId}

*This workspace was created for Pull Request #${prId}.*

## PR Details

${githubDataFormatted}

## Branch Information

- **PR Branch**: ${branchName}
- **Workspace SDK Path**: ${paths.sdkPath}
- **Workspace Samples Path**: ${paths.samplesPath}

## Notes

Use this workspace to review, test, or contribute to the pull request.

`;
    await fileOps.writeFile(prInfoPath, fileContent, `PR info for #${prId}`, isDryRun);
  }
}

/**
 * Initialize workspace for a PR
 */
export async function initializePRWorkspace(options: {
  project: ProjectConfig;
  projectKey: string;
  prId: number;
  branchName: string;
  workspaceName: string;
  paths: WorkspacePaths;
  isDryRun: boolean;
}): Promise<void> {
  const { project, projectKey, prId, branchName, paths, isDryRun } = options;

  // Check if workspace already exists
  if (!isDryRun && fs.existsSync(paths.workspaceDir) && (await fs.readdir(paths.workspaceDir)).length > 0) {
    logger.info('➡️  Workspace already exists, continuing...');
  }
  
  // Create workspace directories
  logger.step(1, 5, 'Creating workspace directories...');
  await fileOps.ensureDir(paths.workspaceDir, `workspace directory: ${paths.workspaceDir}`, isDryRun);

  // Setup git worktrees for PR
  logger.step(2, 5, 'Setting up git worktrees for PR...');
  await setupPRWorktrees(project, paths, branchName, isDryRun);

  // Fetch PR data
  logger.step(3, 5, 'Fetching PR data...');
  const { data: prData } = await fetchPRData(prId, project, isDryRun);

  // Setup environment and dependencies
  logger.step(4, 5, 'Setting up environment and dependencies...');
  await setupPREnvironmentAndDependencies(project, projectKey, paths, isDryRun);

  // Generate templates and documentation
  logger.step(5, 5, 'Generating templates and documentation...');
  await generatePRTemplatesAndDocs({
    project,
    projectKey,
    prId,
    branchName,
    paths,
    githubData: [prData],
    isDryRun
  });

  logger.success(`${project.name} workspace created for PR #${prId}`);
  logger.info(`Workspace location: ${paths.workspaceDir}`);
  logger.info(`PR branch: ${branchName}`);
  
  if (isDryRun) {
    logger.info('🧪 DRY-RUN COMPLETE: No actual changes were made');
  }
}


