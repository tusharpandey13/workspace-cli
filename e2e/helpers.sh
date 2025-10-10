#!/bin/bash

# E2E Test Helper Functions for space CLI
# These functions provide common utilities for test setup, execution, and cleanup

set -euo pipefail

# Global configuration
SPACE_CLI="$SCRIPT_DIR/../dist/bin/workspace.js"
SPACE_CLI_PATH="$SPACE_CLI"
if [[ -z "${TEST_BASE_DIR:-}" ]]; then
    readonly TEST_BASE_DIR="$HOME/tmp/space-e2e-tests"
fi
if [[ -z "${TEST_CONFIG_TEMPLATE:-}" ]]; then
    readonly TEST_CONFIG_TEMPLATE="/Users/tushar.pandey/src/workspace-cli/e2e/config-template.yaml"
fi

# Environment control for test isolation
create_clean_test_environment() {
    # Test-specific environment variables for optimal performance
    export NODE_ENV="test"
    export WORKSPACE_DISABLE_PROGRESS="1"  # Disable progress bars in tests
    export WORKSPACE_DISABLE_CACHE="1"     # Disable caching for predictable tests
    export CI="true"                       # Indicate this is a CI-like environment
    export NO_COLOR="1"                    # Disable color output for logs
    
    # Git optimization environment variables
    export GIT_TERMINAL_PROMPT="0"        # Disable git prompts
    export GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
    export GIT_CONFIG_NOSYSTEM="1"        # Don't read system git config
    
    # Clear potentially problematic environment variables
    # Note: GITHUB_TOKEN should be set by test runner if GitHub API access is needed
    unset GH_TOKEN 2>/dev/null || true  # Old GitHub CLI token, no longer used
    unset NPM_CONFIG_PREFIX 2>/dev/null || true
    unset NODE_EXTRA_CA_CERTS 2>/dev/null || true
    unset EDITOR 2>/dev/null || true        # Prevent editor prompts
    unset VISUAL 2>/dev/null || true        # Prevent editor prompts
    unset BROWSER 2>/dev/null || true       # Prevent browser opening
    unset GIT_EDITOR 2>/dev/null || true    # Prevent git editor prompts
    
    # Network optimizations for faster operations
    export HTTP_TIMEOUT="30"
    export HTTPS_TIMEOUT="30"
    
    log_debug "Test environment cleaned and controlled"
}

# Setup GitHub CLI mocking for tests
# DEPRECATED: This function is kept for backward compatibility only
# New tests should use GITHUB_TOKEN environment variable for GitHub API access
setup_github_cli_mock() {
    local mock_dir="$TEST_BASE_DIR/mocks"
    mkdir -p "$mock_dir"
    
    # Create mock gh command
    cat > "$mock_dir/gh" << 'EOF'
#!/bin/bash
# Mock GitHub CLI for e2e tests

# Debug logging
echo "Mock gh called with: $*" >> /tmp/gh-mock-debug.log
echo "Mock gh PWD: $PWD" >> /tmp/gh-mock-debug.log
echo "Mock gh PATH: $PATH" >> /tmp/gh-mock-debug.log

case "$1" in
    "auth")
        case "$2" in
            "status")
                # gh auth status outputs to stderr when successful
                cat << 'GHAUTH' >&2
github.com
  ✓ Logged in to github.com as testuser (oauth_token)
  ✓ Git operations protocol: https
  ✓ Token: gho_****
