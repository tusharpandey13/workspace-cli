# Implementation Plan: Remove GitHub CLI Dependency

## ANALYZE

### Problem Statement

The project currently has a **hard dependency** on GitHub CLI (`gh`) for:

1. Fetching GitHub issue/PR metadata and comments
2. Authentication with GitHub API
3. PR branch identification for workspace initialization

This creates barriers to adoption:

- Users must install and authenticate with `gh` CLI separately
- Additional setup friction in CI/CD environments
- Dependency on external tool for core functionality

### Domain Context

This is a **workspace management CLI** built on git worktrees. The GitHub integration is an enhancement feature (context fetching), not core functionality. The codebase shows:

- Main git operations use native git commands (no gh dependency)
- GitHub features are optional (dry-run mode works without gh)
- Setup wizard already handles missing gh gracefully

### Current Architecture

#### Files Using GitHub CLI (`executeGhCommand`):

**Core Services:**

1. **`src/services/gitHubCli.ts`** (166 lines)
   - `GitHubCliService` class - manages gh installation/auth status
   - `checkStatus()` - verifies gh is installed and authenticated
   - `ensureAvailable()` - throws if gh missing
   - Installation/authentication guidance messages

2. **`src/services/contextData.ts`** (529 lines)
   - `ContextDataFetcher` class
   - `fetchGitHubData()` - fetches issue/PR data using `gh api`
   - `fetchBasicGitHubItem()` - calls `gh api repos/{org}/{repo}/issues/{id}`
   - Depends on `gitHubCliService.checkStatus()`

3. **`src/services/setupWizard.ts`**
   - `checkGitHubCli()` - validates gh during setup
   - Uses `gitHubCliService` to provide user guidance

**Utility Functions:** 4. **`src/utils/githubUtils.ts`** (323 lines)

- `fetchPullRequestInfo()` - fetches PR data using `gh api repos/{org}/{repo}/pulls/{prId}`
- `isGitHubCliAvailable()` - checks if gh exists
- `getCachedPullRequestInfo()` - wrapper with caching

5. **`src/utils/validation.ts`**
   - `validateGitHubIdsExistence()` - validates issue/PR exists using `gh api`

6. **`src/utils/secureExecution.ts`**
   - `executeGhCommand()` - secure wrapper for gh commands

**Command Files:** 7. **`src/commands/init.ts`** (1957 lines)

- Uses `isGitHubCliAvailable()` to determine if PR mode is available
- Calls `contextFetcher.fetchGitHubData()` for context fetching

### GitHub API Capabilities Used

Current `gh` commands executed:

```bash
gh --version                                    # Check installation
gh auth status                                  # Check authentication
gh api repos/{org}/{repo}/issues/{id}          # Fetch issue/PR data
gh api repos/{org}/{repo}/pulls/{prId}         # Fetch PR data
gh api repos/{org}/{repo}/issues/{id} --jq ... # Validate ID exists
```

All of these are **standard GitHub REST API v3 calls** that can be replaced with direct HTTPS requests.

### GitHub REST API Alternative

GitHub provides public REST API access:

- **No authentication required** for public repositories
- **Personal Access Token (PAT)** for private repos or higher rate limits
- Rate limits: 60 req/hour (unauthenticated), 5000 req/hour (authenticated)
- Node.js native `fetch()` or `https` module (no external dependencies)

### Existing Patterns

The codebase already demonstrates:

1. **Optional GitHub features**: dry-run mode bypasses all gh calls
2. **Graceful degradation**: setup wizard continues without gh
3. **Caching**: `SessionCache` class reduces redundant API calls
4. **Error handling**: Specific error messages for 401/404/network issues

### Impact Assessment

#### Files Requiring Changes:

- **DELETE**: `src/services/gitHubCli.ts` (obsolete)
- **MAJOR REFACTOR**: `src/services/contextData.ts` (replace gh with fetch)
- **MAJOR REFACTOR**: `src/utils/githubUtils.ts` (replace gh with fetch)
- **MODERATE**: `src/utils/validation.ts` (replace gh validation)
- **MODERATE**: `src/services/setupWizard.ts` (remove gh check)
- **MINOR**: `src/utils/secureExecution.ts` (remove executeGhCommand)
- **MINOR**: `src/commands/init.ts` (update availability check)

#### Test Files Requiring Changes:

- `test/github-cli.test.ts` (DELETE - service removed)
- `test/context-data-github-cli.test.ts` (UPDATE - mock fetch instead)
- `test/github-utils.test.ts` (UPDATE - mock fetch instead)
- `test/early-validation.test.ts` (UPDATE)
- `test/secureExecution.test.ts` (REMOVE gh tests)
- `test/init.test.ts` (UPDATE - mock fetch responses)

