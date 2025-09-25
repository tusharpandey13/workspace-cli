#!/bin/bash

# Test the new interactive test functions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/e2e/helpers.sh"

log_info "=== TESTING INTERACTIVE PROMPT FUNCTIONS ==="

# Initialize test environment
setup_test_environment
init_test_session

# Generate test config
config_file=$(generate_test_config "interactive_test")

log_info "Testing EDGE-11: Interactive overwrite prompt accept"
# First create workspace
run_space_command "$config_file" init test feature/interactive-test --non-interactive >/dev/null 2>&1

# Test interactive overwrite with 'y' input
run_interactive_test_case "EDGE-11" "Interactive overwrite prompt accept" 0 "Workspace ready" "$config_file" "y" \
    init test feature/interactive-test

# Clean up 
run_space_command "$config_file" clean test feature_interactive-test --force --non-interactive >/dev/null 2>&1 || true

log_info "Testing EDGE-12: Interactive overwrite prompt decline"  
# First create workspace again
run_space_command "$config_file" init test feature/interactive-test --non-interactive >/dev/null 2>&1

# Test interactive overwrite with 'n' input
run_interactive_test_case "EDGE-12" "Interactive overwrite prompt decline" 0 "Continuing with existing" "$config_file" "n" \
    init test feature/interactive-test

# Clean up
run_space_command "$config_file" clean test feature_interactive-test --force --non-interactive >/dev/null 2>&1 || true

# Print results
print_test_summary

# Cleanup
cleanup_test_environment

log_info "=== INTERACTIVE PROMPT TEST COMPLETED ==="
