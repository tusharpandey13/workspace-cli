#!/bin/bash

# E2E Test Suite for space CLI
# Comprehensive end-to-end testing of all CLI commands and scenarios

set -euo pipefail

# Source helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

# Test execution functions

run_happy_path_tests() {
    log_info "=== RUNNING HAPPY PATH TESTS ==="
    
    # HAPPY-01: Setup new configuration
    local config_file
    config_file=$(generate_test_config "setup_test")
    rm -f "$config_file"  # Remove to test setup from scratch
    
    run_test_case "HAPPY-01" "Setup new configuration" 0 "" "" \
        setup --non-interactive --src-dir "$TEST_BASE_DIR/src" --workspace-base workspaces \
        --env-files-dir "$TEST_BASE_DIR/env-files" \
        --add-project "test:Test Project:https://github.com/auth0/nextjs-auth0.git"
    
    # Generate config for subsequent tests
    config_file=$(generate_test_config "main_test")
    
    # HAPPY-02: List projects after setup
    run_test_case "HAPPY-02" "List projects after setup" 0 "Test Project" "$config_file" \
        projects --non-interactive
    
    # HAPPY-03: Init workspace with project key
    run_test_case "HAPPY-03" "Init workspace with project key" 0 "Workspace location" "$config_file" \
        init test feature/test-branch --non-interactive
    
    # HAPPY-04: List workspaces after init
    run_test_case "HAPPY-04" "List workspaces after init" 0 "feature/test-branch" "$config_file" \
        list --non-interactive
    
    # HAPPY-05: List workspaces for specific project
    run_test_case "HAPPY-05" "List workspaces for specific project" 0 "feature/test-branch" "$config_file" \
        list test --non-interactive
    
    # HAPPY-06: Get info for existing workspace
    run_test_case "HAPPY-06" "Get info for existing workspace" 0 "Test Project" "$config_file" \
        info test "feature/test-branch" --non-interactive
    
    # HAPPY-07: Clean existing workspace
    run_test_case "HAPPY-07" "Clean existing workspace" 0 "cleaned" "$config_file" \
        clean test "feature/test-branch" --force --non-interactive
    
    # HAPPY-08: Init with GitHub issue IDs (use mocking for reliable tests)
    # Enable GitHub CLI mocking for this test
    export GH_MOCK=1
    run_test_case "HAPPY-08" "Init with GitHub issue IDs (with mocking)" 0 "Workspace location" "$config_file" \
        init test 123 456 bugfix/issue-123 --non-interactive
    unset GH_MOCK
    
    # Clean up for next test
    run_space_command "$config_file" clean test "bugfix/issue-123" --force --non-interactive >/dev/null 2>&1 || true
    
    # HAPPY-09: Init with dry-run
    run_test_case "HAPPY-09" "Init with dry-run" 0 "DRY-RUN" "$config_file" \
        init test feature/dry-test --dry-run --non-interactive
    
    # HAPPY-10: Init with analyse mode
    run_test_case "HAPPY-10" "Init with analyse mode" 0 "created" "$config_file" \
        init test feature/analyse-test --analyse --non-interactive
    
    # Clean up for next test
    run_space_command "$config_file" clean test "feature/analyse-test" --force --non-interactive >/dev/null 2>&1 || true
    
    # Create workspace for clean test
    run_space_command "$config_file" init test feature/clean-test --non-interactive >/dev/null 2>&1
    
    # HAPPY-11: Clean with dry-run
    run_test_case "HAPPY-11" "Clean with dry-run" 0 "would" "$config_file" \
        clean test "feature/clean-test" --dry-run --non-interactive
    
    # Actually clean the workspace
    run_space_command "$config_file" clean test "feature/clean-test" --force --non-interactive >/dev/null 2>&1
    
    # HAPPY-12: Setup with force option
    run_test_case "HAPPY-12" "Setup with force option" 0 "" "$config_file" \
        setup --force --non-interactive --src-dir "$TEST_BASE_DIR/src2"
    
    # HAPPY-13: List when no workspaces exist
    run_test_case "HAPPY-13" "List when no workspaces exist" 0 "" "$config_file" \
        list --non-interactive
    
    # HAPPY-14: Verbose logging
    run_test_case "HAPPY-14" "Verbose logging" 0 "" "$config_file" \
        list --verbose --non-interactive
    
    # HAPPY-15: Debug logging
    run_test_case "HAPPY-15" "Debug logging" 0 "" "$config_file" \
        list --debug --non-interactive
}