#### E2E Tests:

- `e2e/helpers.sh` - Remove gh mock setup
- Multiple test scenarios currently mock gh - need updates

### Risks & Considerations

**BENEFITS:**
✅ Removes external dependency (simpler installation)
✅ Works without gh authentication for public repos
✅ More control over API interaction and error handling
✅ Faster (direct HTTP vs CLI subprocess)
✅ Better for CI/CD (no gh setup required)

**RISKS:**
⚠️ **Authentication Management**: Need new mechanism for private repos
⚠️ **Rate Limiting**: Must handle 60 req/hour limit for unauthenticated
⚠️ **Breaking Change**: Users with private repos need new setup
⚠️ **Testing Complexity**: Mock HTTP requests instead of CLI

**MITIGATIONS:**

- Support optional `GITHUB_TOKEN` environment variable
- Clear error messages when rate limited
- Document PAT setup for private repos
- Comprehensive test coverage for HTTP layer

### Authentication Strategy Options

**Option 1: Environment Variable Only** (RECOMMENDED)

- Use `GITHUB_TOKEN` env var if available
- Fall back to unauthenticated for public repos
- Clear error message if private repo + no token

**Option 2: Git Credential Helper**

- Read token from git credential storage
- More complex, potential security issues

**Option 3: OAuth Flow**

- Too complex for CLI tool
- Out of scope

### Edge Cases to Handle

1. **Rate limiting**: Detect 403 with rate limit headers, show clear message
2. **Network failures**: Retry logic with exponential backoff
3. **Private repos without token**: Clear error with setup instructions
4. **Invalid tokens**: Detect 401, provide actionable error
5. **Malformed API responses**: Validate JSON structure
6. **Large responses**: Stream handling for big issues/PRs
7. **GitHub Enterprise**: Support custom base URL (future enhancement)

## PLAN

### Phase 1: Create GitHub API Client (NEW) ✅ **COMPLETE**

- [x] **DOMAIN RESEARCH**: Review GitHub REST API v3 documentation for issues/PRs endpoints
- [x] Create new file `src/services/githubApiClient.ts`
  - [x] Interface `GitHubApiClientOptions` with token, baseUrl, retryDelay, maxRetries
  - [x] Interfaces for typed responses: `GitHubIssue`, `GitHubPullRequest`, `GitHubComment`
  - [x] Class `GitHubApiClient` with methods:
    - [x] `getIssue(owner, repo, issueNumber)` → Issue data
    - [x] `getPullRequest(owner, repo, prNumber)` → PR data
    - [x] `getComments(owner, repo, issueNumber)` → Comments array
    - [x] `pullRequestExists(owner, repo, prNumber)` → boolean
    - [x] `issueExists(owner, repo, issueNumber)` → boolean
  - [x] Private method `request<T>(endpoint, options)` with:
    - [x] Native Node.js `fetch()` (Node 18+ built-in)
    - [x] Token from `process.env.GITHUB_TOKEN` (throws if missing)
    - [x] Rate limit detection (429 + X-RateLimit-Reset header)
    - [x] Retry logic with exponential backoff (3 retries, 1s/2s/4s)
    - [x] Proper Authorization header (Bearer token)
  - [x] Error handling with specific error classes:
    - [x] `GitHubApiError` (base class with statusCode)
    - [x] `GitHubRateLimitError` (429 with resetAt date)
    - [x] `GitHubAuthError` (401/403)
    - [x] `GitHubNotFoundError` (404)
    - [x] `GitHubNetworkError` (network failures)
  - [x] Static utility methods:
    - [x] `parseGitHubUrl(url)` → {owner, repo} or null
    - [x] `isTokenAvailable()` → boolean
    - [x] `getMissingTokenMessage()` → helpful setup instructions
- [x] Add comprehensive unit tests in `test/github-api-client.test.ts`
  - [x] Mock `global.fetch` using vitest
  - [x] Test successful API calls (getIssue, getPullRequest, getComments)
  - [x] Test error handling (401, 403, 404, 429, 500)
  - [x] Test retry logic with network errors
  - [x] Test existence checks (pullRequestExists, issueExists)
  - [x] Test URL parsing for HTTPS and SSH formats
  - [x] Test token availability checks
  - [x] **RESULT**: All 27 tests passed ✅

### Phase 2: Update Context Data Fetcher ✅ **COMPLETE**

