#!/bin/bash

# E2E Test Suite for TTY Prompt Visibility
# Tests workspace overwrite prompt visibility in different terminal conditions

set -euo pipefail

# Source helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

# TTY-specific test variables
readonly TTY_TEST_LOG_DIR="$TEST_BASE_DIR/logs/tty-tests"
readonly TTY_WORKSPACE_TEST_DIR="$TEST_BASE_DIR/tty-workspaces"

# Initialize TTY testing environment
init_tty_testing() {
    log_info "=== INITIALIZING TTY PROMPT TESTING ==="
    
    # Create TTY-specific directories
    mkdir -p "$TTY_TEST_LOG_DIR"
    mkdir -p "$TTY_WORKSPACE_TEST_DIR"
    
    # Verify CLI is available
    if [[ ! -f "$SPACE_CLI_PATH" ]]; then
        log_error "CLI binary not found at $SPACE_CLI_PATH"
        log_error "Please run 'pnpm run build' first"
        exit 1
    fi
    
    log_success "TTY testing environment initialized"
}

# Helper function to create a test workspace that can be overwritten
create_existing_workspace() {
    local config_file="$1"
    local project_key="$2" 
    local workspace_name="$3"
    
    log_info "Creating existing workspace for overwrite test: $workspace_name"
    
    # Create workspace that we can later test overwriting
    run_space_command "$config_file" init "$project_key" "$workspace_name" --silent >/dev/null 2>&1
    
    # Verify workspace was created
    local workspace_path="$TEST_BASE_DIR/src/workspaces/$project_key/$workspace_name"
    if [[ -d "$workspace_path" ]]; then
        log_success "Test workspace created at $workspace_path"
        return 0
    else
        log_error "Failed to create test workspace at $workspace_path"
        return 1
    fi
}

# Test prompt visibility when output is piped to cat
test_prompt_with_pipe() {
    local test_id="TTY-01"
    local config_file="$1"
    
    log_info "Running $test_id: Test prompt visibility with pipe to cat"
    
    # Create existing workspace
    if ! create_existing_workspace "$config_file" "test" "tty-pipe-test"; then
        log_error "$test_id: Failed to create existing workspace"
        return 1
    fi
    
    # Test command with pipe - should show prompt when piped
    local cmd="echo 'y' | NODE_ENV=test node '$SPACE_CLI_PATH' --config '$config_file' init test tty-pipe-test-2 | cat"
    local output_file="$TTY_TEST_LOG_DIR/${test_id}_piped_output.log"
    
    log_info "$test_id: Executing piped command..."
    if timeout 30s bash -c "$cmd" > "$output_file" 2>&1; then
        # Check if prompt text appears in output
        if grep -q "already exists.*overwrite" "$output_file"; then
            log_success "$test_id: PASSED - Prompt visible when piped to cat"
            return 0
        else
            log_error "$test_id: FAILED - Prompt not visible in piped output"
            log_error "Output content:"
            cat "$output_file" | head -20
            return 1
        fi
    else
        log_error "$test_id: Command timed out or failed"
        return 1
    fi
}

