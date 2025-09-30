````instructions
# Workspace CLI (space-cli) - Copilot Instructions

## Project Overview
**@tusharpandey13/space-cli** - Stack-agnostic workspace CLI using git worktrees. Core: `space init <repo> <...ids> <branch>`

## CRITICAL Environment Setup

### Package Manager
- **ONLY**: `pnpm install`, `pnpm add`, `pnpm run test`
- **NEVER**: `npm`/`yarn` (lockfile conflicts) or `npx` (sudo prompts) - use `pnpm exec`

### Test Environment
```bash
# ALWAYS clear NODE_OPTIONS for tests
env NODE_OPTIONS="" pnpm run test
env NODE_OPTIONS="" pnpm exec vitest run test/file.test.ts
```
**Issue**: VS Code debug injection hangs tests. **Fix**: Clear NODE_OPTIONS, use `pnpm exec`

## Architecture Patterns

### Repository Matching (CRITICAL)
```typescript
// CLI matches: path.basename("...my-project.git", ".git") → "my-project"
```

### Configuration Structure
```yaml
projects:
  key: { name: 'Name', repo: 'url', sample_repo: 'url', env_file: 'file.env', post-init: 'cmd' }
global: { src_dir: '~/src', workspace_base: 'workspaces', env_files_dir: './env-files' }
```

### Template System Architecture (NEW)
- **Template-First Approach**: Prefer template-based solutions over CLI prompting for better UX
- **Claude-Inspired Patterns**: Use strong emphasis (🚨, ⚠️, 🛑) and mandatory validation sections
- **Conditional Selection**: Templates selected based on project configuration (`sample_repo`, tech stack)
- **Placeholder Substitution**: `{{PROJECT_NAME}}`, `{{BRANCH_NAME}}`, `{{REPO_URL}}`, etc.
- **Security Validation**: All templates include security assessment patterns

## Testing & Development (CRITICAL)

### Commands
```bash
pnpm run test          # Run tests
pnpm run build         # Build TypeScript
pnpm run lint:fix      # Fix linting
```

### Testing Patterns
- **Single-file-per-component**: `test/clean-command.test.ts`
- **Selective Mocking**: Mock externals (GitHub CLI), allow internals (git)
- **Test Names**: Match CLI expectations with `basename()` logic
- **Helper Functions**: `setMockGitHubResponse()`, `createTestEnvironment()`
- **Template Validation**: Test for Claude patterns, strong emphasis, security sections

### E2E Framework
```bash
e2e/
├── test-matrix.md    # 40+ scenarios, 5 categories
├── test-suite.sh     # Runner with timeouts
└── helpers.sh        # Safety mechanisms
```
**Timeouts**: 60s standard, 120s init, 90s setup | **Safety**: `--no-config`, `/tmp` isolation

## Development Methodology

### Evidence-Based Debugging (ENHANCED)
1. **Isolate** → **Capture Evidence** → **Root Cause** → **Minimal Fix** → **Validate**
2. **Template-First**: Use template-based solutions over CLI interactions for better DX
3. **Strong Emphasis**: Critical requirements use visual indicators (🚨, ⚠️, 🛑) that cannot be missed
4. **Security Validation**: All changes include mandatory security assessment with stop gates
5. **Claude Patterns**: Structured validation with veto power for inadequate submissions

### Git Worktree Management
- **Branch Scenarios**: local-only/remote-only/non-existent handling
- **Samples Transform**: `bugfix/feature` → `bugfix-feature-samples`
- **Conflict Resolution**: Auto-prune stale worktrees, force flags
- **Branch Conflict Detection**: Check both workspace directories AND git branches for conflicts
- **Cleanup Order**: Prune worktree references before attempting branch deletion
- **Fallbacks**: main/master detection, graceful degradation
- **Smart Gitignore**: Auto-setup tech-stack appropriate .gitignore for sample repos
- **Workspace naming**: Support slash-separated directories (`feature/branch`) via `validateWorkspaceName()` allowing `/`

### Configuration Patterns
- **No-Config Mode**: `--no-config` flag for safe testing
- **Property Normalization**: Support `post_init` and `'post-init'`
- **Backward Compatibility**: Legacy format support
- **Environment Handling**: User-friendly prompts for missing env files

## Template Development Guidelines (NEW)

### Strong Emphasis Patterns
```markdown
# 🚨 MANDATORY REQUIREMENTS
> **⚠️ CRITICAL**: [requirement description]
### Stop Gates - Answer "NO" to ANY = DO NOT SUBMIT
**🛑 If you answered "NO" to any question, STOP**
```

### Security Validation Template
```markdown
- [ ] Authentication: No changes to auth logic OR reviewed by security team
- [ ] Authorization: No privilege escalation OR properly validated
- [ ] Data Handling: No sensitive data exposure OR proper sanitization
- [ ] Input Validation: All user inputs validated OR N/A
```

