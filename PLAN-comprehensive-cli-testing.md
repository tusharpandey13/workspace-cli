# Comprehensive CLI Testing Plan: End-to-End User Journey Validation

## ANALYZE

- **Problem**: CLI tests are inconsistent and keep breaking when users run commands
- **Affected Commands**: All CLI commands (init, list, info, clean, projects, setup)
- **Test Strategy**: Act as end user, run all possible permutations with real GitHub data
- **Target Repository**: auth0/nextjs-auth0 (configured as 'next' project)
- **Test Issues**:
  - Issue #2312: "auth.getSession returns an expired session"
  - Issue #2288: "withPageAuthRequired regression on prop type inference"
- **Test PRs**:
  - PR #2325: "Release v4.10.0"
  - PR #2324: "Add documentation for includeIdTokenHintInOIDCLogoutUrl"

## PLAN

### Phase 1: Setup & Configuration Validation

- [ ] Verify global installation of CLI (`space --version`)
- [ ] Test setup wizard functionality (`space setup`)
- [ ] Test projects command (`space projects`)
- [ ] Verify configuration file validation
- [ ] Test invalid configuration scenarios
- [ ] Test missing configuration scenarios

### Phase 2: Basic Command Structure Testing

- [ ] Test all help commands (`space --help`, `space init --help`, etc.)
- [ ] Test version command (`space --version`)
- [ ] Test invalid command handling
- [ ] Test invalid flag combinations
- [ ] Test command aliases and variations

### Phase 3: Project Resolution Testing

- [ ] Test project resolution by key: `space init next`
- [ ] Test project resolution by repo name: `space init nextjs-auth0`
- [ ] Test case-insensitive project matching
- [ ] Test partial project name matching
- [ ] Test non-existent project handling
- [ ] Test ambiguous project name scenarios

### Phase 4: Init Command - Core Functionality

- [ ] Test basic init: `space init next feature/test-branch`
- [ ] Test with issue ID: `space init next 2312 feature/fix-session-expiry`
- [ ] Test with PR ID: `space --pr 2325 init next bugfix/release-prep`
- [ ] Test with multiple GitHub IDs: `space init next 2312 2288 feature/multi-issue`
- [ ] Test branch name sanitization (spaces, special chars)
- [ ] Test workspace directory creation and structure
- [ ] Test git worktree setup and validation
- [ ] Test sample repository cloning (when configured)

### Phase 5: Init Command - Edge Cases

- [ ] Test with non-existent GitHub issue/PR
- [ ] Test with private/inaccessible GitHub issue/PR
- [ ] Test with invalid branch names
- [ ] Test with existing workspace collision
- [ ] Test with insufficient disk space simulation
- [ ] Test with network connectivity issues
- [ ] Test with git repository access issues
- [ ] Test interrupted init process recovery

### Phase 6: Init Command - Flag Combinations

- [ ] Test `--dry-run` flag
- [ ] Test `--silent` flag
- [ ] Test `--non-interactive` flag
- [ ] Test `--verbose` flag
- [ ] Test `--debug` flag
- [ ] Test combined flags: `--silent --dry-run --verbose`
- [ ] Test environment file handling with `--env`
- [ ] Test custom config with `--config`

### Phase 7: List Command Testing

- [ ] Test `space list` (all projects)
- [ ] Test `space list next` (specific project)
- [ ] Test list with no workspaces
- [ ] Test list with multiple workspaces
- [ ] Test list with corrupted workspace directories
- [ ] Test list output formatting and consistency

### Phase 8: Info Command Testing

- [ ] Test `space info next <workspace>` for active workspace
- [ ] Test info for non-existent workspace
- [ ] Test info for corrupted workspace
- [ ] Test info output completeness (paths, git status, etc.)
- [ ] Test info with various workspace states

### Phase 9: Clean Command Testing

- [ ] Test `space clean next <workspace>` basic cleanup
- [ ] Test `--force` flag for non-interactive cleanup
- [ ] Test `--dry-run` with clean command
- [ ] Test clean with active git processes
- [ ] Test clean with uncommitted changes
- [ ] Test clean with non-existent workspace
- [ ] Test clean recovery scenarios

### Phase 10: Error Handling & Recovery

- [ ] Test network failures during init
- [ ] Test GitHub API rate limiting
- [ ] Test git command failures
- [ ] Test filesystem permission errors
- [ ] Test malformed configuration files
- [ ] Test interrupted operations
- [ ] Test concurrent workspace operations

### Phase 11: Integration & Performance Testing

- [ ] Test multiple workspaces creation/management
- [ ] Test workspace switching scenarios
- [ ] Test large repository handling
- [ ] Test command performance with multiple projects
- [ ] Test memory usage during operations
- [ ] Test CLI responsiveness

### Phase 12: Real-World User Journeys

- [ ] **Journey 1**: New user setup → project selection → workspace creation → development → cleanup
- [ ] **Journey 2**: Bug fix workflow → issue workspace → multiple iterations → PR workspace → merge cleanup
- [ ] **Journey 3**: Feature development → exploration → implementation → testing → delivery
- [ ] **Journey 4**: Multi-project maintenance → switching contexts → parallel development
- [ ] **Journey 5**: Team collaboration → workspace sharing → conflict resolution

### Phase 13: Stress Testing & Edge Cases

- [ ] Test with 50+ concurrent workspaces
- [ ] Test with extremely long branch names
- [ ] Test with unicode characters in project names
- [ ] Test with filesystem case sensitivity issues
- [ ] Test with symlink scenarios
- [ ] Test with corrupted git repositories

### Phase 14: Final Integration Validation

- [ ] Run complete user workflow end-to-end
- [ ] Validate all generated files and directories
- [ ] Test post-init commands execution
- [ ] Verify template generation correctness
- [ ] Test GitHub data integration accuracy
- [ ] Validate worktree git functionality

## VALIDATION CRITERIA

- All commands execute without errors
- Output is consistent and informative
- Error messages are helpful and actionable
- Recovery mechanisms work correctly
- Performance is acceptable for typical use cases
- Real GitHub data integration works flawlessly
- File system operations are safe and reversible
- Git operations maintain repository integrity

## SUCCESS METRICS

- 100% command execution success rate
- Zero data loss scenarios
- All error conditions handled gracefully
- User experience is smooth and predictable
- Documentation matches actual behavior
- Edge cases don't break core functionality

## NOTES

- Using real GitHub repository: auth0/nextjs-auth0
- Testing with actual closed issues and PRs
- Focus on end-user perspective, not just unit testing
- Validate against production-like scenarios
- Document all discovered issues for immediate fixing
- Create regression test cases for any bugs found
