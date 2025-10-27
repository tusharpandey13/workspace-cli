# Preventing Stale Global Installation Issues

## Overview

The "Missing required dependencies" error often occurs due to stale global installations where the globally installed version differs from the development version, leading to inconsistent validation logic.

## Prevention Strategies

### 1. Always Use Safe Installation

**Recommended for development:**

```bash
pnpm run install-global:safe
```

This command:

- Cleans old builds (`pnpm run clean`)
- Rebuilds from source (`pnpm run build`)
- Installs globally with version verification

**Avoid using:**

```bash
pnpm run install-global  # May use stale builds
```

### 2. Version Consistency Checks

**Check if your global installation is current:**

```bash
pnpm run test:version-consistency
```

This verifies that `package.json` version matches the global CLI version.

### 3. Pre-commit Hook Protection

The project includes a pre-commit hook that warns about version mismatches:

```bash
⚠️  WARNING: Global installation version mismatch detected!
   Package.json version: 0.2.0
   Global version: 0.1.0

💡 To fix this after commit, run:
   pnpm run install-global:safe
```

### 4. Development Workflow

**Recommended workflow:**

1. **After pulling changes:**

   ```bash
   pnpm install
   pnpm run test:version-consistency
   # If mismatch detected:
   pnpm run install-global:safe
   ```

2. **After version bumps:**

   ```bash
   # Edit package.json version
   pnpm run install-global:safe
   pnpm run test:version-consistency
   ```

3. **Before testing CLI functionality:**
   ```bash
   pnpm run test:version-consistency
   ```

### 5. CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Verify no version mismatch
  run: |
    if command -v space >/dev/null 2>&1; then
      pnpm run test:version-consistency
    fi
```

## Troubleshooting

### Global Installation Not Found

```bash
# Install globally for the first time
pnpm run install-global:safe
```

### Permission Errors

```bash
# Check global directories
pnpm config get global-bin-dir
pnpm config get global-dir

# May need to fix permissions or use different global directory
```

### Stale Installation Detected

```bash
# Clean reinstall
pnpm run uninstall-global
pnpm run install-global:safe
```

### Path Issues

```bash
# Verify space is in PATH
which space
space --version

# If not found, check global bin directory is in PATH
echo $PATH | grep -o $(pnpm config get global-bin-dir)
```

## Enhanced Script Features

The `install-global.js` script now includes:

1. **Version Verification**: Compares package.json vs global CLI version
2. **Better Error Messages**: More specific troubleshooting guidance
3. **Automatic Clean Build**: Safe scripts ensure fresh builds
4. **Comprehensive Testing**: Tests both functionality and version consistency

## Best Practices Summary

- ✅ Use `install-global:safe` for development
- ✅ Run `test:version-consistency` before testing
- ✅ Pay attention to pre-commit warnings
- ✅ Clean reinstall when in doubt
- ❌ Don't ignore version mismatch warnings
- ❌ Don't use `install-global` with stale builds
- ❌ Don't test CLI without version verification
