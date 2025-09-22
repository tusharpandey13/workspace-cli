# Implementation Plan: Add Non-Interactive Command-Line Support

## ANALYZE

### Current State Analysis

The `space` CLI currently supports:

**Commands with full CLI argument support:**

- `space init <project> [github-ids...] <branch-name>` - ✅ Already has CLI args
- `space clean <project> <workspace>` - ✅ Already has CLI args
- `space info <project> <workspace>` - ✅ Already has CLI args
- `space list` - ✅ No args needed
- `space projects` - ✅ No args needed

**Interactive prompts that need CLI alternatives:**

1. **Main menu when no command is provided** - Shows interactive menu with options
2. **Setup wizard** - Prompts for configuration creation
3. **Init command fallbacks** - When project is provided but args are missing
4. **Additional context collection** - When `--with-context` is used
5. **Setup confirmation prompts** - For overwriting existing config

**Existing global options:**

- `--non-interactive` - Already exists but not fully implemented
- `--pr <pr_id>` - Already exists
- `--verbose`, `--debug`, `--env`, `--config` - Already exist

### Issues Found

- `--non-interactive` flag exists but isn't consistently used across all commands
- Interactive menu for main command lacks CLI equivalent
- Setup wizard requires interactive input
- Init command has partial fallback to interactive mode

## PLAN

### Phase 1: Enhance existing --non-interactive support

- [x] Audit current `--non-interactive` flag implementation
- [x] Ensure all interactive prompts respect the `--non-interactive` flag
- [x] Add fallback behavior for when interactive input would be required

### Phase 2: Add CLI options for setup command

- [x] Add `--src-dir <path>` option to setup command
- [x] Add `--workspace-base <name>` option to setup command
- [x] Add `--env-files-dir <path>` option to setup command
- [x] Add `--add-project <key:name:repo[:sample_repo]>` option for adding projects
- [x] Modify setup wizard to use CLI options when provided

### Phase 3: Enhance init command CLI support

- [x] Ensure init command fully supports all arguments via CLI
- [x] Add `--context <text>` option for additional context (repeatable)
- [x] Remove interactive fallbacks when `--non-interactive` is set

### Phase 4: Add CLI equivalent for main menu actions

- [x] Modify main program action to respect `--non-interactive`
- [x] Add explicit subcommand suggestions when no command provided in non-interactive mode
- [x] Ensure graceful handling of missing config in non-interactive mode

### Phase 5: Update help text and documentation

- [x] Update help text to show all CLI options
- [x] Add examples showing non-interactive usage
- [ ] Update README with automation examples

### Phase 6: Testing and validation

- [x] Run existing tests to ensure no regressions (291/296 tests passing)
- [ ] Add tests for non-interactive scenarios
- [ ] Test automation scenarios (CI/CD usage)
- [x] **[LOW PRIORITY]** Run `eslint --fix` and `prettier --write` across modified files

## NOTES

### Implementation Strategy

- Leverage existing `--non-interactive` global flag as the primary mechanism
- Add specific CLI options where interactive input is currently required
- Maintain backward compatibility - interactive mode should still work
- Follow existing patterns in the codebase for option handling

### Test Strategy

- Focus on ensuring `--non-interactive` works for all commands
- Test scenarios where required info is missing in non-interactive mode
- Verify that existing functionality isn't broken

### Commands Priority Order

1. Setup command (highest impact for automation)
2. Init command enhancements (most commonly used)
3. Main menu behavior (default command behavior)
4. Context collection improvements

### Global Configuration Changes

- **REVERTED**: Any global space configuration files (like `~/.space-config.yaml`) and directories (`~/env-files/`) that were created during testing have been removed
- All changes are now confined to the workspace-cli project directory only
- No global system configuration remains from the implementation work