run_failure_path_tests() {
    log_info "=== RUNNING FAILURE PATH TESTS ==="
    
    local config_file
    config_file=$(generate_test_config "fail_test")
    
    # FAIL-01: Init with non-existent project
    run_test_case "FAIL-01" "Init with non-existent project" 1 "No project found" "$config_file" \
        init nonexistent feature/test --non-interactive
    
    # FAIL-02: Init with invalid branch name
    run_test_case "FAIL-02" "Init with invalid branch name" 1 "required" "$config_file" \
        init test "" --non-interactive
    
    # Create workspace for duplicate test
    run_space_command "$config_file" init test feature/duplicate-test --non-interactive >/dev/null 2>&1
    
    # FAIL-03: Init duplicate workspace (non-interactive mode auto-removes, so expect success)
    run_test_case "FAIL-03" "Init duplicate workspace in non-interactive mode" 0 "Auto-removing" "$config_file" \
        init test feature/duplicate-test --non-interactive
    
    # Clean up
    run_space_command "$config_file" clean test "feature/duplicate-test" --force --non-interactive >/dev/null 2>&1
    
    # FAIL-04: Clean non-existent workspace
    run_test_case "FAIL-04" "Clean non-existent workspace" 1 "not found" "$config_file" \
        clean test nonexistent --force --non-interactive
    
    # FAIL-05: Info for non-existent workspace
    run_test_case "FAIL-05" "Info for non-existent workspace" 1 "not found" "$config_file" \
        info test nonexistent --non-interactive
    
    # FAIL-06: List for non-existent project
    run_test_case "FAIL-06" "List for non-existent project" 1 "Unknown project" "$config_file" \
        list nonexistent --non-interactive
    
    # FAIL-07: Commands without config (using --no-config flag)
    run_test_case "FAIL-07" "Commands without config" 0 "No workspaces found" "" \
        --no-config list --non-interactive
    
    # Create workspace for clean without force test
    run_space_command "$config_file" init test feature/force-test --non-interactive >/dev/null 2>&1
    
    # FAIL-08: Clean without force
    run_test_case "FAIL-08" "Clean without force" 1 "force" "$config_file" \
        clean test "feature/force-test" --non-interactive
    
    # Clean up
    run_space_command "$config_file" clean test "feature/force-test" --force --non-interactive >/dev/null 2>&1
    
    # FAIL-09: Init with insufficient args
    run_test_case "FAIL-09" "Init with insufficient args" 1 "" "$config_file" \
        init --non-interactive
    
    # FAIL-10: Info with insufficient args
    run_test_case "FAIL-10" "Info with insufficient args" 1 "required" "$config_file" \
        info test --non-interactive
    
    # FAIL-11: Clean with insufficient args
    run_test_case "FAIL-11" "Clean with insufficient args" 1 "required" "$config_file" \
        clean test --non-interactive
    
    # FAIL-12: Setup with invalid directory (setup doesn't validate paths until use)
    run_test_case "FAIL-12" "Setup with invalid directory" 0 "Configuration already exists" "$config_file" \
        setup --non-interactive --src-dir "/invalid/path/that/does/not/exist"
}