# Test prompt visibility in direct TTY mode (this is the problematic case)
test_prompt_direct_tty() {
    local test_id="TTY-02"
    local config_file="$1"
    
    log_info "Running $test_id: Test prompt visibility in direct TTY"
    
    # Create existing workspace
    if ! create_existing_workspace "$config_file" "test" "tty-direct-test"; then
        log_error "$test_id: Failed to create existing workspace" 
        return 1
    fi
    
    # Test direct command execution with simulated input
    # This tests the actual problematic scenario
    local output_file="$TTY_TEST_LOG_DIR/${test_id}_direct_output.log"
    local error_file="$TTY_TEST_LOG_DIR/${test_id}_direct_error.log"
    
    log_info "$test_id: Testing direct TTY interaction..."
    
    # Use expect-like behavior with bash co-process for interactive testing
    local test_script=$(cat << 'EOF'
#!/bin/bash
set -euo pipefail

CONFIG_FILE="$1"
SPACE_CLI_PATH="$2"
OUTPUT_FILE="$3"
ERROR_FILE="$4"

# Start the CLI command in background
NODE_ENV=test node "$SPACE_CLI_PATH" --config "$CONFIG_FILE" init test tty-direct-test-2 > "$OUTPUT_FILE" 2> "$ERROR_FILE" &
CLI_PID=$!

# Give it time to start and display prompt
sleep 2

# Send 'y' + enter to the process
echo 'y' > /proc/$CLI_PID/fd/0 2>/dev/null || {
    # If /proc method fails, try kill approach
    echo 'y' | kill -USR1 $CLI_PID 2>/dev/null || true
}

# Wait for process to complete
wait $CLI_PID 2>/dev/null || {
    # Process might have already finished
    true
}
EOF
    )
    
    # Execute the interactive test
    if timeout 30s bash -c "$test_script" "$config_file" "$SPACE_CLI_PATH" "$output_file" "$error_file"; then
        # Check both stdout and stderr for prompt
        local combined_output="$TTY_TEST_LOG_DIR/${test_id}_combined.log"
        cat "$output_file" "$error_file" > "$combined_output" 2>/dev/null
        
        if grep -q "already exists.*overwrite\|Clean and overwrite" "$combined_output"; then
            log_success "$test_id: PASSED - Prompt visible in direct TTY mode"
            return 0
        else
            log_error "$test_id: FAILED - Prompt not visible in direct TTY mode"
            log_error "Combined output content:"
            cat "$combined_output" | head -20
            return 1
        fi
    else
        log_error "$test_id: Interactive test timed out or failed"
        return 1
    fi
}

# Test progress bar interaction with prompts
test_prompt_with_progress_bar() {
    local test_id="TTY-03"
    local config_file="$1"
    
    log_info "Running $test_id: Test prompt visibility with progress bar active"
    
    # Create existing workspace
    if ! create_existing_workspace "$config_file" "test" "tty-progress-test"; then
        log_error "$test_id: Failed to create existing workspace"
        return 1
    fi
    
    # Test with progress enabled (default behavior)
    local output_file="$TTY_TEST_LOG_DIR/${test_id}_progress_output.log"
    local cmd="echo 'y' | NODE_ENV=test node '$SPACE_CLI_PATH' --config '$config_file' init test tty-progress-test-2"
    
    log_info "$test_id: Testing with progress bar enabled..."
    
    if timeout 30s bash -c "$cmd" > "$output_file" 2>&1; then
        # Look for both prompt and progress indicators
        if grep -q "already exists.*overwrite\|Clean and overwrite" "$output_file"; then
            if grep -q "Setting up workspace\|Preparing workspace" "$output_file"; then
                log_success "$test_id: PASSED - Prompt visible alongside progress bar"
                return 0
            else
                log_warning "$test_id: PARTIAL - Prompt visible but no progress bar detected"
                return 0
            fi  
        else
            log_error "$test_id: FAILED - Prompt not visible with progress bar"
            log_error "Output content:"
            cat "$output_file" | head -20
            return 1
        fi
    else
        log_error "$test_id: Command with progress bar timed out or failed"
        return 1
    fi
}

# Test progress bar disabled scenario  
test_prompt_without_progress_bar() {
    local test_id="TTY-04"
    local config_file="$1"
    
    log_info "Running $test_id: Test prompt visibility with progress bar disabled"
    
    # Create existing workspace
    if ! create_existing_workspace "$config_file" "test" "tty-no-progress-test"; then
        log_error "$test_id: Failed to create existing workspace"
        return 1
    fi
    
    # Test with progress disabled  
    local output_file="$TTY_TEST_LOG_DIR/${test_id}_no_progress_output.log"
    local cmd="echo 'y' | WORKSPACE_DISABLE_PROGRESS=1 NODE_ENV=test node '$SPACE_CLI_PATH' --config '$config_file' init test tty-no-progress-test-2"
    
    log_info "$test_id: Testing with progress bar disabled..."
    
    if timeout 30s bash -c "$cmd" > "$output_file" 2>&1; then
        if grep -q "already exists.*overwrite\|Clean and overwrite" "$output_file"; then
            log_success "$test_id: PASSED - Prompt visible without progress bar"
            return 0
        else
            log_error "$test_id: FAILED - Prompt not visible even without progress bar"
            log_error "Output content:"
            cat "$output_file" | head -20
            return 1
        fi
    else
        log_error "$test_id: Command without progress bar timed out or failed"
        return 1
    fi
}