### Analysis Veto Patterns
- **Problem Clarity**: Is the issue actually reproducible and well-defined?
- **Prerequisites**: Are all necessary tools and context available?
- **Scope Validation**: Is this within appropriate domain for analysis?
- **Resource Assessment**: Is sufficient information available to proceed?
- **Alternative Check**: Have simpler solutions been considered?

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| **Test Hanging** | Check `NODE_OPTIONS=""`, use `pnpm exec vitest --run` |
| **Sudo Prompts** | Never `npx` - use `pnpm exec` |
| **E2E Failures** | Use `--no-config`, check timeouts (60-120s) |
| **Mock Issues** | Run single file: `pnpm exec vitest run test/file.test.ts` |
| **"No project found"** | Check config keys vs `basename()` extraction |
| **Git Worktree Conflicts** | `git worktree prune`, check branch naming, detect git branch conflicts |
| **Template Missing Emphasis** | Add 🚨/⚠️/🛑 symbols for critical sections |
| **Weak Validation** | Implement stop gates with clear "DO NOT SUBMIT" triggers |

## Development Workflow
1. **Setup**: Verify `NODE_OPTIONS=""`, baseline tests
2. **Template-First**: Use templates over CLI prompts for better UX
3. **Strong Emphasis**: Critical sections need visual indicators that cannot be missed
4. **Security Assessment**: All changes require mandatory security validation
5. **Evidence-Based**: Document what works/fails, never assume behavior
6. **Claude Patterns**: Use structured validation with veto power

## CLI Architecture (CRITICAL)

### Non-Interactive Mode
- All commands support `--non-interactive`
- Graceful missing input handling
- Clear actionable error messages
- Setup wizard CLI-only support

### Error Handling & Safety
- User-friendly contextual messages with suggestions
- Proper automation exit codes
- Input validation, path traversal protection
- Safe git operations with validation
- **Structured Results**: Return result objects instead of throwing for better progress coordination
- **Progress Safety**: Use try-catch blocks around progress steps to prevent UI corruption

### Template Integration
- **6 Core Templates**: analysis, enhanced-analysis, analysis-with-sample, PR_REVIEW_INSTRUCTIONS, PR_DESCRIPTION_TEMPLATE, fix-and-test, review-changes
- **Conditional Logic**: Template selection based on project.sample_repo and other configs
- **Security-First**: All templates include mandatory security validation sections
- **Veto Power**: Analysis templates can prevent unnecessary work through validation questions

## Performance Optimization Lessons
- **Measurement-First**: Always establish baseline metrics before optimization (200ms → 50ms startup)
- **Realistic Targets**: Set achievable targets based on actual measurements, not theoretical ideals
- **Package-Based Solutions**: Prefer established packages (`cli-progress`) over custom implementations for complex features
- **Caching Patterns**: In-memory caching with file watching achieves 99.6% performance improvements with minimal complexity
- **Lazy Loading**: Dynamic imports provide exceptional performance (0.2ms) with proper caching (10.6x improvement)
- **Zero Regression**: Performance optimizations must maintain 100% existing functionality

## Success Metrics
- **95%+ test pass rate** | **100% E2E coverage** (40/40 tests)
- **Template Quality**: Strong emphasis patterns present, security validation mandatory
- **Evidence-Based**: All debugging follows isolate→evidence→fix→validate pattern

## Critical Gotchas
- **VS Code auto-attach**: Test hanging (clear NODE_OPTIONS)
- **Package managers**: pnpm-only (no npm/yarn mixing)
- **Global mocks**: Break test setup (use selective)
- **Repository names**: Must match `basename()` logic
- **Branch slashes**: Transform to dashes for samples
- **Config formats**: Support both underscore/hyphen variants
- **E2E safety**: Always `--no-config` to prevent corruption
- **Performance targets**: Overly aggressive targets (150ms) cause test failures - use realistic values (200ms)
- **Package integration**: Research package APIs thoroughly before integration to avoid compatibility issues
- **Weak Templates**: Templates without 🚨/⚠️/🛑 emphasis will be ignored by users
- **CLI over Templates**: CLI prompting creates poor UX - use template-based solutions
- **Missing Security**: All changes need mandatory security validation with stop gates
- **Workspace validation**: `validateWorkspaceName()` must allow forward slashes for nested workspace directories
- **Interactive commands**: Always test CLI with `--non-interactive` flag to avoid hanging prompts
- **E2E contracts**: Update e2e test patterns when changing directory structure expectations

## Key Files & Functions
- `src/commands/init.ts`, `src/utils/config.ts`, `config.yaml`
- `src/utils/workflow.ts` - Template selection (6 templates)
- `src/templates/` - Claude-inspired templates with strong emphasis
- `configManager.findProject()`, `setupWorktrees()`, `DummyRepoManager.createTestEnvironment()`

---
**Reference**: See DOCS.md, FEATURES.md, and MIGRATION.md for detailed patterns and enhanced features.
````
