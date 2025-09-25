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

### E2E Framework
```bash
e2e/
├── test-matrix.md    # 40+ scenarios, 5 categories
├── test-suite.sh     # Runner with timeouts
└── helpers.sh        # Safety mechanisms
```
**Timeouts**: 60s standard, 120s init, 90s setup | **Safety**: `--no-config`, `/tmp` isolation

## Development Methodology

### Evidence-Based Debugging
1. **Isolate** → **Capture Evidence** → **Root Cause** → **Minimal Fix** → **Validate**
2. Document what works/fails, never assume behavior

### Git Worktree Management
- **Branch Scenarios**: local-only/remote-only/non-existent handling
- **Samples Transform**: `bugfix/feature` → `bugfix-feature-samples`
- **Conflict Resolution**: Auto-prune stale worktrees, force flags
- **Fallbacks**: main/master detection, graceful degradation

### Configuration Patterns
- **No-Config Mode**: `--no-config` flag for safe testing
- **Property Normalization**: Support `post_init` and `'post-init'`
- **Backward Compatibility**: Legacy format support

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| **Test Hanging** | Check `NODE_OPTIONS=""`, use `pnpm exec vitest --run` |
| **Sudo Prompts** | Never `npx` - use `pnpm exec` |
| **E2E Failures** | Use `--no-config`, check timeouts (60-120s) |
| **Mock Issues** | Run single file: `pnpm exec vitest run test/file.test.ts` |
| **"No project found"** | Check config keys vs `basename()` extraction |
| **Git Worktree Conflicts** | `git worktree prune`, check branch naming |

## Development Workflow
1. **Setup**: Verify `NODE_OPTIONS=""`, baseline tests
2. **Testing**: Single comprehensive files, selective mocking, evidence-based debugging
3. **Git Ops**: Handle local/remote/nonexistent branches, samples transformation
4. **Config**: Backward compatibility, property normalization
5. **E2E**: Use `--no-config`, timeout protection

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

## Performance Optimization Lessons
- **Measurement-First**: Always establish baseline metrics before optimization (200ms → 50ms startup)
- **Realistic Targets**: Set achievable targets based on actual measurements, not theoretical ideals
- **Package-Based Solutions**: Prefer established packages (`cli-progress`) over custom implementations for complex features
- **Caching Patterns**: In-memory caching with file watching achieves 99.6% performance improvements with minimal complexity
- **Lazy Loading**: Dynamic imports provide exceptional performance (0.2ms) with proper caching (10.6x improvement)
- **Zero Regression**: Performance optimizations must maintain 100% existing functionality

## Success Metrics
- **95%+ test pass rate** | **100% E2E coverage** (40/40 tests)
- **Timeout protection** | **Evidence-based debugging**

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

## Key Files & Functions
- `src/commands/init.ts`, `src/utils/config.ts`, `config.yaml`
- `configManager.findProject()`, `setupWorktrees()`, `DummyRepoManager.createTestEnvironment()`

---
**Reference**: See DOCS.md and FUTURE_IMPROVEMENTS.md for detailed patterns and roadmap.
````
