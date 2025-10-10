# Implementation Plan: Fix Post-Init Command Hanging

## ANALYZE

- **Problem**: Post-init commands hang after displaying "Workspace ready" due to VS Code debugger attaching to Node.js processes
- **Domain Context**: This is the same `NODE_OPTIONS` issue affecting tests, but now affecting post-init commands that spawn npm/pnpm processes
- **Existing Patterns**: The codebase already handles this issue in test commands by clearing `NODE_OPTIONS`
- **Affected Files**: `src/commands/init.ts` (executePostInitCommand function)
- **Root Cause**: Post-init command `cd nextjs-auth0 && pnpm i && cd ../auth0-nextjs-samples/Sample-01 && pnpm i` spawns Node.js processes that get debugger attached
- **Evidence**: Terminal output shows "Waiting for the debugger to disconnect..." messages
- **Self-Doubt Check**: Is this the same pattern used elsewhere in the codebase for handling NODE_OPTIONS?

## PLAN

- [ ] **DOMAIN RESEARCH**: Review how `NODE_OPTIONS` is cleared in existing test commands for consistency
- [ ] **EXAMINE EXISTING PATTERNS**: Check `executeShellCommand` function to see if it already supports environment variable clearing
- [ ] Modify `executePostInitCommand` to clear `NODE_OPTIONS` when executing post-init commands
- [ ] **PROBLEM VALIDATION**: Test the fix by running `space init next test/proxy3` and verifying immediate exit after "Workspace ready"
- [ ] Add verbose logging to indicate when `NODE_OPTIONS` is being cleared for post-init commands
- [ ] **SOLUTION VALIDATION**: Verify that post-init commands still execute successfully but without hanging

## DESTRUCTIVE OPERATIONS

- None identified in this plan

## NOTES

- Following existing pattern from test commands that clear NODE_OPTIONS
- Post-init commands should still execute successfully, just without debugger interference
- Need to ensure this doesn't break legitimate debugging of post-init commands when needed