GHAUTH
                exit 0
                ;;
            *)
                echo "Mock gh auth: Unknown subcommand: $2" >&2
                exit 1
                ;;
        esac
        ;;
    "api")
        # Parse all arguments to find the API endpoint
        api_endpoint=""
        has_jq=false
        jq_filter=""
        
        # Parse arguments to extract endpoint and jq filter
        for arg in "$@"; do
            if [[ "$arg" == "--jq" ]]; then
                has_jq=true
                continue
            elif [[ $has_jq == true && -z "$jq_filter" ]]; then
                jq_filter="$arg"
                has_jq=false
                continue
            elif [[ "$arg" == repos/* ]]; then
                api_endpoint="$arg"
            fi
        done
        
        case "$api_endpoint" in
            repos/*/issues/*)
                # Extract issue number from API path
                issue_number=$(echo "$api_endpoint" | grep -oE '[0-9]+$')
                
                # If --jq '.number' was specified, return just the number
                if [[ "$jq_filter" == ".number" ]]; then
                    echo "$issue_number"
                else
                    # Return full issue JSON
                    cat << ISSUE_JSON
{
  "number": $issue_number,
  "title": "Test Issue #$issue_number",
  "body": "Mock issue for e2e testing",
  "state": "open",
  "user": {"login": "testuser"}
}
ISSUE_JSON
                fi
                exit 0
                ;;
            repos/*)
                # Repository API call
                echo '{"name": "test-repo", "full_name": "auth0/nextjs-auth0", "private": false}'
                exit 0
                ;;
            *)
                echo "Mock gh api: Unknown endpoint: $api_endpoint" >&2
                echo "Full args: $*" >&2
                exit 1
                ;;
        esac
        ;;
    "issue")
        case "$2" in
            "view")
                issue_number="$3"
                cat << GHISSUE
{
  "number": $issue_number,
  "title": "Test Issue #$issue_number",
  "body": "This is a mock issue for e2e testing purposes.",
  "state": "open",
  "user": {
    "login": "testuser"
  },
  "html_url": "https://github.com/test/repo/issues/$issue_number"
}
GHISSUE
                exit 0
                ;;
            *)
                echo "Mock gh issue: Unknown subcommand: $2" >&2
                exit 1
                ;;
        esac
        ;;
    "repo")
        case "$2" in
            "view")
                # Handle any repository URL/name
                repo_spec="${3:-testuser/test-repo}"
                cat << GHREPO
{
  "name": "test-repo",
  "full_name": "$repo_spec", 
  "private": false,
  "html_url": "https://github.com/$repo_spec",
  "description": "Test repository for e2e testing"
}
GHREPO
                exit 0
                ;;
            *)
                echo "Mock gh repo: Unknown subcommand: $2" >&2
                exit 1
                ;;
        esac
        ;;
    "--version")
        echo "gh version 2.40.1 (mock)"
        exit 0
        ;;
    *)
        echo "Mock gh: Unknown command: $1" >&2
        echo "Args: $*" >&2
        exit 1
        ;;
esac
EOF
    
    chmod +x "$mock_dir/gh"
    export PATH="$mock_dir:$PATH"
    
    log_info "GitHub CLI mocking enabled"
}

# Optimized git operations for faster tests
setup_git_optimizations() {
    # Configure git for faster operations
    git config --global init.defaultBranch main
    git config --global user.name "E2E Test"
    git config --global user.email "e2e@test.local"
    git config --global advice.detachedHead false
    git config --global gc.auto 0  # Disable automatic garbage collection
    git config --global fetch.parallel 4  # Parallel fetch operations
    git config --global clone.defaultRemoteName origin
    git config --global core.preloadindex true  # Speed up git operations
    git config --global core.fscache true  # File system caching (Windows/Mac)
    git config --global pack.threads 0  # Use all available CPU cores
    
    # Configure shallow clone preferences for environment variables
    export GIT_CLONE_OPTS="--depth 1 --single-branch --no-tags"
    export GIT_FETCH_OPTS="--depth=1"
    export GIT_CONFIG_NOSYSTEM=1  # Don't read system-wide config
    
    log_debug "Git optimizations configured"
}

# Fast git clone with error handling
git_clone_fast() {
    local repo_url="$1"
    local target_dir="$2"
    local branch="${3:-}"
    local max_retries=3
    local retry_count=0
    
    local clone_opts="--depth 1 --single-branch --no-tags"
    if [[ -n "$branch" ]]; then
        clone_opts="$clone_opts --branch $branch"
    fi
    
    while [[ $retry_count -lt $max_retries ]]; do
        if git clone $clone_opts "$repo_url" "$target_dir" 2>/dev/null; then
            log_debug "Fast git clone successful: $repo_url"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log_warning "Git clone attempt $retry_count failed, retrying..."
        rm -rf "$target_dir" 2>/dev/null || true
        sleep 1
    done
    
    log_error "Git clone failed after $max_retries attempts: $repo_url"
    return 1
}

# Enhanced error handling and pre-flight checks
validate_test_environment() {
    local errors=0
    
    # Check disk space (require at least 1GB free)
    local available_space
    if command -v df >/dev/null 2>&1; then
        available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
        if (( $(echo "$available_space < 1" | bc -l) )); then
            log_error "Insufficient disk space: ${available_space}GB available, need at least 1GB"
            errors=$((errors + 1))
        fi
    fi
    
    # Check if we can create test directory
    if ! mkdir -p "$TEST_BASE_DIR/test-write-check" 2>/dev/null; then
        log_error "Cannot create test directory: $TEST_BASE_DIR"
        errors=$((errors + 1))
    else
        rmdir "$TEST_BASE_DIR/test-write-check" 2>/dev/null || true
    fi
    
    # Check required commands
    local required_commands=("git" "node" "timeout" "bc")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "Required command not found: $cmd"
            errors=$((errors + 1))
        fi
    done
    
    # Check if CLI binary exists and is executable
    if [[ ! -f "$SPACE_CLI_PATH" ]]; then
        log_error "CLI binary not found: $SPACE_CLI_PATH"
        errors=$((errors + 1))
    elif [[ ! -x "$SPACE_CLI_PATH" ]]; then
        log_error "CLI binary not executable: $SPACE_CLI_PATH"
        errors=$((errors + 1))
    fi
    
    if [[ $errors -gt 0 ]]; then
        log_error "Environment validation failed with $errors errors"
        return 1
    fi
    
    log_success "Environment validation passed"
    return 0
}

# Robust operation wrapper with retries and error handling
safe_operation() {
    local operation_name="$1"
    local max_retries="${2:-3}"
    local retry_delay="${3:-1}"
    shift 3
    local operation_cmd=("$@")
    
    local retry_count=0
    local last_exit_code=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if "${operation_cmd[@]}"; then
            log_debug "Operation '$operation_name' succeeded on attempt $((retry_count + 1))"
            return 0
        fi
        
        last_exit_code=$?
        retry_count=$((retry_count + 1))
        
        if [[ $retry_count -lt $max_retries ]]; then
            log_warning "Operation '$operation_name' failed (attempt $retry_count/$max_retries), retrying in ${retry_delay}s..."
            sleep "$retry_delay"
        fi
    done
    
    log_error "Operation '$operation_name' failed after $max_retries attempts (exit code: $last_exit_code)"
    return $last_exit_code
}

# Colors for output
if [[ -z "${RED:-}" ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m' # No Color
fi

# Test result counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $*"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $*"
}

log_warning() {
    echo "[WARNING] $*" >&2
}

log_debug() {
    echo "[DEBUG] $*"
}

log_phase() {
    echo ""
    echo "[INFO] 🔄 $1"
    echo "=================================================="
}

log_test_start() {
    local test_name="$1"
    local description="$2"
    echo "[INFO] ▶️  Testing: $description"
}

test_passed() {
    local test_name="$1"
    local message="$2"
    echo "[PASS] $test_name: $message"
    PASSED_TESTS+=("$test_name")
}

test_failed() {
    local test_name="$1" 
    local message="$2"
    echo "[FAIL] $test_name: $message"
    FAILED_TESTS+=("$test_name")
}

# Setup test environment
setup_test_environment() {
    log_info "Setting up enhanced test environment in $TEST_BASE_DIR"
    
    # Validate environment before proceeding
    if ! validate_test_environment; then
        log_error "Environment validation failed, cannot proceed with tests"
        exit 1
    fi
    
    # Create clean test environment
    create_clean_test_environment
    
    # Setup git optimizations
    setup_git_optimizations
    
    # Backup existing user config before starting tests
    if [[ -f "$HOME/.space-config.yaml" ]]; then
        cp "$HOME/.space-config.yaml" "$HOME/.space-config.yaml.e2e-backup"
        log_info "Backed up existing config to ~/.space-config.yaml.e2e-backup"
    fi
    
    # Clean and create test directory
    if [[ -d "$TEST_BASE_DIR" ]]; then
        rm -rf "$TEST_BASE_DIR"
    fi
    
    safe_operation "create_test_directory" 3 1 mkdir -p "$TEST_BASE_DIR"
    cd "$TEST_BASE_DIR"
    
    # Create subdirectories including isolated home and mocks
    mkdir -p src workspaces env-files configs logs home mocks
    
    # Set up isolated HOME for config operations
    export TEST_HOME="$TEST_BASE_DIR/home"
    
    # Setup GitHub API access for tests
    # For tests that need GitHub API access, set GITHUB_TOKEN
    # For tests that should skip API calls, use --dry-run flag
    if [[ "${GITHUB_TOKEN:-}" == "" ]]; then
        log_debug "No GITHUB_TOKEN set - tests will use dry-run mode or skip API calls"
    else
        log_debug "GITHUB_TOKEN available for GitHub API access"
    fi
    
    # Legacy: Keep GitHub CLI mock for backward compatibility if explicitly enabled
    if [[ "${GH_MOCK:-0}" == "1" ]]; then
        log_warn "GitHub CLI mocking is deprecated - use GITHUB_TOKEN instead"
        setup_github_cli_mock
    fi
    
    log_success "Enhanced test environment created with full isolation"
}

# Cleanup test environment
cleanup_test_environment() {
    log_info "Cleaning up test environment"
    
    # Remove any config files that might have been created in user's home during tests
    if [[ -f "$HOME/.space-config.yaml" ]] && [[ ! -f "$HOME/.space-config.yaml.e2e-backup" ]]; then
        log_warning "Removing test-created config file from home directory"
        rm -f "$HOME/.space-config.yaml"
    fi
    
    # Restore user's original config if it was backed up
    if [[ -f "$HOME/.space-config.yaml.e2e-backup" ]]; then
        mv "$HOME/.space-config.yaml.e2e-backup" "$HOME/.space-config.yaml"
        log_info "Restored original config from backup"
    fi
    
    if [[ -d "$TEST_BASE_DIR" ]]; then
        # Force remove any git worktrees that might be stuck
        find "$TEST_BASE_DIR" -name ".git" -type f -exec rm -f {} \; 2>/dev/null || true
        rm -rf "$TEST_BASE_DIR"
    fi
    
    log_success "Test environment cleaned"
}

# Signal handlers for cleanup on exit/interruption
cleanup_on_exit() {
    log_info "Exit handler: ensuring cleanup"
    cleanup_test_environment
}

cleanup_on_interrupt() {
    log_warning "Test interrupted - cleaning up..."
    cleanup_test_environment
    exit 1
}

# Generate test configuration file
generate_test_config() {
    local config_name="$1"
    local config_path="$TEST_BASE_DIR/configs/$config_name.yaml"
    
    cat > "$config_path" << EOF
# Test configuration for space-cli e2e tests
projects:
  test:
    name: 'Test Project'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git'
    env_file: 'test.env.local'
  
  test2:
    name: 'Second Test Project'
    repo: 'https://github.com/auth0/auth0-spa-js.git'
    env_file: 'test2.env.local'

global:
  src_dir: '$TEST_BASE_DIR/src'
  workspace_base: 'workspaces'
  env_files_dir: '$TEST_BASE_DIR/env-files'

templates:
  dir: '/Users/tushar.pandey/src/workspace-cli/src/templates'

workflows:
  branch_patterns:
    - 'feature/**'
    - 'bugfix/**'
    - 'hotfix/**'
    - 'explore/**'
EOF

    echo "$config_path"
}

# Generate minimal test configuration
generate_minimal_config() {
    local config_name="$1"
    local config_path="$TEST_BASE_DIR/configs/$config_name.yaml"
    
    cat > "$config_path" << EOF
# Minimal test configuration
projects:
  minimal:
    name: 'Minimal Test Project'
    repo: 'https://github.com/auth0/nextjs-auth0.git'

global:
  src_dir: '$TEST_BASE_DIR/src'
  workspace_base: 'workspaces'
  env_files_dir: '$TEST_BASE_DIR/env-files'
EOF

    echo "$config_path"
}

# Generate invalid test configuration
generate_invalid_config() {
    local config_name="$1"
    local config_path="$TEST_BASE_DIR/configs/$config_name.yaml"
    
    cat > "$config_path" << EOF
# Invalid test configuration - missing required fields
global:
  src_dir: '$TEST_BASE_DIR/src'
EOF

    echo "$config_path"
}

# Execute space command with test isolation and timeout protection
run_space_command() {
    local config_file="$1"
    shift
    local args=("$@")
    
    # Prepare log files
    local test_name="${args[0]:-unknown}"
    # Handle flags that start with -- as the first argument
    if [[ "$test_name" == --* ]]; then
        # Look for the actual command (not a flag value)
        local i=1
        while [[ $i -lt ${#args[@]} ]]; do
            if [[ "${args[$i]}" != --* ]] && [[ "${args[$i]}" != /* ]]; then
                test_name="${args[$i]}"
                break
            fi
            i=$((i + 1))
        done
        # Fallback if no command found
        if [[ "$test_name" == --* ]]; then
            test_name="unknown"
        fi
    fi
    local stdout_log="$TEST_BASE_DIR/logs/${test_name}_stdout.log"
    local stderr_log="$TEST_BASE_DIR/logs/${test_name}_stderr.log"
    
    # Build command with or without config file
    local config_arg=""
    if [[ -n "$config_file" ]]; then
        config_arg="--config '$config_file'"
    fi
    
    # Execute the command with timeout protection (120 seconds for init, 60 for others)
    local timeout_duration=60
    if [[ "${args[0]}" == "init" ]] || [[ "${args[1]}" == "init" ]]; then
        timeout_duration=120
    elif [[ "${args[0]}" == "setup" ]] || [[ "${args[1]}" == "setup" ]]; then
        timeout_duration=90
    fi
    
    local exit_code=0
    timeout "${timeout_duration}s" bash -c "
        cd '/Users/tushar.pandey/src/workspace-cli'
        
        # Set controlled environment for CLI execution
        export HOME='$TEST_HOME'
        export NODE_ENV=test
        export WORKSPACE_DISABLE_PROGRESS=1
        export WORKSPACE_DISABLE_CACHE=1
        
        # GitHub CLI mocking if enabled
        if [[ '${GH_MOCK:-0}' == '1' ]]; then
            export PATH='$TEST_BASE_DIR/mocks:$PATH'
            export GH_TOKEN='mock_token_for_tests'
        fi
        
        # Clear potentially problematic variables
        unset GITHUB_TOKEN 2>/dev/null || true
        unset NPM_CONFIG_PREFIX 2>/dev/null || true
        unset NODE_EXTRA_CA_CERTS 2>/dev/null || true
        
        node '$SPACE_CLI_PATH' $config_arg \"\$@\" >'$stdout_log' 2>'$stderr_log'
    " -- "${args[@]}" || exit_code=$?
    
    # Check if command timed out
    if [[ $exit_code -eq 124 ]]; then
        echo "TIMEOUT: Command timed out after ${timeout_duration} seconds" > "$stderr_log"
        exit_code=1
    fi
    
    # Return results
    echo "$exit_code|$stdout_log|$stderr_log"
}

# Run a test case with timeout protection and optional environment variables
run_test_case() {
    local test_id="$1"
    local description="$2"
    local expected_exit_code="$3"
    local expected_pattern="$4"
    local config_file="$5"
    shift 5
    local command_args=("$@")
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    log_info "Running $test_id: $description"
    
    # Set timeout for entire test case (60 seconds)
    local test_timeout=60
    local test_start_time=$(date +%s)
    
    # Execute command with internal timeout protection
    local result
    if ! result=$(run_space_command "$config_file" "${command_args[@]}"); then
        log_error "$test_id FAILED - Command execution failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        cleanup_failed_test "$test_id"
        return
    fi
    
    local actual_exit_code="${result%%|*}"
    local stdout_file="${result#*|}"
    stdout_file="${stdout_file%|*}"
    local stderr_file="${result##*|}"
    
    # Read output files with timeout protection
    local stdout_content=""
    local stderr_content=""
    if [[ -f "$stdout_file" ]]; then
        stdout_content=$(timeout 5s cat "$stdout_file" 2>/dev/null || echo "ERROR: Could not read stdout file")
    fi
    if [[ -f "$stderr_file" ]]; then
        stderr_content=$(timeout 5s cat "$stderr_file" 2>/dev/null || echo "ERROR: Could not read stderr file")
    fi
    
    # Check for timeout indicators
    if echo "$stderr_content" | grep -q "TIMEOUT:"; then
        log_error "$test_id TIMEOUT - Command execution timed out"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        cleanup_failed_test "$test_id"
        return
    fi
    
    # Check exit code
    local exit_code_ok=false
    if [[ "$actual_exit_code" == "$expected_exit_code" ]]; then
        exit_code_ok=true
    fi
    
    # Check output pattern
    local pattern_ok=false
    if [[ -z "$expected_pattern" ]] || \
       echo "$stdout_content" | grep -q "$expected_pattern" || \
       echo "$stderr_content" | grep -q "$expected_pattern"; then
        pattern_ok=true
    fi
    
    # Determine test result
    if $exit_code_ok && $pattern_ok; then
        log_success "$test_id PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Log execution time
        local test_end_time=$(date +%s)
        local duration=$((test_end_time - test_start_time))
        log_info "  Execution time: ${duration}s"
    else
        log_error "$test_id FAILED"
        log_error "  Expected exit code: $expected_exit_code, got: $actual_exit_code"
        [[ -n "$expected_pattern" ]] && log_error "  Expected pattern: $expected_pattern"
        log_error "  STDOUT: $stdout_content"
        log_error "  STDERR: $stderr_content"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        cleanup_failed_test "$test_id"
    fi
}

# Verify filesystem state
verify_directory_exists() {
    local dir_path="$1"
    local test_id="$2"
    
    if [[ -d "$dir_path" ]]; then
        log_success "$test_id: Directory $dir_path exists"
        return 0
    else
        log_error "$test_id: Directory $dir_path does not exist"
        return 1
    fi
}

verify_directory_not_exists() {
    local dir_path="$1"
    local test_id="$2"
    
    if [[ ! -d "$dir_path" ]]; then
        log_success "$test_id: Directory $dir_path correctly removed"
        return 0
    else
        log_error "$test_id: Directory $dir_path still exists"
        return 1
    fi
}

verify_file_exists() {
    local file_path="$1"
    local test_id="$2"
    
    if [[ -f "$file_path" ]]; then
        log_success "$test_id: File $file_path exists"
        return 0
    else
        log_error "$test_id: File $file_path does not exist"
        return 1
    fi
}

# Test suite summary
print_test_summary() {
    echo ""
    echo "============================================="
    echo "           TEST SUITE SUMMARY"
    echo "============================================="
    echo "Total tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    echo "Success rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l)%"
    echo "============================================="
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo ""
        echo "Check log files in $TEST_BASE_DIR/logs/ for detailed failure information"
        return 1
    fi
    
    return 0
}

# Initialize test session
init_test_session() {
    log_info "Starting space CLI E2E Test Suite"
    log_info "CLI Path: $SPACE_CLI_PATH"
    log_info "Test Directory: $TEST_BASE_DIR"
    
    # Set up signal handlers for cleanup on interruption
    trap cleanup_on_exit EXIT
    trap cleanup_on_interrupt INT TERM
    
    # Verify CLI is built
    if [[ ! -f "$SPACE_CLI_PATH" ]]; then
        log_error "CLI binary not found at $SPACE_CLI_PATH"
        log_error "Please run 'pnpm run build' first"
        exit 1
    fi
    
    # Install bc for calculations if not present
    if ! command -v bc >/dev/null 2>&1; then
        log_warning "bc not found, installing..."
        # On macOS, bc should be available by default
        if ! command -v bc >/dev/null 2>&1; then
            log_error "bc is required for test calculations"
            exit 1
        fi
    fi
    
    setup_test_environment
}

# Cleanup for failed tests
cleanup_failed_test() {
    local test_id="$1"
    log_warning "Cleaning up after failed test $test_id"
    
    # Remove any partial workspace directories
    find "$TEST_BASE_DIR/src" -type d -name "workspaces" -exec rm -rf {} \; 2>/dev/null || true
    
    # Remove git worktrees that might be in inconsistent state
    if command -v git >/dev/null 2>&1; then
        cd "$TEST_BASE_DIR" || return
        git worktree prune 2>/dev/null || true
    fi
}

# Run interactive test case with automated input
run_interactive_test_case() {
    local test_id="$1"
    local description="$2"
    local expected_exit_code="$3"
    local expected_pattern="$4"
    local config_file="$5"
    local user_input="$6"
    shift 6
    local command_args=("$@")
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    log_info "Running $test_id: $description"
    
    # Prepare log files
    local test_name="${command_args[0]:-interactive}"
    local stdout_log="$TEST_BASE_DIR/logs/${test_name}_stdout.log"
    local stderr_log="$TEST_BASE_DIR/logs/${test_name}_stderr.log"
    
    # Build command with config file
    local config_arg=""
    if [[ -n "$config_file" ]]; then
        config_arg="--config '$config_file'"
    fi
    
    # Execute the command with timeout and input simulation
    local timeout_duration=120  # Interactive commands may need more time
    local exit_code=0
    
    # Use printf to send input followed by the command
    timeout "${timeout_duration}s" bash -c "
        cd '/Users/tushar.pandey/src/workspace-cli'
        
        # Set controlled environment for interactive CLI execution
        export HOME='$TEST_HOME'
        export NODE_ENV=test
        export WORKSPACE_DISABLE_PROGRESS=1
        export WORKSPACE_DISABLE_CACHE=1
        
        # GitHub CLI mocking if enabled
        if [[ '${GH_MOCK:-0}' == '1' ]]; then
            export PATH='$TEST_BASE_DIR/mocks:$PATH'
            export GH_TOKEN='mock_token_for_tests'
        fi
        
        printf '%s\n' '$user_input' | node '$SPACE_CLI_PATH' $config_arg \"\$@\" >'$stdout_log' 2>'$stderr_log'
    " -- "${command_args[@]}" || exit_code=$?
    
    # Check if command timed out
    if [[ $exit_code -eq 124 ]]; then
        echo "TIMEOUT: Interactive command timed out after ${timeout_duration} seconds" > "$stderr_log"
        exit_code=1
    fi
    
    # Read output files
    local stdout_content=""
    local stderr_content=""
    if [[ -f "$stdout_log" ]]; then
        stdout_content=$(cat "$stdout_log" 2>/dev/null || echo "ERROR: Could not read stdout file")
    fi
    if [[ -f "$stderr_log" ]]; then
        stderr_content=$(cat "$stderr_log" 2>/dev/null || echo "ERROR: Could not read stderr file")
    fi
    
    # Check for timeout indicators
    if echo "$stderr_content" | grep -q "TIMEOUT:"; then
        log_error "$test_id TIMEOUT - Interactive command execution timed out"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        cleanup_failed_test "$test_id"
        return
    fi
    
    # Check exit code and pattern
    local exit_code_ok=false
    if [[ "$exit_code" == "$expected_exit_code" ]]; then
        exit_code_ok=true
    fi
    
    local pattern_ok=false
    if [[ -z "$expected_pattern" ]] || \
       echo "$stdout_content" | grep -q "$expected_pattern" || \
       echo "$stderr_content" | grep -q "$expected_pattern"; then
        pattern_ok=true
    fi
    
    # Determine test result
    if $exit_code_ok && $pattern_ok; then
        log_success "$test_id PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "$test_id FAILED"
        log_error "  Expected exit code: $expected_exit_code, got: $exit_code"
        [[ -n "$expected_pattern" ]] && log_error "  Expected pattern: $expected_pattern"
        log_error "  STDOUT: $stdout_content"
        log_error "  STDERR: $stderr_content"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        cleanup_failed_test "$test_id"
    fi
}

# Export functions for use in test scripts
export -f log_info log_success log_error log_warning
export -f setup_test_environment cleanup_test_environment
export -f generate_test_config generate_minimal_config generate_invalid_config
export -f run_space_command run_test_case run_interactive_test_case
export -f verify_directory_exists verify_directory_not_exists verify_file_exists
export -f print_test_summary init_test_session cleanup_failed_test