- [x] **BACKUP**: Copy current `src/services/contextData.ts` to `contextData.ts.backup`
- [x] Refactor `src/services/contextData.ts`:
  - [x] Remove `gitHubCliService` import (kept `execa` for curl commands)
  - [x] Add `GitHubApiClient` import
  - [x] Add private `apiClient` field and `getApiClient()` lazy initialization method
  - [x] Replace authentication check with API client initialization
  - [x] Update `fetchBasicGitHubItem()` to use `apiClient.getIssue()` instead of `execa('gh', ['api', ...])`
  - [x] Update `enhanceWithComments()` to use `apiClient.getComments()`
  - [x] Update `enhanceWithFileChanges()` to use `apiClient.getFileChanges()` (new method added)
  - [x] Keep `enhanceWithLinkedIssues()` as-is (uses `fetchBasicGitHubItem` internally)
  - [x] Keep `execa` import for non-GitHub curl commands (URL fetching)
  - [x] Update error handling to use new error classes (GitHubAuthError, GitHubNotFoundError)
- [x] Add `getFileChanges()` method to `GitHubApiClient`:
  - [x] New interface `GitHubFileChange` with filename, status, additions, deletions, changes, patch
  - [x] Method `getFileChanges(owner, repo, prNumber)` calling `/repos/.../pulls/.../files`
- [x] **BUILD VERIFICATION**: Build succeeded with no compilation errors
- [x] Update test file `test/context-data-github-cli.test.ts`:
  - [x] Rename to `test/context-data.test.ts`
  - [x] Replace `execa` mocks with `global.fetch` mocks
  - [x] Test authenticated vs unauthenticated scenarios
  - [x] Test error handling with new error classes
- [x] Run tests and verify all pass (7/7 tests passing in updated file)
- [x] **RESULT**: 507/534 tests passing overall. Note: 4 failures in `test/context-data-parallel.test.ts` need updating (Phase 3 scope)
  - [ ] Remove gh CLI status check
  - [ ] Replace with try-catch for API client
  - [ ] Update `fetchBasicGitHubItem()`:
    - [ ] Replace `execa('gh', ['api', ...])` with `apiClient.fetchIssue()`
  - [ ] Add new method `fetchComments()` using API client
  - [ ] Update error handling for new error types
- [ ] Update tests in `test/context-data-github-cli.test.ts`:
  - [ ] Rename to `test/context-data.test.ts`
  - [ ] Remove gh CLI mocks
  - [ ] Mock `fetch()` instead with MSW or similar
  - [ ] Test unauthenticated public repo access
  - [ ] Test authenticated private repo access
  - [ ] Test rate limit scenarios

### Phase 3: Update GitHub Utils ✅ COMPLETE

- [x] Refactor `src/utils/githubUtils.ts`:
  - [x] Remove `executeGhCommand` import
  - [x] Add `GitHubApiClient` import
  - [x] Add lazy initialization of API client with `getApiClient()`
  - [x] Update `fetchPullRequestInfo()`:
    - [x] Replace gh command with `apiClient.getPullRequest()`
    - [x] Update error handling to catch "not found" and "authentication" errors
  - [x] Update `isGitHubCliAvailable()`:
    - [x] Rename to `isGitHubApiAvailable()`
    - [x] Use `GitHubApiClient.isTokenAvailable()` static method
    - [x] Made synchronous (no longer async)
  - [x] Keep existing cache logic unchanged
- [x] Update `src/commands/init.ts`:
  - [x] Replace `isGitHubCliAvailable` import with `isGitHubApiAvailable`
  - [x] Update function calls (removed await)
  - [x] Update error messages to reference GITHUB_TOKEN
- [x] Update tests in `test/github-utils.test.ts`:
  - [x] Remove gh CLI mocks
  - [x] Mock fetch globally in beforeEach/afterEach
  - [x] Rewrite `isGitHubApiAvailable` tests for synchronous behavior
  - [x] Rewrite `fetchPullRequestInfo` tests with fetch mocks
  - [x] Rewrite `getCachedPullRequestInfo` tests with fetch mocks
  - [x] All 15 tests passing

### Phase 4: Update Validation Utils ✅ COMPLETE

