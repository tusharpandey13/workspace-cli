export interface ProjectConfig {
  key: string;
  name: string;
  sdk_repo: string;
  sample_repo: string;
  github_org: string;
  sample_app_path?: string;
  env_file?: string;
}

export interface GlobalConfig {
  src_dir?: string;
  workspace_base?: string;
  package_manager?: string;
  github_cli?: string;
  env_files_dir?: string;
}

export interface TemplatesConfig {
  dir?: string;
  common?: string[];
}

export interface Config {
  projects?: Record<string, Omit<ProjectConfig, 'key'>>;
  global?: GlobalConfig;
  templates?: TemplatesConfig;
  workflows?: WorkflowsConfig;
}

export interface WorkspacePaths {
  srcDir: string;
  baseDir: string;
  workspaceDir: string;
  sdkPath: string;
  samplesPath: string;
  sampleAppPath: string;
  sdkRepoPath: string;
  sampleRepoPath: string;
}

export interface GitHubIssueData {
  id: number;
  title: string;
  body: string;
  state: string;
  type: 'issue' | 'pull_request';
  url: string;
  created_at: string;
  updated_at: string;
  labels: string[];
  assignees: string[];
  milestone?: string | null;
  comments_url?: string;
  links?: string[];
  comments: GitHubComment[];
  linkedIssues: LinkedIssue[];
  fileChanges: FileChange[];
  additionalContext: UrlContent[];
}

export interface GitHubComment {
  author: string;
  created_at: string;
  body: string;
  links: string[];
}

export interface LinkedIssue {
  id: number;
  title: string;
  url: string;
}

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

export interface UrlContent {
  url: string;
  title: string;
  content: string;
  domain: string;
}

export interface PlaceholderValues {
  '{{PROJECT_NAME}}': string;
  '{{PROJECT_KEY}}': string;
  '{{BRANCH_NAME}}': string;
  '{{WORKSPACE_DIR}}': string;
  '{{SDK_PATH}}': string;
  '{{SAMPLE_PATH}}': string;
  '{{GITHUB_DATA}}': string;
  '{{SDK_KEY_FILES}}': string;
  '{{SAMPLE_KEY_FILES}}': string;
  '{{BUGREPORT_FILE}}': string;
  '{{RELATED_ISSUES_PRS}}': string;
  '{{ADDITIONAL_CONTEXT}}': string;
  '{{TEST_FILE_NAME}}': string;
}

export interface InitializeWorkspaceOptions {
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

export interface SetupEnvironmentOptions {
  project: ProjectConfig;
  projectKey: string;
  paths: WorkspacePaths;
  isDryRun: boolean;
}

export interface GenerateTemplatesOptions {
  project: ProjectConfig;
  projectKey: string;
  issueIds: number[];
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  additionalContext: string[];
  isDryRun: boolean;
}

export interface GenerateWorkspaceInfoOptions {
  issueIds: number[];
  branchName: string;
  paths: WorkspacePaths;
  githubData: GitHubIssueData[];
  additionalContext: string[];
  isDryRun: boolean;
}

/**
 * Workflow types for intelligent prompt selection
 */
export type WorkflowType = 'issue-fix' | 'feature-development' | 'maintenance' | 'exploration';

export interface WorkflowConfig {
  prompts: string[];
  description?: string;
}

export interface WorkflowsConfig {
  [key: string]: WorkflowConfig;
}

export interface PromptSelectionResult {
  workflowType: WorkflowType;
  selectedPrompts: string[];
  detectionReason: string;
}
