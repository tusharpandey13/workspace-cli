# Workspace CLI (space-cli) - Copilot Instructions

## Project Overview

**@tusharpandey13/space-cli** - Stack-agnostic MVP workspace CLI for efficient multi-repository development with git worktrees. Published to npm as `@tusharpandey13/space-cli@0.1.0`.

**Core Command**: `space init <repo_name> <...github_ids> prefix/branch_name`

## Environment Setup

### Package Manager (CRITICAL)

- **Development**: ONLY use `pnpm install`, `pnpm add`, `pnpm run test`
- **Never**: Mix with `npm` or `yarn` (causes lockfile conflicts)
- **NEVER use `npx`**: Causes sudo password prompts and security issues - use `pnpm exec` instead

### Test Environment (CRITICAL)

**VS Code debug injection causes test hanging**:

```bash
# ALWAYS use for tests (NEVER use npx)
env NODE_OPTIONS="" pnpm run test
env NODE_OPTIONS="" pnpm exec vitest run test/specific-file.test.ts
```

**Symptoms**: Tests hang indefinitely, mysterious timeouts, sudo password prompts
**Solution**: Clear NODE_OPTIONS or disable VS Code auto-attach, use `pnpm exec` not `npx`

## Architecture & Critical Knowledge

### Repository Name Resolution (CRITICAL)

CLI uses `path.basename(repo, '.git')` for project matching:

```typescript
// Config: repo: "https://github.com/user/my-project.git"
// CLI: space init my-project ...
// Match: path.basename("...my-project.git", ".git") → "my-project"
```

### Stack-Agnostic Design

- Works with any technology (Java, Python, Go, etc.)
- Creates git worktrees + universal prompt templates only
- Optional post-init commands for technology-specific setup

### Configuration Structure

```yaml
projects:
  project-key:
    name: 'Human Readable Name'
    repo: 'https://github.com/org/repo.git'
    sample_repo: 'https://github.com/org/sample.git' # optional
    env_file: 'project.env.local' # optional
    post-init: 'npm install' # optional

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
  env_files_dir: './env-files'
```

## Testing & Development

### Essential Commands

```bash
pnpm run test          # Run tests with --run
pnpm run build         # Build TypeScript
pnpm run lint:fix      # Fix linting issues
pnpm run install-global # Global link for testing
```

### Modern Testing Patterns (CRITICAL)

**Single-file-per-component**: `test/clean-command.test.ts` (not fragmented files)

**Selective Mocking** (for complex dependencies):

```typescript
vi.mock('execa', () => ({
  execa: vi.fn().mockImplementation((command, args) => {
    if (command === 'git') return originalExeca(command, args); // Real git
    if (command === 'gh') return getMockResponse(command, args); // Mock GitHub CLI
    return originalExeca(command, args);
  }),
}));
```

**Helper Functions**: Use `setMockGitHubResponse()`, `clearMockGitHubResponses()` for clean test setup.

**Test Environment Setup**: Use `createTestEnvironment(projectName)` with names matching CLI expectations.

### Key Lessons Learned

1. **Repository Name Extraction**: `DummyRepoManager` must create repos matching `basename()` expectations
2. **Test Consolidation**: 12 files → single comprehensive files achieved 95.8% success rate
3. **Selective Mocking**: Mock externals (GitHub CLI), allow internals (git commands for test setup)
4. **Template Placeholders**: `{{SOURCE_PATH}}`, `{{PROJECT_NAME}}`, `{{BRANCH_NAME}}`, `{{GITHUB_DATA}}`

## Development Guide

### Quick Troubleshooting

**Test Hanging**: Check `echo $NODE_OPTIONS` (should be empty), use `env NODE_OPTIONS="" pnpm exec vitest --run`
**Sudo Prompts**: Never use `npx vitest` - use `pnpm exec vitest` instead
**Mock Issues**: Run single test file `pnpm exec vitest run test/specific-file.test.ts`
**"No project found"**: Check project keys in config.yaml vs repository basename extraction

### Development Workflow

1. **Before Feature**: Verify `NODE_OPTIONS` clean, run baseline tests
2. **Test Strategy**: Create comprehensive test file, use helper functions, evidence-based debugging
3. **Debugging**: Isolate → Evidence → Root Cause → Minimal Fix → Validate

### Success Metrics

- **95%+ test pass rate** (current: 95.8%)
- **Single file per component**
- **Clean selective mocking**
- **Evidence-based debugging**

## Quick Reference

### Essential Files

- `src/commands/init.ts` - Main workspace initialization
- `src/utils/config.ts` - Configuration parsing
- `config.yaml` - Project definitions
- `src/templates/` - Universal prompt templates

### Key Functions

- `configManager.findProject()` - Supports both project keys and repo names
- `setupWorktrees()` - Git worktree creation
- `DummyRepoManager.createTestEnvironment()` - Test setup

### Critical Gotchas

- **VS Code auto-attach** causes test hanging (clear NODE_OPTIONS)
- **Mixed package managers** cause lockfile conflicts (pnpm-only)
- **Global mocks** break test setup (use selective mocking)
- **Repository names** must match `basename()` extraction logic
- **Project resolution**: init command supports both keys + repo names, other commands use keys only

### Templates & Workflow Detection

- **Universal placeholders** for any tech stack
- **Branch patterns**: `bugfix/*`, `feature/*`, `hotfix/*`, `explore/*`
- **GitHub labels**: `bug`, `enhancement`, `documentation`
- **Stack-agnostic**: No technology assumptions

---

**Note**: For detailed examples and comprehensive troubleshooting, reference the full documentation. This guide focuses on critical domain knowledge and common acceleration patterns.
