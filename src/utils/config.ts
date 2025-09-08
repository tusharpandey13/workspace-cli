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
  private config: Config | null = null;
  private configPath: string | null = null;

  /**
   * Load configuration from file
   */
  async loadConfig(customConfigPath: string | null = null): Promise<Config> {
    const configPaths = [
      customConfigPath,
      path.join(os.homedir(), '.workspace-config.yaml'),
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

    // Resolve global.src_dir
    if (this.config.global?.src_dir?.startsWith('~')) {
      this.config.global.src_dir = this.config.global.src_dir.replace('~', os.homedir());
    }

    // Resolve env_files_dir
    if (this.config.global?.env_files_dir?.startsWith('./')) {
      this.config.global.env_files_dir = path.resolve(configDir, this.config.global.env_files_dir);
    }

    // Resolve templates directory
    if (this.config.templates?.dir?.startsWith('./')) {
      this.config.templates.dir = path.resolve(this.getCliRoot(), this.config.templates.dir);
    }

    // Resolve project sdk_repo paths
    if (this.config.projects) {
      for (const projectKey in this.config.projects) {
        const project = this.config.projects[projectKey];
        if (project.sdk_repo?.startsWith('~')) {
          project.sdk_repo = project.sdk_repo.replace('~', os.homedir());
        }
      }
    }
  }

  /**
   * Get project configuration by key
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
   * Validate project configuration
   */
  validateProject(projectKey: string): ProjectConfig {
    const project = this.getProject(projectKey);

    if (!project.name || !project.sdk_repo || !project.sample_repo || !project.github_org) {
      throw new ValidationError(`Project '${projectKey}' has incomplete configuration`);
    }

    return project;
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

    // Extract just the repo name from the SDK repo path for the worktree directory
    const sdkRepoName = path.basename(project.sdk_repo);

    // Handle sample repo - if it's a URL, extract repo name; if it's a path, use basename
    let sampleRepoName: string;
    let sampleRepoPath: string;

    if (project.sample_repo.startsWith('http')) {
      // It's a Git URL - extract repo name without .git extension
      sampleRepoName = path.basename(project.sample_repo, '.git');
      // For spa project, use the absolute sample_app_path as the repo path
      sampleRepoPath = project.sample_app_path || path.join(srcDir, sampleRepoName);
    } else {
      // It's a directory path
      sampleRepoName = path.basename(project.sample_repo);
      sampleRepoPath = path.join(srcDir, project.sample_repo);
    }

    const sdkPath = path.join(workspaceDir, sdkRepoName);
    const samplesPath = path.join(workspaceDir, sampleRepoName);

    // Handle sample app path - for HTTP repos, use the samplesPath directly
    let sampleAppPath: string;
    if (project.sample_app_path) {
      if (project.sample_repo.startsWith('http')) {
        sampleAppPath = samplesPath;
      } else {
        sampleAppPath = path.join(samplesPath, project.sample_app_path);
      }
    } else {
      sampleAppPath = samplesPath;
    }

    return {
      srcDir,
      baseDir,
      workspaceDir,
      sdkPath,
      samplesPath,
      sampleAppPath,
      sdkRepoPath: project.sdk_repo, // Use the full resolved path for the source repo
      sampleRepoPath,
    };
  }
}

// Global instance
export const configManager = new ConfigManager();
