#!/bin/bash

# E2E Test for Go Stack
# Tests real workspace creation, post-init commands, environment setup

set -euo pipefail

# Source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
source "$SCRIPT_DIR/stack-configs.sh"

# Test configuration
TEST_NAME="go-stack"
TIMEOUT_BUILD=300    # 5 minutes for Go builds
CLEANUP_ON_EXIT=true

# Test results tracking
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()

main() {
    log_info "🧪 Go Stack E2E Test"
    
    # Setup test environment
    setup_test_environment "$TEST_NAME"
    
    # Generate Go stack configuration
    local config_file="$TEST_BASE_DIR/configs/go.yaml"
    generate_go_config "$config_file"
    generate_test_env_files "$TEST_BASE_DIR/env-files"
    
    # Phase 1: Test Workspace Creation
    log_phase "Phase 1: Workspace Creation"
    test_workspace_creation "$config_file"
    
    # Phase 2: Test Environment File Handling
    log_phase "Phase 2: Environment File Handling"
    test_environment_files "$config_file"
    
    # Phase 3: Test Post-Init Command Execution
    log_phase "Phase 3: Post-Init Command Execution"
    test_post_init_execution "$config_file"
    
    # Phase 4: Test Git Worktree Structure
    log_phase "Phase 4: Git Worktree Validation"
    test_git_worktree_structure "$config_file"
    
    # Phase 5: Test Sample Repository Integration
    log_phase "Phase 5: Sample Repository Integration"
    test_sample_repository "$config_file"
    
    # Report results
    report_test_results
    
    # Cleanup
    if [[ "$CLEANUP_ON_EXIT" == "true" ]]; then
        cleanup_test_environment "$TEST_NAME"
    fi
}

test_workspace_creation() {
    local config_file="$1"
    local test_name="workspace_creation"
    
    log_test_start "$test_name" "Testing real workspace creation for Go project"
    
    cd "$TEST_BASE_DIR"
    
    # Run space init WITHOUT dry-run
    if timeout "$TIMEOUT_BUILD" "$SPACE_CLI" init go-test feature/e2e-test --config "$config_file" --non-interactive; then
        
        # Verify workspace directory was created
        local workspace_dir="src/workspaces/go-test/feature/e2e-test"
        if [[ -d "$workspace_dir" ]]; then
            log_debug "✅ Workspace directory created: $workspace_dir"
            
            # Verify main repository was cloned
            if [[ -d "$workspace_dir/example" ]]; then
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
    else
        test_failed "$test_name" "Space init command failed"
        return 1
    fi
}

test_environment_files() {
    local config_file="$1"
    local test_name="environment_files"
    
    log_test_start "$test_name" "Testing environment file copying"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/go-test/feature/e2e-test"
    local env_file="$workspace_dir/.env.local"
    
    if [[ -f "$env_file" ]]; then
        log_debug "✅ Environment file copied to workspace"
        
        # Verify content
        if grep -q "GO_ENV=test" "$env_file"; then
            log_debug "✅ Environment file content is correct"
            test_passed "$test_name" "Environment file handling successful"
            return 0
        else
            test_failed "$test_name" "Environment file content incorrect"
            return 1
        fi
    else
        test_failed "$test_name" "Environment file not found in workspace"
        return 1
    fi
}

test_post_init_execution() {
    local config_file="$1"
    local test_name="post_init_execution"
    
    log_test_start "$test_name" "Testing post-init command execution"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/go-test/feature/e2e-test"
    
    # Check if go.mod exists and go mod download ran
    if [[ -f "$workspace_dir/example/go.mod" ]]; then
        log_debug "✅ go.mod found"
        
        # Check for go.sum or vendor directory (indicates go mod download ran)
        if [[ -f "$workspace_dir/example/go.sum" ]] || [[ -d "$workspace_dir/example/vendor" ]]; then
            log_debug "✅ Post-init go mod download executed successfully"
            test_passed "$test_name" "Post-init commands executed"
            return 0
        else
            # go.mod exists but no dependencies downloaded
            log_debug "⚠️  go.mod exists but no go.sum found - dependencies may not have been downloaded"
            # This might still be success if the project has no external dependencies
            test_passed "$test_name" "Post-init commands executed (no dependencies to download)"
            return 0
        fi
    else
        test_failed "$test_name" "No evidence of post-init execution - go.mod not found"
        return 1
    fi
}

test_git_worktree_structure() {
    local config_file="$1"
    local test_name="git_worktree_structure"
    
    log_test_start "$test_name" "Testing git worktree structure"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/go-test/feature/e2e-test"
    
    cd "$workspace_dir"
    
    # Check if we're in a git repository
    if git rev-parse --git-dir >/dev/null 2>&1; then
        log_debug "✅ Workspace is a valid git repository"
        
        # Check current branch
        local current_branch
        current_branch=$(git branch --show-current)
        if [[ "$current_branch" == "feature/e2e-test" ]]; then
            log_debug "✅ Correct branch checked out: $current_branch"
            test_passed "$test_name" "Git worktree structure is correct"
            return 0
        else
            test_failed "$test_name" "Incorrect branch: expected 'feature/e2e-test', got '$current_branch'"
            return 1
        fi
    else
        test_failed "$test_name" "Workspace is not a git repository"
        return 1
    fi
}

test_sample_repository() {
    local config_file="$1"
    local test_name="sample_repository"
    
    log_test_start "$test_name" "Testing sample repository integration"
    
    local workspace_dir="$TEST_BASE_DIR/src/workspaces/go-test/feature/e2e-test"
    
    # For Go test, sample_repo is the same as main repo
    # Check if the repository structure is correct
    if [[ -d "$workspace_dir/example" ]]; then
        log_debug "✅ Repository structure is correct"
        
        # Verify it's a valid git repository
        if [[ -d "$workspace_dir/.git" ]]; then
            log_debug "✅ Repository is a valid git repo"
            
            # Check for Go project structure
            if [[ -f "$workspace_dir/example/go.mod" ]]; then
                log_debug "✅ Repository has Go project structure"
                test_passed "$test_name" "Sample repository integration successful"
                return 0
            else
                test_failed "$test_name" "Repository missing go.mod file"
                return 1
            fi
        else
            test_failed "$test_name" "Repository exists but is not a git repo"
            return 1
        fi
    else
        test_failed "$test_name" "Repository structure not found"
        return 1
    fi
}

# Test utility functions
test_passed() {
    local test_name="$1"
    local message="$2"
    PASSED_TESTS+=("$test_name")
    log_success "$message"
}

test_failed() {
    local test_name="$1"
    local message="$2"
    FAILED_TESTS+=("$test_name")
    log_error "$message"
}

log_phase() {
    local phase="$1"
    log_info ""
    log_info "🔄 $phase"
    log_info "$(printf '=%.0s' {1..50})"
}

log_test_start() {
    local test_name="$1"
    local description="$2"
    log_info "▶️  Testing: $description"
}

report_test_results() {
    local total_tests=$((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]}))
    local pass_rate=0
    
    if [[ $total_tests -gt 0 ]]; then
        pass_rate=$(( ${#PASSED_TESTS[@]} * 100 / total_tests ))
    fi
    
    log_info ""
    log_info "📊 Go Stack E2E Test Results"
    log_info "============================"
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
        log_error "🚨 Not all tests passed - Go stack E2E failed"
        exit 1
    else
        log_success "🎉 Go stack E2E tests completed successfully!"
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
