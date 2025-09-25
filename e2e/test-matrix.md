# E2E Test Matrix for space CLI

## Test Categories

### Happy Path Tests (HAPPY)

| Test ID  | Description                          | Command Sequence                                                                                                                                                                                        | Pre-conditions                | Expected Exit Code | Expected stdout/stderr Pattern       |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------ | ------------------------------------ |
| HAPPY-01 | Setup new configuration              | `space setup --non-interactive --src-dir ~/tmp/space-e2e-tests/src --workspace-base workspaces --env-files-dir ./env-files --add-project "test:Test Project:https://github.com/auth0/nextjs-auth0.git"` | No existing config            | 0                  | Setup completed successfully         |
| HAPPY-02 | List projects after setup            | `space projects --non-interactive`                                                                                                                                                                      | Valid config exists           | 0                  | Shows configured projects            |
| HAPPY-03 | Init workspace with project key      | `space init test feature/test-branch --non-interactive`                                                                                                                                                 | Valid config, project exists  | 0                  | Workspace created successfully       |
| HAPPY-04 | List workspaces after init           | `space list --non-interactive`                                                                                                                                                                          | At least one workspace exists | 0                  | Shows created workspace              |
| HAPPY-05 | List workspaces for specific project | `space list test --non-interactive`                                                                                                                                                                     | Workspace exists for project  | 0                  | Shows project-specific workspaces    |
| HAPPY-06 | Get info for existing workspace      | `space info test feature_test-branch --non-interactive`                                                                                                                                                 | Workspace exists              | 0                  | Shows workspace details              |
| HAPPY-07 | Clean existing workspace             | `space clean test feature_test-branch --force --non-interactive`                                                                                                                                        | Workspace exists              | 0                  | Workspace cleaned successfully       |
| HAPPY-08 | Init with GitHub issue IDs           | `space init test 123 456 bugfix/issue-123 --non-interactive`                                                                                                                                            | Valid config, project exists  | 0                  | Workspace created with issue context |
| HAPPY-09 | Init with dry-run                    | `space init test feature/dry-test --dry-run --non-interactive`                                                                                                                                          | Valid config, project exists  | 0                  | Shows what would be done             |
| HAPPY-10 | Init with analyse mode               | `space init test feature/analyse-test --analyse --non-interactive`                                                                                                                                      | Valid config, project exists  | 0                  | Analysis workspace created           |
| HAPPY-11 | Clean with dry-run                   | `space clean test feature_test-branch --dry-run --non-interactive`                                                                                                                                      | Workspace exists              | 0                  | Shows what would be cleaned          |
| HAPPY-12 | Setup with force option              | `space setup --force --non-interactive --src-dir ~/tmp/space-e2e-tests/src2`                                                                                                                            | Existing config               | 0                  | Configuration updated                |
| HAPPY-13 | List when no workspaces exist        | `space list --non-interactive`                                                                                                                                                                          | Valid config, no workspaces   | 0                  | Empty workspace message              |
| HAPPY-14 | Verbose logging                      | `space list --verbose --non-interactive`                                                                                                                                                                | Valid config                  | 0                  | Verbose output visible               |
| HAPPY-15 | Debug logging                        | `space list --debug --non-interactive`                                                                                                                                                                  | Valid config                  | 0                  | Debug output visible                 |

### Failure Path Tests (FAIL)

| Test ID | Description                     | Command Sequence                                                | Pre-conditions                 | Expected Exit Code | Expected stdout/stderr Pattern |
| ------- | ------------------------------- | --------------------------------------------------------------- | ------------------------------ | ------------------ | ------------------------------ |
| FAIL-01 | Init with non-existent project  | `space init nonexistent feature/test --non-interactive`         | Valid config                   | 1                  | Project not found              |
| FAIL-02 | Init with invalid branch name   | `space init test "" --non-interactive`                          | Valid config                   | 1                  | Invalid branch name            |
| FAIL-03 | Init duplicate workspace        | `space init test feature/test-branch --non-interactive` (twice) | Valid config, workspace exists | 1                  | Workspace already exists       |
| FAIL-04 | Clean non-existent workspace    | `space clean test nonexistent --force --non-interactive`        | Valid config                   | 1                  | Workspace not found            |
| FAIL-05 | Info for non-existent workspace | `space info test nonexistent --non-interactive`                 | Valid config                   | 1                  | Workspace not found            |
| FAIL-06 | List for non-existent project   | `space list nonexistent --non-interactive`                      | Valid config                   | 1                  | Project not found              |
| FAIL-07 | Commands without config         | `space list --non-interactive`                                  | No config file                 | 1                  | Configuration not found        |
| FAIL-08 | Clean without force             | `space clean test feature_test-branch --non-interactive`        | Workspace exists               | 1                  | Requires --force confirmation  |
| FAIL-09 | Init with insufficient args     | `space init --non-interactive`                                  | Valid config                   | 1                  | Missing required arguments     |
| FAIL-10 | Info with insufficient args     | `space info test --non-interactive`                             | Valid config                   | 1                  | Missing workspace argument     |
| FAIL-11 | Clean with insufficient args    | `space clean test --non-interactive`                            | Valid config                   | 1                  | Missing workspace argument     |
| FAIL-12 | Setup with invalid directory    | `space setup --non-interactive --src-dir /invalid/path`         | Any state                      | 1                  | Invalid directory error        |

