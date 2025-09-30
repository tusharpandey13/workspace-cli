/**
 * Tech stack detection and gitignore management for sample repositories
 */

import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';
import { configManager } from './config.js';
import type { ProjectConfig } from '../types/index.js';

/**
 * Supported tech stacks for gitignore generation
 */
export type TechStack = 'node' | 'java' | 'python' | 'generic';

/**
 * Detect tech stack based on project configuration and repository content
 */
export function detectTechStack(project: ProjectConfig, sampleRepoPath?: string): TechStack {
  // First, try to detect from project configuration/name patterns
  const projectName = project.name.toLowerCase();
  const repoUrl = project.sample_repo?.toLowerCase() || '';

  // Node.js detection
  if (
    projectName.includes('node') ||
    projectName.includes('next') ||
    projectName.includes('react') ||
    projectName.includes('vue') ||
    projectName.includes('angular') ||
    projectName.includes('spa') ||
    repoUrl.includes('node') ||
    repoUrl.includes('next') ||
    repoUrl.includes('react') ||
    repoUrl.includes('vue') ||
    repoUrl.includes('angular') ||
    repoUrl.includes('spa')
  ) {
    return 'node';
  }

  // Java detection
  if (
    projectName.includes('java') ||
    projectName.includes('spring') ||
    repoUrl.includes('java') ||
    repoUrl.includes('spring')
  ) {
    return 'java';
  }

  // Python detection
  if (
    projectName.includes('python') ||
    projectName.includes('django') ||
    projectName.includes('flask') ||
    repoUrl.includes('python') ||
    repoUrl.includes('django') ||
    repoUrl.includes('flask')
  ) {
    return 'python';
  }

  // If sample repo path is available, scan for tech stack indicators
  if (sampleRepoPath && fs.existsSync(sampleRepoPath)) {
    try {
      // Check for package.json (Node.js)
      if (fs.existsSync(path.join(sampleRepoPath, 'package.json'))) {
        return 'node';
      }

      // Check for pom.xml or build.gradle (Java)
      if (
        fs.existsSync(path.join(sampleRepoPath, 'pom.xml')) ||
        fs.existsSync(path.join(sampleRepoPath, 'build.gradle')) ||
        fs.existsSync(path.join(sampleRepoPath, 'build.gradle.kts'))
      ) {
        return 'java';
      }

      // Check for requirements.txt or setup.py (Python)
      if (
        fs.existsSync(path.join(sampleRepoPath, 'requirements.txt')) ||
        fs.existsSync(path.join(sampleRepoPath, 'setup.py')) ||
        fs.existsSync(path.join(sampleRepoPath, 'pyproject.toml'))
      ) {
        return 'python';
      }
    } catch (error) {
      logger.verbose(`Error scanning sample repo for tech stack: ${(error as Error).message}`);
    }
  }

  // Default to generic if no specific tech stack detected
  return 'generic';
}

/**
 * Get the appropriate gitignore template content for a tech stack
 */
export async function getGitignoreTemplate(techStack: TechStack): Promise<string> {
  const templatesConfig = configManager.getTemplates();
  const templatesDir =
    templatesConfig.dir || path.join(configManager.getCliRoot(), 'src/templates');
  const gitignoreDir = path.join(templatesDir, 'gitignore');

  const templatePath = path.join(gitignoreDir, `${techStack}.gitignore`);

  if (await fs.pathExists(templatePath)) {
    return await fs.readFile(templatePath, 'utf8');
  } else {
    logger.warn(`Gitignore template not found for tech stack: ${techStack}, using generic`);

    // Fallback to generic template
    const genericPath = path.join(gitignoreDir, 'generic.gitignore');
    if (await fs.pathExists(genericPath)) {
      return await fs.readFile(genericPath, 'utf8');
    } else {
      // Last resort: return basic patterns
      return `# Basic gitignore patterns
# Added by space-cli for sample repository

.DS_Store
.env
*.log
dist/
build/
node_modules/
*.tmp
`;
    }
  }
}

/**
 * Apply gitignore patterns to a sample repository
 */
export async function setupSampleRepoGitignore(
  sampleRepoPath: string,
  project: ProjectConfig,
  isDryRun: boolean = false,
): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would set up gitignore for sample repo at: ${sampleRepoPath}`);
    return;
  }

  try {
    // Detect tech stack
    const techStack = detectTechStack(project, sampleRepoPath);
    logger.verbose(`Detected tech stack for sample repo: ${techStack}`);

    // Get gitignore template content
    const gitignoreContent = await getGitignoreTemplate(techStack);

    // Path to .gitignore in sample repository
    const gitignorePath = path.join(sampleRepoPath, '.gitignore');

    // Check if .gitignore already exists
    let existingContent = '';
    if (await fs.pathExists(gitignorePath)) {
      existingContent = await fs.readFile(gitignorePath, 'utf8');

      // Check if our patterns are already present
      if (existingContent.includes('Added by space-cli for sample repository')) {
        logger.verbose('Sample repo gitignore patterns already applied, skipping');
        return;
      }
    }

    // Combine existing content with new patterns
    const separator = existingContent ? '\n\n' : '';
    const updatedContent = existingContent + separator + gitignoreContent;

    // Write updated gitignore
    await fs.writeFile(gitignorePath, updatedContent, 'utf8');

    logger.verbose(`✅ Applied ${techStack} gitignore patterns to sample repository`);
  } catch (error) {
    logger.warn(`Failed to set up gitignore for sample repo: ${(error as Error).message}`);
  }
}