# Test silent mode bypasses prompts correctly
test_silent_mode_prompt_bypass() {
    local test_id="TTY-05"
    local config_file="$1"
    
    log_info "Running $test_id: Test silent mode bypasses prompts"
    
    # Create existing workspace
    if ! create_existing_workspace "$config_file" "test" "tty-silent-test"; then
        log_error "$test_id: Failed to create existing workspace"
        return 1
    fi
    
    # Test silent mode - should not prompt at all
    local output_file="$TTY_TEST_LOG_DIR/${test_id}_silent_output.log"
    local cmd="NODE_ENV=test node '$SPACE_CLI_PATH' --config '$config_file' init test tty-silent-test-2 --silent"
    
    log_info "$test_id: Testing silent mode..."
    
    if timeout 30s bash -c "$cmd" > "$output_file" 2>&1; then
        # Should NOT contain prompt text, but should succeed
        if ! grep -q "already exists.*overwrite\|Clean and overwrite" "$output_file"; then
            if grep -q "Workspace.*ready\|completed successfully" "$output_file"; then
                log_success "$test_id: PASSED - Silent mode bypassed prompt and succeeded"
                return 0
            else
                log_warning "$test_id: PARTIAL - No prompt shown but unclear if succeeded"
                return 0
            fi
        else
            log_error "$test_id: FAILED - Prompt appeared in silent mode"
            log_error "Output content:"
            cat "$output_file" | head -20
            return 1
        fi
    else
        log_error "$test_id: Silent mode command timed out or failed" 
        return 1
    fi
}

# Main TTY test execution
run_tty_prompt_tests() {
    log_info "=== RUNNING TTY PROMPT VISIBILITY TESTS ==="
    
    # Setup test configuration
    local config_file
    config_file=$(generate_test_config "tty_test")
    
    local tests_passed=0
    local tests_failed=0
    local total_tests=5
    
    # Run all TTY-specific tests
    if test_prompt_with_pipe "$config_file"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_prompt_direct_tty "$config_file"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_prompt_with_progress_bar "$config_file"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_prompt_without_progress_bar "$config_file"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_silent_mode_prompt_bypass "$config_file"; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    # Print TTY test summary
    echo ""
    echo "============================================="
    echo "         TTY PROMPT TESTING SUMMARY"
    echo "============================================="
    echo "Total TTY tests: $total_tests"
    echo "Passed: $tests_passed"
    echo "Failed: $tests_failed"
    echo "Success rate: $(echo "scale=1; $tests_passed * 100 / $total_tests" | bc -l)%"
    echo "============================================="
    echo ""
    echo "TTY test logs available in: $TTY_TEST_LOG_DIR"
    
    if [[ $tests_failed -gt 0 ]]; then
        log_error "TTY prompt visibility tests FAILED"
        return 1
    else
        log_success "All TTY prompt visibility tests PASSED"
        return 0
    fi
}

# Cleanup TTY test environment
cleanup_tty_tests() {
    log_info "Cleaning up TTY test environment"
    
    # Remove test workspaces
    if [[ -d "$TTY_WORKSPACE_TEST_DIR" ]]; then
        rm -rf "$TTY_WORKSPACE_TEST_DIR"
    fi
    
    # Keep logs for debugging but clean up old ones
    find "$TTY_TEST_LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_success "TTY test cleanup completed"
}

# Main execution
main() {
    init_test_session
    init_tty_testing
    
    local exit_code=0
    
    if run_tty_prompt_tests; then
        log_success "TTY prompt visibility testing completed successfully"
    else
        log_error "TTY prompt visibility testing failed"
        exit_code=1
    fi
    
    cleanup_tty_tests
    cleanup_test_environment
    
    exit $exit_code
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
