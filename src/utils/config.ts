import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { ValidationError, FileSystemError } from './errors.js';
import { logger } from './logger.js';
import type {
  Config,
  ProjectConfig,
  GlobalConfig,
  TemplatesConfig,
  WorkspacePaths,
  WorkflowsConfig,
} from '../types/index.js';

/**
 * Configuration manager for workspace CLI
 */
export class ConfigManager {
  public config: Config | null = null;
  private configPath: string | null = null;

  /**
   * Load configuration from file
   */
  async loadConfig(customConfigPath: string | null = null): Promise<Config> {
    const configPaths = [
      customConfigPath,
      path.join(os.homedir(), '.space-config.yaml'),
      path.join(os.homedir(), '.workspace-config.yaml'), // backwards compatibility
      path.join(process.cwd(), 'config.yaml'),
      path.join(this.getCliRoot(), 'config.yaml'),
    ].filter(Boolean) as string[];

    for (const configPath of configPaths) {
      if (await fs.pathExists(configPath)) {
        this.configPath = configPath;
        break;
      }
    }

    if (!this.configPath) {
      throw new FileSystemError('Configuration file not found. Checked: ' + configPaths.join(', '));
    }

    try {
      const yaml = await import('js-yaml');
      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = yaml.load(configContent) as Config;

      // Resolve relative paths
      this.resolveConfigPaths();

      logger.debug(`Loaded configuration from: ${this.configPath}`);
      return this.config;
    } catch (error) {
      throw new FileSystemError(
        `Failed to load configuration: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Get CLI installation root directory
   */
  getCliRoot(): string {
    const currentFile = fileURLToPath(import.meta.url);
    return path.resolve(path.dirname(currentFile), '../..');
  }

  /**
   * Resolve relative paths in configuration
   */
  resolveConfigPaths(): void {
    if (!this.config || !this.configPath) return;

    const configDir = path.dirname(this.configPath);

    // Resolve global.src_dir first as other paths depend on it
    if (this.config.global?.src_dir?.startsWith('~')) {
      this.config.global.src_dir = this.config.global.src_dir.replace('~', os.homedir());
    } else if (!this.config.global?.src_dir) {
      // Default src_dir if not specified
      this.config.global = this.config.global || {};
      this.config.global.src_dir = path.join(os.homedir(), 'src');
    }

    const srcDir = this.config.global.src_dir;

    // Resolve env_files_dir
    if (this.config.global?.env_files_dir?.startsWith('./')) {
      this.config.global.env_files_dir = path.resolve(configDir, this.config.global.env_files_dir);
    }

    // Resolve templates directory
    if (this.config.templates?.dir?.startsWith('./')) {
      this.config.templates.dir = path.resolve(this.getCliRoot(), this.config.templates.dir);
    }

    // Resolve project repository paths
    if (this.config.projects) {
      for (const projectKey in this.config.projects) {
        const project = this.config.projects[projectKey];

        // Resolve repo path
        if (project.repo) {
          if (project.repo.startsWith('~')) {
            project.repo = project.repo.replace('~', os.homedir());
          } else if (!path.isAbsolute(project.repo) && !project.repo.startsWith('http')) {
            // Resolve relative paths relative to src_dir
            project.repo = path.resolve(srcDir, project.repo);
          }
        }

        // Resolve sample_repo path if it's a local path (not HTTP URL)
        if (project.sample_repo && !project.sample_repo.startsWith('http')) {
          if (project.sample_repo.startsWith('~')) {
            project.sample_repo = project.sample_repo.replace('~', os.homedir());
          } else if (!path.isAbsolute(project.sample_repo)) {
            // Resolve relative paths relative to src_dir
            project.sample_repo = path.resolve(srcDir, project.sample_repo);
          }
        }
      }
    }
  }

  /**
   * Get project configuration by key with repository validation
   */
  getProject(projectKey: string): ProjectConfig {
    if (!this.config) {
      throw new ValidationError('Configuration not loaded');
    }

    const project = this.config.projects?.[projectKey];
    if (!project) {
      const availableProjects = Object.keys(this.config.projects || {});
      throw new ValidationError(
        `Unknown project '${projectKey}'. Available projects: ${availableProjects.join(', ')}`,
      );
    }

    return {
      key: projectKey,
      ...project,
    };
  }

  /**
   * Validate project configuration and repository paths
   */
  validateProject(projectKey: string): ProjectConfig {
    const project = this.getProject(projectKey);

    // Validate required fields
    if (!project.name || !project.repo) {
      throw new ValidationError(
        `Project '${projectKey}' has incomplete configuration - name and repo are required`,
      );
    }

    // Validate main repository exists (only for local paths, skip HTTP URLs)
    if (project.repo && !project.repo.startsWith('http')) {
      if (!fs.existsSync(project.repo)) {
        throw new ValidationError(
          `Repository does not exist: ${project.repo}\n` +
            `Please ensure the repository exists or update the 'repo' path in config.yaml.\n` +
            `Current configuration: projects.${projectKey}.repo = "${project.repo}"\n` +
            `Suggestions:\n` +
            `  1. Clone the repository to the specified path\n` +
            `  2. Update config with correct path: repo: "~/src/${path.basename(project.repo)}"\n` +
            `  3. Use absolute path: repo: "/full/path/to/${path.basename(project.repo)}"`,
        );
      }
    }

    // Validate sample repository exists if configured (only for local paths, skip HTTP URLs)
    if (project.sample_repo && !project.sample_repo.startsWith('http')) {
      if (!fs.existsSync(project.sample_repo)) {
        logger.warn(
          `Sample repository does not exist: ${project.sample_repo}\n` +
            `This may cause sample app setup to fail. Consider cloning the repository first.`,
        );
      }
    }

    return project;
  }

  /**
   * Get global configuration
   */
  getGlobal(): GlobalConfig {
    if (!this.config) {
      throw new ValidationError('Configuration not loaded');
    }

    return this.config.global || {};
  }

  /**
   * Get templates configuration
   */
  getTemplates(): TemplatesConfig {
    if (!this.config) {
      throw new ValidationError('Configuration not loaded');
    }

    return this.config.templates || {};
  }

  /**
   * Get workflows configuration
   */
  getWorkflows(): WorkflowsConfig {
    if (!this.config) {
      throw new ValidationError('Configuration not loaded');
    }

    return this.config.workflows || {};
  }

  /**
   * List all available projects
   */
  listProjects(): string[] {
    if (!this.config) {
      throw new ValidationError('Configuration not loaded');
    }

    return Object.keys(this.config.projects || {});
  }

  /**
   * Get all projects as an object
   */
  getAllProjectsData(): Record<string, any> {
    if (!this.config) {
      throw new ValidationError('Configuration not loaded');
    }

    return this.config.projects || {};
  }

  /**
   * Get environment file path for a project
   */
  getEnvFilePath(projectKey: string): string | null {
    const project = this.getProject(projectKey);
    const global = this.getGlobal();

    if (!project.env_file) {
      return null;
    }

    const envFilesDir = global.env_files_dir || path.join(this.getCliRoot(), 'env-files');
    return path.join(envFilesDir, project.env_file);
  }

  /**
   * Get base directory path where all workspaces for a project are stored
   */
  getProjectBaseDir(projectKey: string): string {
    const project = this.validateProject(projectKey);
    const global = this.getGlobal();

    const srcDir = global.src_dir || path.join(os.homedir(), 'src');
    const workspaceBase = global.workspace_base || 'workspaces';

    return path.join(srcDir, workspaceBase, project.key);
  }

  /**
   * Get workspace paths for a project
   */
  getWorkspacePaths(projectKey: string, workspaceName: string): WorkspacePaths {
    const project = this.validateProject(projectKey);
    const global = this.getGlobal();

    const srcDir = global.src_dir || path.join(os.homedir(), 'src');
    const workspaceBase = global.workspace_base || 'workspaces';

    const baseDir = path.join(srcDir, workspaceBase, project.key);
    const workspaceDir = path.join(baseDir, workspaceName);

    // Determine source repository path
    let sourceRepoPath: string;
    if (project.repo.startsWith('http')) {
      // It's a Git URL - extract repo name and assume it's in srcDir
      const repoName = path.basename(project.repo, '.git');
      sourceRepoPath = path.join(srcDir, repoName);
    } else if (path.isAbsolute(project.repo)) {
      // Already absolute path
      sourceRepoPath = project.repo;
    } else {
      // Relative path, resolve relative to srcDir
      sourceRepoPath = path.join(srcDir, project.repo);
    }

    // Extract repo name for workspace directory
    const repoName = path.basename(sourceRepoPath);
    const sourcePath = path.join(workspaceDir, repoName);

    // Handle sample repo if configured
    let destinationRepoPath: string | undefined;
    let destinationPath: string | undefined;

    if (project.sample_repo) {
      if (project.sample_repo.startsWith('http')) {
        // It's a Git URL - extract repo name without .git extension
        const sampleRepoName = path.basename(project.sample_repo, '.git');
        destinationRepoPath = path.join(srcDir, sampleRepoName);
        destinationPath = path.join(workspaceDir, sampleRepoName);
      } else if (path.isAbsolute(project.sample_repo)) {
        // Already resolved to absolute path
        destinationRepoPath = project.sample_repo;
        destinationPath = path.join(workspaceDir, path.basename(project.sample_repo));
      } else {
        // Still relative, resolve it
        destinationRepoPath = path.join(srcDir, project.sample_repo);
        destinationPath = path.join(workspaceDir, path.basename(project.sample_repo));
      }
    }

    const result: WorkspacePaths = {
      srcDir,
      baseDir,
      workspaceDir,
      sourceRepoPath,
      sourcePath,
    };

    if (destinationRepoPath && destinationPath) {
      result.destinationRepoPath = destinationRepoPath;
      result.destinationPath = destinationPath;
    }

    return result;
  }

  /**
   * Find project by project key or repository name
   * Supports both config.yaml project keys (e.g., 'java', 'next') and
   * extracted repository names (e.g., 'auth0-java', 'nextjs-auth0')
   */
  findProject(identifier: string): { projectKey: string; project: ProjectConfig } {
    if (!this.config || !this.config.projects) {
      throw new ValidationError('Configuration not loaded');
    }

    // First, try to find by project key (exact match, then case-insensitive)
    if (this.config.projects[identifier]) {
      const project = { key: identifier, ...this.config.projects[identifier] };
      return { projectKey: identifier, project };
    }

    // Case-insensitive project key search
    for (const [projectKey, projectData] of Object.entries(this.config.projects)) {
      if (projectKey.toLowerCase() === identifier.toLowerCase()) {
        const project = { key: projectKey, ...projectData };
        return { projectKey, project };
      }
    }

    // Second, try to find by repository name (extracted from repo URL/path)
    for (const [projectKey, projectData] of Object.entries(this.config.projects)) {
      const projectRepoName = path.basename(projectData.repo, '.git');
      if (projectRepoName.toLowerCase() === identifier.toLowerCase()) {
        const project = { key: projectKey, ...projectData };
        return { projectKey, project };
      }
    }

    // Generate helpful error message with both project keys and repo names
    const projectKeys = Object.keys(this.config.projects);
    const repoNames = Object.values(this.config.projects).map((proj) =>
      path.basename(proj.repo, '.git'),
    );

    throw new ValidationError(
      `No project found with identifier: ${identifier}. ` +
        `Available project keys: ${projectKeys.join(', ')}. ` +
        `Available repo names: ${repoNames.join(', ')}`,
    );
  }
}

// Global instance
export const configManager = new ConfigManager();