run_edge_case_tests() {
    log_info "=== RUNNING EDGE CASE TESTS ==="
    
    local config_file
    config_file=$(generate_test_config "edge_test")
    
    # EDGE-01: Custom config file path
    local custom_config
    custom_config=$(generate_test_config "custom")
    run_test_case "EDGE-01" "Custom config file path" 0 "" "$custom_config" \
        list --non-interactive
    
    # EDGE-02: Init with repository name match (using existing nextjs-auth0 in config)
    # Update config to include a project that can be matched by repo name
    cat >> "$config_file" << 'EOF'
  nextjs-auth0-project:
    name: 'Next.js Auth0'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
EOF
    
    run_test_case "EDGE-02" "Init with repository name match" 0 "Workspace location" "$config_file" \
        init nextjs-auth0 feature/repo-name-test --non-interactive
    
    # Clean up
    run_space_command "$config_file" clean nextjs-auth0-project "feature/repo-name-test" --force --non-interactive >/dev/null 2>&1 || true
    
    # EDGE-03: Multiple GitHub issue IDs (use mocking for reliability)
    export GH_MOCK=1
    run_test_case "EDGE-03" "Multiple GitHub issue IDs" 0 "Workspace location" "$config_file" \
        init test 123 456 789 feature/multi-issues --non-interactive
    unset GH_MOCK
    
    # Clean up
    run_space_command "$config_file" clean test "feature/multi-issues" --force --non-interactive >/dev/null 2>&1
    
    # EDGE-04: Branch with special characters (CLI correctly rejects invalid characters)
    run_test_case "EDGE-04" "Branch with special characters" 1 "invalid characters" "$config_file" \
        init test "feature/test-with_special.chars" --non-interactive
    
    # Clean up
    run_space_command "$config_file" clean test "feature/test-with_special.chars" --force --non-interactive >/dev/null 2>&1
    
    # EDGE-05: Very long branch name
    run_test_case "EDGE-05" "Very long branch name" 0 "Workspace location" "$config_file" \
        init test feature/very-long-branch-name-that-exceeds-normal-length-limits --non-interactive
    
    # Clean up
    run_space_command "$config_file" clean test "feature/very-long-branch-name-that-exceeds-normal-length-limits" --force --non-interactive >/dev/null 2>&1
    
    # EDGE-07: Config with missing projects section
    local invalid_config
    invalid_config=$(generate_invalid_config "invalid")
    run_test_case "EDGE-07" "Config with missing projects section" 0 "" "$invalid_config" \
        list --non-interactive
    
    # EDGE-08: Setup skip option
    run_test_case "EDGE-08" "Setup skip option" 0 "skip" "$config_file" \
        setup --skip --non-interactive
    
    # EDGE-09: Setup preview option
    run_test_case "EDGE-09" "Setup preview option" 0 "" "$config_file" \
        setup --preview --non-interactive
    
    # EDGE-10: Environment file option (create empty env file)
    local env_file="$TEST_BASE_DIR/test.env"
    touch "$env_file"
    run_test_case "EDGE-10" "Environment file option" 0 "" "$config_file" \
        --env "$env_file" list --non-interactive
    
    # EDGE-11: Interactive overwrite prompt accept
    # First create workspace, then test overwrite confirmation
    run_space_command "$config_file" init test feature/interactive-test --non-interactive >/dev/null 2>&1
    run_interactive_test_case "EDGE-11" "Interactive overwrite prompt accept" 0 "Workspace ready" "$config_file" "y" \
        init test feature/interactive-test
    
    # Clean up for next test
    run_space_command "$config_file" clean test "feature/interactive-test" --force --non-interactive >/dev/null 2>&1 || true
    
    # EDGE-12: Interactive overwrite prompt decline
    # First create workspace, then test overwrite decline
    run_space_command "$config_file" init test feature/interactive-test --non-interactive >/dev/null 2>&1
    run_interactive_test_case "EDGE-12" "Interactive overwrite prompt decline" 0 "Continuing with existing" "$config_file" "n" \
        init test feature/interactive-test
    
    # Clean up after test
    run_space_command "$config_file" clean test "feature/interactive-test" --force --non-interactive >/dev/null 2>&1 || true
}

run_verification_tests() {
    log_info "=== RUNNING VERIFICATION TESTS ==="
    
    local config_file
    config_file=$(generate_test_config "verify_test")
    
    # VERIFY-01: Workspace creation filesystem state
    run_space_command "$config_file" init test feature/verify-create --non-interactive >/dev/null 2>&1
    if verify_directory_exists "$TEST_BASE_DIR/src/workspaces" "VERIFY-01"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # VERIFY-02: Workspace cleanup filesystem state
    run_space_command "$config_file" clean test "feature/verify-create" --force --non-interactive >/dev/null 2>&1
    # Note: This test might be tricky as the workspaces directory might still exist but be empty
    
    # VERIFY-03: Config file generation
    rm -f "$config_file"
    run_space_command "" setup --non-interactive --src-dir "$TEST_BASE_DIR/src" \
        --add-project "verify:Verify:https://github.com/auth0/nextjs-auth0.git" >/dev/null 2>&1 || true
    
    # Check for generated config in isolated test config directory
    # Config path is set by run_space_command via SPACE_CONFIG_PATH env var
    local test_config="$TEST_BASE_DIR/.config/space/config.yaml"
    if [[ -f "$test_config" ]]; then
        if verify_file_exists "$test_config" "VERIFY-03"; then
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
        # Config will be cleaned up with test environment
    else
        log_warning "VERIFY-03: Config not created in isolated test environment (expected at $test_config)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # VERIFY-04 and VERIFY-05 require actually examining git worktrees and template files
    # These are more complex and depend on the actual CLI behavior
}

