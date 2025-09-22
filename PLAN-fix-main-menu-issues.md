# Implementation Plan: Fix Main Menu Issues

## ANALYZE

### Problems Identified

1. **Auto-setup issue**: When no global config exists, the main menu should automatically start setup wizard instead of showing a useless interactive menu
2. **"View workspace info" useless action**: This menu item just shows help text which is not useful - should be removed or improved
3. **"List existing workspaces" broken**: Even with configured projects and existing workspaces, this shows "No workspaces found" due to async/import issues in `executeListCommand()`

### Root Causes

1. **Issue 1**: The main action logic in `workspace.ts` lines 295-377 has the setup auto-start working correctly, but there might be an edge case
2. **Issue 2**: The interactive menu in `showInteractiveMenu()` includes a useless "View workspace info" option that just shows help text
3. **Issue 3**: `executeListCommand()` function has async/import issues with `fs-extra` usage - mixing async imports with sync methods incorrectly

### Current vs Expected Behavior

- **Current**: Main menu appears even when no config exists in some cases
- **Expected**: Setup wizard should start automatically when no config exists
- **Current**: Interactive menu "List workspaces" option fails due to fs-extra import issues
- **Expected**: Should work the same as `space list` command

## PLAN

### Phase 1: Fix executeListCommand() function

- [ ] Replace problematic async import pattern with proper fs-extra usage
- [ ] Import fs-extra at the top of the file like other commands do
- [ ] Use the same pattern as the working `list.ts` command
- [ ] Test the "List existing workspaces" menu option works

### Phase 2: Improve/remove "View workspace info" menu option

- [ ] Either remove the useless "View workspace info" option entirely
- [ ] Or make it actually useful by showing a workspace selection menu first
- [ ] Update the interactive menu choices array accordingly

### Phase 3: Fix auto-setup logic edge cases

- [ ] Review and test the config existence detection logic
- [ ] Ensure setup wizard starts automatically when no config is found
- [ ] Test various config scenarios (no config, invalid config, etc.)
- [ ] Ensure non-interactive mode still works correctly

### Phase 4: Testing and validation

- [ ] Test all three scenarios:
  - No config exists (should auto-start setup)
  - Config exists but no workspaces (should show empty list correctly)
  - Config exists with workspaces (should list them correctly)
- [ ] Test both interactive and non-interactive modes
- [ ] Run existing tests to ensure no regressions
- [ ] **[LOW PRIORITY]** Run `eslint --fix` and `prettier --write` on modified files

## NOTES

### Implementation Strategy

- Fix the most critical issue first (broken list command)
- Use the same patterns as working commands (`list.ts`, `info.ts`, etc.)
- Maintain backward compatibility
- Focus on making the main menu genuinely useful

### Testing Strategy

- Test the specific menu options that are currently broken
- Test the auto-setup behavior with various config states
- Verify that both CLI commands and interactive menu work consistently

### Files to Modify

- `src/bin/workspace.ts` - Main entry point with the problematic functions
- Possibly update imports and async patterns

### Success Criteria

1. `space` command with no config automatically starts setup
2. Interactive menu "List workspaces" option works and shows existing workspaces
3. Interactive menu doesn't have useless options
4. All existing functionality continues to work
