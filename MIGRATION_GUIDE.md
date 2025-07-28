# Configuration Migration Guide

This guide helps you migrate your `config.yaml` to use the improved path resolution and branch handling introduced in version 2.1.0.

## Path Configuration Best Practices

### Before (Problematic)
```yaml
projects:
  spa:
    sample_repo: "/Users/username/src/spajs/spatest"  # Absolute path causes issues
    sample_repo: "https://github.com/user/repo.git"  # URL when local repo exists
```

### After (Recommended)
```yaml
projects:
  spa:
    sdk_repo: "~/src/auth0-spa-js"        # Tilde expansion for home directory
    sample_repo: "spajs/spatest"          # Relative to global.src_dir
    sample_app_path: "/Users/username/src/spajs/spatest"  # Absolute path for app location
```

## Path Resolution Rules

1. **`sdk_repo` paths:**
   - Use `~` for home directory expansion: `~/src/repo-name`
   - Use relative paths for repositories in `src_dir`: `repo-name`
   - Absolute paths are supported but not recommended

2. **`sample_repo` paths:**
   - Use relative paths for local repositories: `subdir/repo-name`  
   - Resolved relative to `global.src_dir`
   - Git URLs are supported: `https://github.com/user/repo.git`

3. **`sample_app_path` paths:**
   - Use absolute paths for specific application locations
   - Can point to subdirectories within the sample repository

## Branch Handling Improvements

### Automatic Branch Fallback

The CLI now handles cases where your feature branch exists in the SDK repository but not in the sample repository:

- **SDK worktree**: Uses your specified branch (e.g., `bugfix/feature-name`)
- **Sample worktree**: Automatically uses the repository's default branch (`main` or `master`)

This allows you to:
- Develop features in your SDK repository
- Test against stable sample applications
- Avoid "invalid reference" errors

### Example Workflow

```bash
# This now works even if 'bugfix/my-feature' doesn't exist in the sample repo
workspace init spa bugfix/my-feature

# Result:
# - SDK worktree: uses 'bugfix/my-feature' branch
# - Sample worktree: uses 'master' or 'main' branch automatically
```

## Troubleshooting Migration Issues

### If you see "invalid reference" errors:

1. **Clean up existing worktrees:**
   ```bash
   cd ~/src/your-repo
   git worktree prune
   ```

2. **Remove stale workspace directories:**
   ```bash
   rm -rf ~/src/workspaces/project/workspace-name
   ```

3. **Update your config.yaml:**
   - Change absolute paths to relative paths for `sample_repo`
   - Ensure paths use correct format (see examples above)

### If you see path resolution errors:

1. **Verify your `global.src_dir` setting:**
   ```yaml
   global:
     src_dir: "~/src"  # Should expand to your actual src directory
   ```

2. **Check that relative paths resolve correctly:**
   ```bash
   # If src_dir is ~/src and sample_repo is "spajs/spatest"
   # The resolved path should be ~/src/spajs/spatest
   ls ~/src/spajs/spatest
   ```

### Using verbose mode for debugging:

```bash
workspace init spa your-branch --verbose
```

This shows detailed path resolution and git commands, helping you identify configuration issues.

## Migration Checklist

- [ ] Update `sample_repo` paths from absolute to relative format
- [ ] Verify `sdk_repo` uses tilde expansion if pointing to home directory
- [ ] Test workspace creation with verbose mode
- [ ] Clean up any existing stale worktrees
- [ ] Update any automation scripts that depend on workspace paths
