# Workspace CLI - Copilot Instructions

## Project Overview

This is a **stack-agnostic MVP workspace CLI** designed for efficient multi-repository development with git worktrees. The CLI has been transformed from a JavaScript/TypeScript-coupled system to a simple, universal tool that works with any technology stack.

### Core Command Signature

```bash
workspace init <repo_name> <...github_ids> prefix/branch_name
```

## Architecture & Design Principles

### Stack-Agnostic Design

- **No technology assumptions**: Works with Java, Python, Go, Rust, etc.
- **Minimal setup**: Only creates git worktrees and copies universal prompt templates
- **Optional post-init**: Technology-specific setup (npm install, gradle build) only if explicitly configured

### Repository Name Matching Logic

**CRITICAL**: The CLI uses `path.basename()` to extract repository names from git URLs/paths:

- Config: `repo: "https://github.com/user/my-awesome-project.git"`
- CLI lookup: `workspace init my-awesome-project ...`
- Match: `path.basename("...my-awesome-project.git", ".git")` → `"my-awesome-project"`

### Configuration Structure

```yaml
projects:
  next: # Project key (internal reference)
    name: 'Auth0 Next.js SDK' # Human-readable name
    repo: 'https://github.com/auth0/nextjs-auth0.git' # SDK repository
    sample_repo: 'https://github.com/auth0/nextjs-auth0-example.git' # Optional
    env_file: 'next.env.local' # Optional environment file
    post-init: 'npm install' # Optional post-setup command

global:
  src_dir: '~/src' # Base directory for repositories
  workspace_base: 'workspaces' # Workspace subdirectory name
  env_files_dir: './env-files' # Environment files location
```

## Key Lessons Learned

### 1. Repository Name Extraction is Critical

**Problem**: Tests were failing because they expected project "test" but `DummyRepoManager` created "test-sdk"
**Root Cause**: `findProjectByRepoName()` uses `path.basename(repo, '.git')` to extract names
**Solution**: Ensure test repositories match the expected naming convention

```typescript
// This function is central to project resolution
function findProjectByRepoName(repoName: string) {
  const projectRepoName = path.basename(projectData.repo, '.git');
  if (projectRepoName.toLowerCase() === repoName.toLowerCase()) {
    return { projectKey, project };
  }
}
```

### 2. Test Infrastructure Requires Consistent Naming

**Best Practice**: When creating test environments, the repository names must match CLI expectations

- Use `createTestEnvironment('test')` for tests expecting project name "test"
- Use `createTestEnvironment('test-sdk')` for tests expecting "test-sdk"
- Consolidated method signature: `createTestEnvironment(projectName = 'test-sdk')`

### 3. Stack-Agnostic Template Generation

Templates now use universal placeholders:

- `{{SOURCE_PATH}}` - SDK repository worktree path
- `{{DESTINATION_PATH}}` - Sample app worktree path (if applicable)
- `{{PROJECT_NAME}}` - Human-readable project name
- `{{BRANCH_NAME}}` - Current branch being worked on
- `{{GITHUB_DATA}}` - Fetched GitHub issue/PR data

### 4. Workflow Detection Remains Universal

The CLI detects workflows based on:

- **Branch name patterns**: `bugfix/*`, `feature/*`, `hotfix/*`, `explore/*`
- **GitHub labels**: `bug`, `enhancement`, `documentation`
- **Issue/PR content**: Keywords indicating the type of work

## Common Patterns & Best Practices

### Project Configuration

```yaml
# Minimal configuration - just git repositories
my-python-api:
  name: 'Python API'
  repo: 'https://github.com/org/python-api.git'

# Full configuration with samples and post-init
next:
  name: 'Auth0 Next.js SDK'
  repo: 'https://github.com/auth0/nextjs-auth0.git'
  sample_repo: 'https://github.com/auth0/nextjs-auth0-example.git'
  env_file: 'next.env.local'
  post-init: 'npm install && npm run build'
```

### Command Usage Examples

```bash
# Simple SDK-only workspace
workspace init my-python-api 1234 feature/add-auth

# Full workspace with sample app
workspace init next 1234 5678 bugfix/token-refresh

# Analysis-only workspace (no GitHub issues)
workspace init go-sdk feature/performance-optimization
```