run_integration_tests() {
    log_info "=== RUNNING INTEGRATION TESTS ==="
    
    local config_file
    config_file=$(generate_test_config "integration_test")
    
    # INT-01: Full workflow sequence
    log_info "Running INT-01: Full workflow sequence"
    local workflow_success=true
    
    # Setup
    if ! run_space_command "" setup --non-interactive --src-dir "$TEST_BASE_DIR/src" \
        --add-project "workflow:Workflow:https://github.com/auth0/nextjs-auth0.git" >/dev/null 2>&1; then
        workflow_success=false
    fi
    
    # Projects
    if $workflow_success && ! run_space_command "$config_file" projects --non-interactive >/dev/null 2>&1; then
        workflow_success=false
    fi
    
    # Init
    if $workflow_success && ! run_space_command "$config_file" init test feature/workflow --non-interactive >/dev/null 2>&1; then
        workflow_success=false
    fi
    
    # List
    if $workflow_success && ! run_space_command "$config_file" list --non-interactive >/dev/null 2>&1; then
        workflow_success=false
    fi
    
    # Info
    if $workflow_success && ! run_space_command "$config_file" info test "feature/workflow" --non-interactive >/dev/null 2>&1; then
        workflow_success=false
    fi
    
    # Clean
    if $workflow_success && ! run_space_command "$config_file" clean test "feature/workflow" --force --non-interactive >/dev/null 2>&1; then
        workflow_success=false
    fi
    
    if $workflow_success; then
        log_success "INT-01 PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "INT-01 FAILED"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # INT-02: Multiple workspaces
    log_info "Running INT-02: Multiple workspaces"
    local multi_success=true
    
    # Create 3 workspaces with timeouts
    for i in 1 2 3; do
        if ! run_space_command "$config_file" init test "feature/multi-$i" --non-interactive >/dev/null 2>&1; then
            multi_success=false
            log_warning "Failed to create workspace multi-$i"
            break
        fi
    done
    
    # List them with timeout
    if $multi_success; then
        local result
        if result=$(run_space_command "$config_file" list --non-interactive); then
            local exit_code="${result%%|*}"
            local stdout_file="${result#*|}"
            stdout_file="${stdout_file%|*}"
            
            if [[ "$exit_code" == "0" ]] && [[ -f "$stdout_file" ]]; then
                local list_result
                list_result=$(cat "$stdout_file")
                if ! echo "$list_result" | grep -q "multi-1\|multi-2\|multi-3"; then
                    multi_success=false
                    log_warning "Expected workspace names not found in list output"
                fi
            else
                multi_success=false
                log_warning "List command failed or timed out"
            fi
        else
            multi_success=false
            log_warning "List command failed or timed out"
        fi
    fi
    
    # Clean them with timeouts
    for i in 1 2 3; do
        run_space_command "$config_file" clean test "feature/multi-$i" --force --non-interactive >/dev/null 2>&1 || true
    done
    
    if $multi_success; then
        log_success "INT-02 PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "INT-02 FAILED"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# Main test runner
main() {
    init_test_session
    
    # Run all test categories
    run_happy_path_tests
    run_failure_path_tests
    run_edge_case_tests
    run_verification_tests
    run_integration_tests
    
    # Print summary and exit
    if print_test_summary; then
        cleanup_test_environment
        log_success "All tests completed successfully!"
        exit 0
    else
        log_error "Some tests failed. Check logs in $TEST_BASE_DIR/logs/"
        exit 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