### Edge Case Tests (EDGE)

| Test ID | Description                          | Command Sequence                                                                                                           | Pre-conditions                 | Expected Exit Code | Expected stdout/stderr Pattern    |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------ | --------------------------------- |
| EDGE-01 | Custom config file path              | `space --config /tmp/custom-config.yaml list --non-interactive`                                                            | Custom config exists           | 0                  | Uses custom config                |
| EDGE-02 | Init with repository name match      | `space init nextjs-auth0 feature/repo-name-test --non-interactive`                                                         | Config has matching repo       | 0                  | Resolves to correct project       |
| EDGE-03 | Multiple GitHub issue IDs            | `space init test 123 456 789 feature/multi-issues --non-interactive`                                                       | Valid config                   | 0                  | Handles multiple issues           |
| EDGE-04 | Branch with special characters       | `space init test feature/test-with_special.chars --non-interactive`                                                        | Valid config                   | 0                  | Handles special characters        |
| EDGE-05 | Very long branch name                | `space init test feature/very-long-branch-name-that-exceeds-normal-length-limits-for-testing-edge-cases --non-interactive` | Valid config                   | 0                  | Handles long names                |
| EDGE-06 | Workspace name normalization         | Check if `feature/test-branch` becomes `feature_test-branch`                                                               | Valid config                   | 0                  | Names properly normalized         |
| EDGE-07 | Config with missing projects section | Use config without projects                                                                                                | Invalid config                 | 1                  | Configuration validation error    |
| EDGE-08 | Setup skip option                    | `space setup --skip --non-interactive`                                                                                     | Any state                      | 0                  | Setup skipped message             |
| EDGE-09 | Setup preview option                 | `space setup --preview --non-interactive`                                                                                  | Any state                      | 0                  | Shows preview without changes     |
| EDGE-10 | Environment file option              | `space --env /tmp/test.env list --non-interactive`                                                                         | Valid config, env file exists  | 0                  | Uses environment file             |
| EDGE-11 | Interactive overwrite prompt accept  | `echo 'y' \| space init test feature/interactive-test` (twice)                                                             | Valid config, workspace exists | 0                  | Accepts overwrite confirmation    |
| EDGE-12 | Interactive overwrite prompt decline | `echo 'n' \| space init test feature/interactive-test` (second time)                                                       | Valid config, workspace exists | 0                  | Continues with existing workspace |

### State Verification Tests (VERIFY)

| Test ID   | Description                         | Command Sequence                      | Pre-conditions         | Expected Exit Code | Expected stdout/stderr Pattern |
| --------- | ----------------------------------- | ------------------------------------- | ---------------------- | ------------------ | ------------------------------ |
| VERIFY-01 | Workspace creation filesystem state | Check directories after `space init`  | After successful init  | 0                  | Workspace directories exist    |
| VERIFY-02 | Workspace cleanup filesystem state  | Check directories after `space clean` | After successful clean | 0                  | Workspace directories removed  |
| VERIFY-03 | Config file generation              | Check config file after `space setup` | After successful setup | 0                  | Config file exists and valid   |
| VERIFY-04 | Git worktree creation               | Check git worktrees in workspace      | After successful init  | 0                  | Git worktrees properly set up  |
| VERIFY-05 | Template file generation            | Check for prompt templates after init | After successful init  | 0                  | Template files created         |

### Integration Tests (INTEGRATION)

| Test ID | Description              | Command Sequence                                     | Pre-conditions       | Expected Exit Code | Expected stdout/stderr Pattern        |
| ------- | ------------------------ | ---------------------------------------------------- | -------------------- | ------------------ | ------------------------------------- |
| INT-01  | Full workflow sequence   | `setup -> projects -> init -> list -> info -> clean` | Clean state          | 0                  | All commands succeed in sequence      |
| INT-02  | Multiple workspaces      | Create 3 workspaces, list, clean all                 | Valid config         | 0                  | Multiple workspaces handled correctly |
| INT-03  | Config reconfiguration   | Setup, modify config, verify changes                 | Existing config      | 0                  | Config changes applied correctly      |
| INT-04  | Cross-project operations | Create workspaces in multiple projects               | Multi-project config | 0                  | Projects isolated correctly           |
| INT-05  | Workspace name conflicts | Different projects, same branch names                | Multi-project config | 0                  | No naming conflicts                   |

## Test Execution Notes

- All tests must run in isolated environment (`~/tmp/space-e2e-tests`)
- Use temporary config files for each test
- Clean up after each test to prevent interference
- Capture both stdout and stderr for validation
- Tests should be runnable in any order
- Environment variables should not affect test results