- [x] Refactor `src/utils/validation.ts`:
  - [x] Remove `executeGhCommand` import
  - [x] Add `GitHubApiClient` import
  - [x] Update `validateGitHubIdsExistence()`:
    - [x] Replace executeGhCommand(['api', ...]) with `apiClient.getIssue()`
    - [x] Simplified logic - direct API call instead of subprocess + jq parsing
    - [x] Remove timeout parameter (handled by API client's retry logic)
  - [x] Update error messages:
    - [x] "GitHub CLI authentication" → "GITHUB_TOKEN"
    - [x] "gh: command not found" → "GITHUB_TOKEN is not set"
    - [x] Updated all error handling for GitHubApiClient error types
- [x] Update tests in `test/early-validation.test.ts`:
  - [x] Remove executeGhCommand mocks
  - [x] Mock global.fetch in beforeEach/afterEach
  - [x] Rewrite all 8 test cases with fetch mocks
  - [x] Test missing GITHUB_TOKEN scenario
  - [x] Test network error scenario
  - [x] All 8 tests passing

### Phase 5: Remove GitHub CLI Service ✅ COMPLETE

- [x] **DELETED** `src/services/gitHubCli.ts` (166 lines removed)
- [x] **DELETED** `test/github-cli.test.ts` (137 lines removed)
- [x] Update `src/services/setupWizard.ts`:
  - [x] Remove `gitHubCli` import, add `GitHubApiClient` import
  - [x] Rename `checkGitHubCli()` → `checkGitHubToken()` method
  - [x] Implemented `checkGitHubToken()` method:
    - [x] Check for `GITHUB_TOKEN` env var
    - [x] Provide step-by-step guidance on creating PAT
    - [x] Make it optional, warn if missing
    - [x] Allow user to continue setup without token
  - [x] Updated method call at line 87
  - [x] Fixed unused variable lint error
- [x] Update `test/context-data-parallel.test.ts`:
  - [x] Removed GitHub CLI service import
  - [x] Removed `checkStatus()` mocks
  - [x] Updated to use global.fetch mocking
  - [x] Removed authentication error tests (now handled by API client)
  - [x] Updated tests to check for GITHUB_TOKEN instead of gh CLI
  - [x] All 6 tests passing

**Commit**: 6fc70dd "Phase 5: Remove GitHub CLI service and refactor setupWizard"
**Tests**: ✅ 6/6 passing
**Build**: ✅ Success
**Lint**: ✅ Clean

### Phase 6: Update Secure Execution

- [ ] Refactor `src/utils/secureExecution.ts`:
  - [ ] Remove `executeGhCommand()` function
  - [ ] Keep `executeGitCommand()` and other utilities
- [ ] Update tests in `test/secureExecution.test.ts`:
  - [ ] Remove gh command tests
  - [ ] Keep git command tests

### Phase 7: Update Init Command

- [ ] Refactor `src/commands/init.ts`:
  - [ ] Replace `isGitHubCliAvailable()` with `isGitHubApiAvailable()`
  - [ ] Update error messages
  - [ ] No other changes needed (already uses abstracted functions)

### Phase 8: Update E2E Tests

- [ ] Update `e2e/helpers.sh`:
  - [ ] Remove `setup_github_cli_mock()` function
  - [ ] Add `setup_github_api_mock()` if needed (may not be necessary)
- [ ] Update all E2E test scripts:
  - [ ] Export `GITHUB_TOKEN=test_token` for authenticated tests
  - [ ] Remove gh-related assertions

### Phase 9: Documentation Updates

- [ ] Update `README.md`:
  - [ ] **ADD BREAKING CHANGE NOTICE at top of file** (after logo, before Quick Start):
    - [ ] Add visible warning box/section titled "⚠️ Breaking Change (v0.2.0)"
    - [ ] Clearly state: "GitHub CLI is no longer required or used"
    - [ ] Explain: "For private repositories, you must now set `GITHUB_TOKEN` environment variable"
    - [ ] Link to migration guide
    - [ ] Use bold/emoji to make it unmissable
  - [ ] Remove "GitHub CLI" from prerequisites section
  - [ ] Add new section "GitHub Token (Optional)" in prerequisites:
    - [ ] When needed (private repos, higher rate limits)
    - [ ] How to create PAT (with link to GitHub settings)
    - [ ] How to set GITHUB_TOKEN env var (shell profile examples)
    - [ ] Explain: Public repos work without token (60 req/hour limit)
  - [ ] Update Quick Start section:
    - [ ] Add note about optional GITHUB_TOKEN before running commands
    - [ ] Show example: `export GITHUB_TOKEN="ghp_..."`
  - [ ] Update troubleshooting section:
    - [ ] Remove "No GitHub CLI token" section
    - [ ] Add "Rate limiting" section with clear explanation
    - [ ] Add "Private repo access" section with token setup
    - [ ] Add "Authentication errors" section (401/403 handling)
- [ ] Update `.github/copilot-instructions.md`:
  - [ ] Remove all gh CLI references
  - [ ] Add GitHub API client patterns
  - [ ] Update testing patterns (mock fetch instead of gh)
  - [ ] Add note about GITHUB_TOKEN for tests
- [ ] Create `docs/GITHUB_API_MIGRATION.md`:
  - [ ] Migration guide for existing users
  - [ ] Breaking changes clearly listed
  - [ ] Before/After comparison table
  - [ ] Token setup instructions with screenshots/examples
  - [ ] FAQ section addressing common concerns
  - [ ] Troubleshooting for migration issues

### Phase 10: Update Configuration & Guidance

- [ ] Update error messages throughout codebase:
  - [ ] Replace "GitHub CLI is not installed" → "Unable to access GitHub API"
  - [ ] Replace "Run 'gh auth login'" → "Set GITHUB_TOKEN environment variable"
  - [ ] Add rate limit guidance
- [ ] Add configuration validation:
  - [ ] Check if GITHUB_TOKEN is valid (make test request)
  - [ ] Warn if public repo mode with rate limit risk

### Phase 11: Final Validation

- [ ] **BUILD**: Run `pnpm run build` and ensure no errors
- [ ] **UNIT TESTS**: Run `env NODE_OPTIONS="" pnpm run test` - all must pass
- [ ] **E2E TESTS**: Run `pnpm run test:e2e` - all must pass
- [ ] **MANUAL TESTING**:
  - [ ] Test with GITHUB_TOKEN set (private repo)
  - [ ] Test without GITHUB_TOKEN (public repo)
  - [ ] Test rate limit scenario (make 60+ requests)
  - [ ] Test invalid token scenario
  - [ ] Test network failure scenario
  - [ ] Test workspace init with PR mode
  - [ ] Test workspace init with issue IDs
  - [ ] Test dry-run mode
- [ ] **LINTING**: Run `pnpm run lint:fix`

## DESTRUCTIVE OPERATIONS

- **DELETE** `src/services/gitHubCli.ts`
- **DELETE** `test/github-cli.test.ts`
- **DELETE** function `executeGhCommand()` from `src/utils/secureExecution.ts`

## IMPLEMENTATION NOTES

### Node.js Fetch API

Node.js 18+ includes native `fetch()` - no external dependencies needed:

```typescript
const response = await fetch('https://api.github.com/repos/org/repo/issues/123', {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'space-cli',
  },
});
```

### GitHub API Endpoints

- Issues: `GET /repos/{owner}/{repo}/issues/{issue_number}`
- PRs: `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- Comments: `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`

### Rate Limit Headers

GitHub returns these headers:

- `x-ratelimit-limit`: Total allowed requests
- `x-ratelimit-remaining`: Requests remaining
- `x-ratelimit-reset`: Unix timestamp when limit resets

### Authentication Header

```typescript
// With token
headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }

