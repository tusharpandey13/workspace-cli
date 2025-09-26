#!/bin/bash

# E2E Test Suite for Auth0 Factory Configurations
# Tests the complete workflow from repository accessibility to working sample apps

set -euo pipefail

# Source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
source "$SCRIPT_DIR/auth0-helpers.sh"

# Test configuration
TEST_NAME="auth0-factory-configs"
TIMEOUT_DEFAULT=120  # 2 minutes for most operations
TIMEOUT_BUILD=300    # 5 minutes for builds
CLEANUP_ON_EXIT=true

# Auth0 repositories to test (using correct GitHub repository names)
declare -a AUTH0_REPOS=(
    "node-auth0"
    "nextjs-auth0" 
    "auth0-spa-js"
    "auth0-java"
    "express-openid-connect"
    "auth0-angular"
    "auth0-vue"
    "auth0-react"
    "lock"
    "terraform-provider-auth0"
    "react-native-auth0"
    "wordpress"
    "java-jwt"
    "jwks-rsa-java"
)

# Selected repos for real execution testing (to balance coverage with performance)
declare -a AUTH0_REAL_TEST_REPOS=(
    "node-auth0"
    "nextjs-auth0" 
    "auth0-spa-js"
    "auth0-react"
)

# Test results tracking
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()
declare -A TEST_DETAILS=()

main() {
    log_info "🧪 Starting Auth0 Factory Configurations E2E Tests"
    log_info "Testing ${#AUTH0_REPOS[@]} Auth0 repositories"
    
    # Setup test environment
    setup_test_environment "$TEST_NAME"
    
    # Phase 1: Repository Accessibility Tests
    log_phase "Phase 1: Repository Accessibility"
    test_repository_accessibility
    
    # Phase 2: Basic CLI Integration Tests (Dry-Run)
    log_phase "Phase 2: Basic CLI Integration (Dry-Run)"
    test_basic_cli_integration
    
    # Phase 2.5: Real CLI Integration Tests (Selected Repos)
    log_phase "Phase 2.5: Real CLI Integration (Selected Repos)"
    test_real_cli_integration
    
    # Phase 3: Post-Init Command Tests
    log_phase "Phase 3: Post-Init Commands"
    test_post_init_commands
    
    # Phase 4: Sample App Functionality Tests
    log_phase "Phase 4: Sample App Functionality"
    test_sample_app_functionality
    
    # Report results
    report_test_results
    
    # Cleanup
    if [[ "$CLEANUP_ON_EXIT" == "true" ]]; then
        cleanup_test_environment "$TEST_NAME"
    fi
}

test_repository_accessibility() {
    for repo in "${AUTH0_REPOS[@]}"; do
        test_name="repo_access_${repo}"
        log_test_start "$test_name" "Testing repository accessibility for $repo"
        
        if test_auth0_repo_accessible "$repo"; then
            test_passed "$test_name" "Repository $repo is accessible"
        else
            test_failed "$test_name" "Repository $repo is not accessible"
        fi
    done
}

test_basic_cli_integration() {
    for repo in "${AUTH0_REPOS[@]}"; do
        test_name="cli_integration_${repo}"
        log_test_start "$test_name" "Testing CLI integration (dry-run) for $repo"
        
        if test_space_init_basic "$repo"; then
            test_passed "$test_name" "CLI integration (dry-run) works for $repo"
        else
            test_failed "$test_name" "CLI integration (dry-run) failed for $repo"
        fi
    done
}

test_real_cli_integration() {
    for repo in "${AUTH0_REAL_TEST_REPOS[@]}"; do
        test_name="real_cli_integration_${repo}"
        log_test_start "$test_name" "Testing REAL CLI integration for $repo"
        
        if test_space_init_real "$repo"; then
            test_passed "$test_name" "Real CLI integration works for $repo"
            # Clean up after successful test
            cleanup_real_workspace "$repo"
        else
            test_failed "$test_name" "Real CLI integration failed for $repo"
            # Try to clean up even after failure
            cleanup_real_workspace "$repo"
        fi
    done
}

test_post_init_commands() {
    for repo in "${AUTH0_REPOS[@]}"; do
        test_name="post_init_${repo}"
        log_test_start "$test_name" "Testing post-init commands for $repo"
        
        if test_post_init_execution "$repo"; then
            test_passed "$test_name" "Post-init commands work for $repo"
        else
            test_failed "$test_name" "Post-init commands failed for $repo"
        fi
    done
}

test_sample_app_functionality() {
    for repo in "${AUTH0_REPOS[@]}"; do
        test_name="sample_app_${repo}"
        log_test_start "$test_name" "Testing sample app functionality for $repo"
        
        if test_sample_app_builds "$repo"; then
            test_passed "$test_name" "Sample app builds for $repo"
        else
            test_failed "$test_name" "Sample app build failed for $repo"
        fi
    done
}

test_passed() {
    local test_name="$1"
    local message="$2"
    PASSED_TESTS+=("$test_name")
    TEST_DETAILS["$test_name"]="✅ PASS: $message"
    log_success "$message"
}

test_failed() {
    local test_name="$1"
    local message="$2"
    FAILED_TESTS+=("$test_name")
    TEST_DETAILS["$test_name"]="❌ FAIL: $message"
    log_error "$message"
}

report_test_results() {
    local total_tests=$((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]}))
    local pass_rate=$(( ${#PASSED_TESTS[@]} * 100 / total_tests ))
    
    log_info ""
    log_info "📊 Auth0 Factory Configurations Test Results"
    log_info "============================================"
    log_info "Total Tests: $total_tests"
    log_info "Passed: ${#PASSED_TESTS[@]}"
    log_info "Failed: ${#FAILED_TESTS[@]}"
    log_info "Pass Rate: ${pass_rate}%"
    log_info ""
    
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        log_error "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            log_error "  - ${TEST_DETAILS[$test]}"
        done
        log_info ""
    fi
    
    # Report specific results for dry-run vs real tests
    local dry_run_tests=0
    local real_tests=0
    for test in "${PASSED_TESTS[@]}"; do
        if [[ "$test" == real_* ]]; then
            ((real_tests++))
        else
            ((dry_run_tests++))
        fi
    done
    
    log_info "Dry-run tests passed: $dry_run_tests"
    log_info "Real execution tests passed: $real_tests"
    
    if [[ $pass_rate -lt 90 ]]; then
        log_error "🚨 Pass rate below 90% threshold"
        exit 1
    elif [[ $real_tests -lt ${#AUTH0_REAL_TEST_REPOS[@]} ]]; then
        log_error "🚨 Not all real execution tests passed"
        exit 1
    else
        log_success "🎉 Auth0 factory configurations validated with both dry-run and real execution!"
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
