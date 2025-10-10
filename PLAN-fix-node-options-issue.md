# Implementation Plan: Fix NODE_OPTIONS Issue with Space CLI

## ANALYZE

- **Problem**: `space list` and other commands fail with "env: node: No such file or directory" when NODE_OPTIONS contains VS Code debug injection
- **Domain Context**: This is a Node.js CLI tool that uses shebang `#!/usr/bin/env node` for execution
- **Root Cause**: VS Code sets NODE_OPTIONS with debug bootloader paths that interfere with `env node` execution
- **Existing Patterns**: The codebase already has patterns for clearing NODE_OPTIONS in tests (`.github/copilot-instructions.md`, `package.json`)
- **Affected Areas**: Global CLI installation via npm/pnpm, shell execution environment
- **Self-Doubt Check**: Is this a legitimate NODE_OPTIONS interference issue? Yes, confirmed by successful execution with `env NODE_OPTIONS=""`.

## PLAN

- [x] **DOMAIN RESEARCH**: Investigated how other Node.js CLI tools handle NODE_OPTIONS interference
- [x] **PROBLEM VALIDATION**: Confirmed this is the same issue mentioned in copilot instructions ("had happened before too")
- [x] **SOLUTION 1**: Enhanced wrapper script that clears NODE_OPTIONS and VS Code debug variables before execution
- [x] **SOLUTION 2**: Updated the main executable to use wrapper script approach
- [x] **SOLUTION 3**: Updated package.json to use the wrapper script as the binary entry point
- [x] **TESTING**: Verified the fix works in both development and global installation scenarios
- [x] **DOCUMENTATION**: Solution documented in this plan file
- [x] **VALIDATION**: Tested with both `space list` and `space projects` commands - comprehensive fix confirmed

## COMPLETION STATUS: ✅ RESOLVED

## DESTRUCTIVE OPERATIONS

- Potential modification of global symlink `/Users/tushar.pandey/.npm-global/bin/space`
- Updates to package.json that could affect build process

## NOTES

- Following existing patterns from `space-wrapper.sh` which already addresses this issue
- The `.github/copilot-instructions.md` already documents this as a "CRITICAL" issue for tests
- Need to ensure solution works for both local development and global npm installs
- Must validate that the fix doesn't break existing functionality
