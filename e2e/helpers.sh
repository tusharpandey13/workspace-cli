#!/bin/bash

# E2E Test Helper Functions for space CLI
# These functions provide common utilities for test setup, execution, and cleanup

set -euo pipefail

# Global test variables
readonly TEST_BASE_DIR="$HOME/tmp/space-e2e-tests"
readonly SPACE_CLI_PATH="/Users/tushar.pandey/src/workspace-cli/dist/bin/workspace.js"
readonly TEST_CONFIG_TEMPLATE="/Users/tushar.pandey/src/workspace-cli/e2e/config-template.yaml"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

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
    echo -e "${YELLOW}[WARN]${NC} $*"
}

# Setup test environment
setup_test_environment() {
    log_info "Setting up test environment in $TEST_BASE_DIR"
    
    # Clean and create test directory
    if [[ -d "$TEST_BASE_DIR" ]]; then
        rm -rf "$TEST_BASE_DIR"
    fi
    
    mkdir -p "$TEST_BASE_DIR"
    cd "$TEST_BASE_DIR"
    
    # Create subdirectories
    mkdir -p src workspaces env-files configs logs
    
    log_success "Test environment created"
}

# Cleanup test environment
cleanup_test_environment() {
    log_info "Cleaning up test environment"
    
    if [[ -d "$TEST_BASE_DIR" ]]; then
        # Force remove any git worktrees that might be stuck
        find "$TEST_BASE_DIR" -name ".git" -type f -exec rm -f {} \; 2>/dev/null || true
        rm -rf "$TEST_BASE_DIR"
    fi
    
    log_success "Test environment cleaned"
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
        NODE_ENV=test node '$SPACE_CLI_PATH' $config_arg \"\$@\" >'$stdout_log' 2>'$stderr_log'
    " -- "${args[@]}" || exit_code=$?
    
    # Check if command timed out
    if [[ $exit_code -eq 124 ]]; then
        echo "TIMEOUT: Command timed out after ${timeout_duration} seconds" > "$stderr_log"
        exit_code=1
    fi
    
    # Return results
    echo "$exit_code|$stdout_log|$stderr_log"
}

# Run a test case with timeout protection
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

# Export functions for use in test scripts
export -f log_info log_success log_error log_warning
export -f setup_test_environment cleanup_test_environment
export -f generate_test_config generate_minimal_config generate_invalid_config
export -f run_space_command run_test_case
export -f verify_directory_exists verify_directory_not_exists verify_file_exists
export -f print_test_summary init_test_session cleanup_failed_test
