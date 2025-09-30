#!/bin/bash

# E2E Test for JavaScript/TypeScript Stack
# Tests real workspace creation, post-init commands, environment setup

set -euo pipefail

# Source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
source "$SCRIPT_DIR/stack-configs.sh"

# Test configuration
TEST_NAME="javascript-stack"
TIMEOUT_BUILD=300    # 5 minutes for builds
CLEANUP_ON_EXIT=true

# Test results tracking
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()

main() {
    log_info "🧪 JavaScript/TypeScript Stack E2E Test"
    
    # Setup test environment
    setup_test_environment "$TEST_NAME"
    
    # Generate JavaScript stack configuration
    local config_file="$TEST_BASE_DIR/configs/javascript.yaml"
    generate_javascript_config "$config_file"
    generate_test_env_files "$TEST_BASE_DIR/env-files"
    
    # Phase 1: Test Workspace Creation
    log_phase "Phase 1: Workspace Creation"
    test_workspace_creation "$config_file"
    
    # Phase 2: Test Environment Files
    log_phase "Phase 2: Environment File Handling"
    test_environment_files "$config_file"
    
    # Phase 3: Test Post-Init Commands
    log_phase "Phase 3: Post-Init Command Execution"
    test_post_init_execution "$config_file"
    
    # Phase 4: Test Git Worktree Structure
    log_phase "Phase 4: Git Worktree Validation"
    test_git_worktree_structure "$config_file"
    
    # Phase 5: Test Sample Repository
    log_phase "Phase 5: Sample Repository Integration"
    test_sample_repository "$config_file"
    
    # Show final results
    show_test_results
}

# Test 1: Workspace Creation
test_workspace_creation() {
    local config_file="$1"
    local test_name="workspace_creation"
    
    log_test_start "$test_name" "Testing real workspace creation for JavaScript project"
    
    # Create workspace using space CLI
    cd "$TEST_BASE_DIR"
    timeout 120 "${SPACE_CLI}" init --config "$config_file" --non-interactive js-test feature/e2e-test 2>&1
    
    # Wait a moment for filesystem to sync
    sleep 2
    
    # Verify workspace directory was created
    local workspace_dir="src/workspaces/js-test/feature/e2e-test"
    if [[ -d "$workspace_dir" ]]; then
        log_debug "✅ Workspace directory created: $workspace_dir"
        
        # Verify main repository was cloned
        if [[ -d "$workspace_dir/is" ]]; then
            log_debug "✅ Main repository cloned successfully"
            test_passed "$test_name" "Workspace creation successful"
            return 0
        else
            test_failed "$test_name" "Main repository not found in workspace"
            return 1
        fi
    else
        test_failed "$test_name" "Workspace directory not created"
        return 1
    fi
}

# Test 2: Environment Files
test_environment_files() {
    local config_file="$1"
    local test_name="environment_files"
    
    log_test_start "$test_name" "Testing environment file copying"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/js-test/feature/e2e-test"
    local env_file="$workspace_dir/awesome/.env.local"
    
    if [[ -f "$env_file" ]]; then
        log_debug "✅ Environment file copied to workspace"
        
        # Verify content
        if grep -q "NODE_ENV=test" "$env_file"; then
            log_debug "✅ Environment file content is correct"
            test_passed "$test_name" "Environment files handled correctly"
            return 0
        else
            test_failed "$test_name" "Environment file content is incorrect"
            return 1
        fi
    else
        test_failed "$test_name" "Environment file not found in workspace"
        return 1
    fi
}

# Test 3: Post-Init Command Execution
test_post_init_execution() {
    local config_file="$1"
    local test_name="post_init_execution"
    
    log_test_start "$test_name" "Testing post-init command execution"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/js-test/feature/e2e-test"
    
    # Check if post-init command executed (simple validation)
    if [[ -f "$workspace_dir/is/package.json" ]]; then
        log_debug "✅ Post-init command executed - package.json found"
        test_passed "$test_name" "Post-init commands executed"
        return 0
    else
        test_failed "$test_name" "No evidence of post-init execution - package.json not found"
        return 1
    fi
}

# Test 4: Git Worktree Structure
test_git_worktree_structure() {
    local config_file="$1"
    local test_name="git_worktree_structure"
    
    log_test_start "$test_name" "Testing git worktree structure"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/js-test/feature/e2e-test"
    
    cd "$workspace_dir/is"
    
    # Check if we're in a git repository
    if git rev-parse --git-dir >/dev/null 2>&1; then
        log_debug "✅ Workspace is a valid git repository"
        
        # Check current branch
        local current_branch
        current_branch=$(git branch --show-current)
        if [[ "$current_branch" == "feature/e2e-test" ]]; then
            log_debug "✅ Correct branch checked out: $current_branch"
            test_passed "$test_name" "Git worktree structure validated"
            return 0
        else
            test_failed "$test_name" "Wrong branch checked out: $current_branch"
            return 1
        fi
    else
        test_failed "$test_name" "Workspace is not a git repository"
        return 1
    fi
}

# Test 5: Sample Repository Integration
test_sample_repository() {
    local config_file="$1"
    local test_name="sample_repository"
    
    log_test_start "$test_name" "Testing sample repository integration"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/js-test/feature/e2e-test"
    
    # Check if sample repository was cloned
    if [[ -d "$workspace_dir/awesome" ]]; then
        log_debug "✅ Sample repository cloned successfully"
        
        # Verify it's a valid git repository (worktree or regular)
        cd "$workspace_dir/awesome"
        if git rev-parse --git-dir >/dev/null 2>&1; then
            log_debug "✅ Sample repository is a valid git repo"
            test_passed "$test_name" "Sample repository integration successful"
            return 0
        else
            test_failed "$test_name" "Sample repository is not a valid git repo"
            return 1
        fi
    else
        test_failed "$test_name" "Sample repository not found"
        return 1
    fi
}

# Show comprehensive test results
show_test_results() {
    local total_tests=$(( ${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]} ))
    local pass_rate=0
    
    if [[ $total_tests -gt 0 ]]; then
        pass_rate=$(( ${#PASSED_TESTS[@]} * 100 / total_tests ))
    fi
    
    log_info ""
    log_info "📊 JavaScript Stack E2E Test Results"
    log_info "===================================="
    log_info "Total Tests: $total_tests"
    log_info "Passed: ${#PASSED_TESTS[@]}"
    log_info "Failed: ${#FAILED_TESTS[@]}"
    log_info "Pass Rate: ${pass_rate}%"
    log_info ""
    
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        log_error "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            log_error "  - $test"
        done
        log_info ""
    fi
    
    if [[ $pass_rate -lt 100 ]]; then
        log_error "🚨 Not all tests passed - JavaScript stack E2E failed"
        exit 1
    else
        log_success "🎉 JavaScript stack E2E tests completed successfully!"
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