### Testing Considerations

```typescript
// When creating test environments, be explicit about naming
describe('CLI Tests', () => {
  beforeEach(async () => {
    // For tests expecting 'test' project
    const { sdkPath, samplePath } = await manager.createTestEnvironment('test');

    // For tests expecting 'test-sdk' project
    const { sdkPath, samplePath } = await manager.createTestEnvironment('test-sdk');
  });
});
```

## Troubleshooting Guide

### "No project found with identifier: X"

**Cause**: Project identifier doesn't match any project key or repository name
**Solution**:

1. Check config.yaml for project keys (e.g., `java`, `next`, `spa`)
2. Check repository URLs to extract repo names (e.g., `auth0-java`, `nextjs-auth0`)
3. Use either format in CLI commands: `workspace init java` or `workspace init auth0-java`
4. Error message shows both available project keys and repo names for reference

### Help Text Inconsistencies

**Cause**: Hardcoded examples in help text don't match current config
**Solution**: Update help text examples to match config.yaml project names

```typescript
// In command files, update examples like:
Examples:
  $ workspace list next    # Match actual config
  $ workspace list spa    # Not generic "next" or "node"
```

### Test Environment Mismatches

**Cause**: Test expects different repository names than DummyRepoManager creates
**Solution**: Use the consolidated `createTestEnvironment(projectName)` method

## Development Workflow

### Adding New Projects

1. Add to `config.yaml` with descriptive key
2. Update help text examples if needed
3. Test with actual `workspace init <repo-name> ...` command

### Modifying Templates

Templates are now stack-agnostic:

- Remove technology-specific references
- Use universal placeholders
- Focus on analysis and documentation patterns
- Avoid assuming specific test frameworks or build tools

### Testing Strategy

- **Unit tests**: Focus on configuration parsing, project resolution
- **Integration tests**: Test full init/clean workflows with dummy repositories
- **End-to-end tests**: Validate actual CLI commands work as expected

## Performance & Scalability Notes

### Git Worktree Management

- Always prune existing worktrees before creating new ones
- Handle repository freshness (fetch latest changes)
- Support both SSH and HTTPS git URLs
- Graceful handling of missing sample repositories

### Template Processing

- Templates are copied, not generated dynamically
- Placeholder replacement is done once during workspace creation
- Templates are stack-agnostic and reusable across projects

## Security Considerations

- Environment files are copied from secure local directory (`env_files_dir`)
- GitHub API tokens should be configured via standard git credentials
- Repository paths are validated to prevent directory traversal
- Post-init commands run in sandbox workspace directory

## Future Enhancements

### Potential Improvements

1. **Plugin system**: Allow custom post-init scripts per project type
2. **Remote templates**: Fetch templates from git repositories
3. **Workspace templates**: Pre-configured workspace layouts
4. **Multi-branch workflows**: Work on multiple branches simultaneously

### Architectural Decisions

- **Stay stack-agnostic**: Resist adding technology-specific features
- **Keep simple**: The MVP nature is a feature, not a limitation
- **Template-driven**: Use templates for customization, not code
- **Configuration over code**: Prefer YAML config over hardcoded logic

---

## Quick Reference

### Essential Files

- `src/commands/init.ts` - Main workspace initialization
- `src/services/gitWorktrees.ts` - Git worktree management
- `src/utils/config.ts` - Configuration parsing
- `config.yaml` - Project definitions
- `src/templates/` - Universal prompt templates

### Key Functions

- `configManager.findProject()` - Project resolution supporting both project keys and repository names
- `findProjectByRepoName()` - DEPRECATED - Project resolution (repository name matching only)
- `setupWorktrees()` - Git worktree creation and management
- `configManager.getProject()` - Project configuration retrieval by project key only
- `DummyRepoManager.createTestEnvironment()` - Test environment setup

### Common Gotchas

- Project resolution in init command supports both project keys ('java') and repository names ('auth0-java')
- Other commands (list, info, clean) use project keys only for consistency
- Test environments need consistent naming conventions
- Help text should reflect actual config.yaml projects
- Templates should be stack-agnostic and use universal placeholders