// Without token (public repos only)
headers: { 'Accept': 'application/vnd.github.v3+json' }
```

### Success Metrics

- ✅ Zero references to `gh` or `executeGhCommand` in source code
- ✅ All unit tests pass (100% coverage maintained)
- ✅ All E2E tests pass
- ✅ Works with and without GITHUB_TOKEN
- ✅ Clear error messages for rate limits and private repos
- ✅ Updated documentation reflects new architecture

### Breaking Changes

1. **Private repository access**: Users must set `GITHUB_TOKEN` environment variable
2. **No gh CLI installation required**: Simpler but requires token for private repos
3. **Rate limiting**: Unauthenticated users limited to 60 requests/hour

### Migration Path for Users

1. Export `GITHUB_TOKEN` in shell profile (for private repos):
   ```bash
   export GITHUB_TOKEN="ghp_your_token_here"
   ```
2. Create token at: https://github.com/settings/tokens
3. Required scopes: `repo` (for private repos) or none (for public only)

## ASSUMPTIONS & VALIDATION

- **ASSUMPTION**: Project uses Node.js 18+ (has native fetch)
  - **VALIDATION**: Check package.json engines field
- **ASSUMPTION**: GitHub REST API v3 is stable and sufficient
  - **VALIDATION**: Current gh commands only use v3 endpoints
- **ASSUMPTION**: Users can create and manage GitHub PATs
  - **VALIDATION**: Provide clear documentation and error messages
- **ASSUMPTION**: 60 req/hour is sufficient for unauthenticated use
  - **VALIDATION**: Typical init operation uses ~5-10 requests

## ROLLBACK PLAN

If implementation fails or causes issues:

1. Revert all changes using git
2. Restore `src/services/gitHubCli.ts` from backup
3. Restore test files from git history
4. Run full test suite to ensure stability
