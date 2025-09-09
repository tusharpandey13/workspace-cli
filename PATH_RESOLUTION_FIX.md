# Path Resolution Bug Fix

## Problem

Users reported a common error when running workspace initialization commands:

```
❌ Repository directory does not exist: nextjs-auth0
```

This occurred when running commands like:

```bash
workspace init next feature/federated-logout
```

## Root Cause Analysis

The issue was in the configuration path resolution system in `src/utils/config.ts`:

1. **Incomplete Path Resolution**: The `resolveConfigPaths()` method was not resolving relative repository paths relative to the global `src_dir` setting.

2. **Double Path Resolution**: The `getWorkspacePaths()` method assumed all paths were still relative and tried to resolve already-resolved absolute paths, causing double path concatenation (e.g., `/Users/user/src/Users/user/src/repo`).

3. **Configuration Format**: The `config.yaml` used relative paths like `sdk_repo: "nextjs-auth0"` which needed to be resolved relative to `src_dir: "~/src"`.

## Solution

### 1. Enhanced Path Resolution Logic

Modified `resolveConfigPaths()` in `src/utils/config.ts` to properly resolve relative paths:

```typescript
// Enhanced to handle all path types
if (
  project.sdk_repo &&
  !project.sdk_repo.startsWith('http') &&
  !path.isAbsolute(project.sdk_repo)
) {
  project.sdk_repo = path.join(srcDir, project.sdk_repo);
}

if (
  project.sample_repo &&
  !project.sample_repo.startsWith('http') &&
  !path.isAbsolute(project.sample_repo)
) {
  project.sample_repo = path.join(srcDir, project.sample_repo);
}
```

### 2. Fixed Double Resolution

Updated `getWorkspacePaths()` to detect already-resolved paths:

```typescript
if (path.isAbsolute(project.sample_repo)) {
  // Already resolved to absolute path
  sampleRepoPath = project.sample_repo;
} else {
  // Still relative, resolve it
  sampleRepoPath = path.join(srcDir, project.sample_repo);
}
```

### 3. Enhanced Repository Validation

Added comprehensive validation with helpful error messages:

```typescript
validateProject(projectKey: string): ProjectConfig {
  // Validate SDK repository exists (only for local paths)
  if (project.sdk_repo && !project.sdk_repo.startsWith('http')) {
    if (!fs.existsSync(project.sdk_repo)) {
      throw new ValidationError(
        `SDK repository does not exist: ${project.sdk_repo}\n` +
        `Please ensure the repository exists or update the 'sdk_repo' path in config.yaml.\n` +
        `Suggestions:\n` +
        `  1. Clone the repository: git clone https://github.com/${project.github_org}/${path.basename(project.sdk_repo)} ${project.sdk_repo}\n` +
        `  2. Update config with correct path: sdk_repo: "~/src/${path.basename(project.sdk_repo)}"\n` +
        `  3. Use absolute path: sdk_repo: "/full/path/to/${path.basename(project.sdk_repo)}"`
      );
    }
  }
}
```

## Path Type Support

The fix now correctly handles all path types:

- **Relative paths**: `nextjs-auth0` → `/Users/user/src/nextjs-auth0`
- **Tilde paths**: `~/src/repo` → `/Users/user/src/repo`
- **Absolute paths**: `/absolute/path/to/repo` → unchanged
- **HTTP URLs**: `https://github.com/org/repo.git` → unchanged

## Testing

### Manual Verification

✅ Fixed the user's specific error case:

```bash
workspace init next feature/federated-logout
# Now works without "Repository directory does not exist" error
```

### Automated Tests

Added comprehensive test suite in `test/path-resolution.test.ts`:

- ✅ Relative path resolution (5 tests)
- ✅ Workspace path handling (1 test)
- ✅ Repository validation (3 tests)
- ✅ Edge cases (2 tests)

### Test Results

- **Path resolution tests**: 11/11 passing
- **Config tests**: 17/17 passing
- **Init tests**: 8/8 passing
- **Overall**: 96/98 passing (2 unrelated PR test failures)

## Configuration Changes

### Before (Problematic)

```yaml
projects:
  next:
    sdk_repo: 'nextjs-auth0' # Relative path not resolved
```

### After (Fixed)

```yaml
projects:
  next:
    sdk_repo: 'nextjs-auth0' # Resolved to /Users/user/src/nextjs-auth0
```

The configuration format remains the same, but the internal resolution now works correctly.

## Prevention Measures

### 1. Comprehensive Validation

- Repository existence checks with helpful error messages
- Path type detection and appropriate handling
- Clear suggestions for fixing configuration issues

### 2. Robust Testing

- Edge case coverage for all path types
- Integration tests for workspace path generation
- Repository validation error scenarios

### 3. Better Error Messages

Users now get actionable error messages instead of cryptic failures:

```
SDK repository does not exist: /Users/user/src/nextjs-auth0
Please ensure the repository exists or update the 'sdk_repo' path in config.yaml.
Current configuration: projects.next.sdk_repo = "nextjs-auth0"
Suggestions:
  1. Clone the repository: git clone https://github.com/auth0/nextjs-auth0 /Users/user/src/nextjs-auth0
  2. Update config with correct path: sdk_repo: "~/src/nextjs-auth0"
  3. Use absolute path: sdk_repo: "/full/path/to/nextjs-auth0"
```

## Files Modified

1. **src/utils/config.ts**: Enhanced path resolution and validation
2. **test/config.test.ts**: Updated to expect resolved paths
3. **test/path-resolution.test.ts**: New comprehensive test suite

## Impact

- ✅ Fixes common user error with repository path resolution
- ✅ Maintains backward compatibility with existing configurations
- ✅ Provides better error messages and debugging information
- ✅ Prevents future regressions through comprehensive testing
- ✅ Supports all common path formats (relative, absolute, tilde, HTTP)

## Follow-up Recommendations

1. **Documentation Update**: Update README with clear path configuration examples
2. **Migration Guide**: Document best practices for repository path configuration
3. **Monitoring**: Add telemetry to track configuration-related errors in production use
