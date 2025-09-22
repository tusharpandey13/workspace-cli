#!/bin/bash

# Test just FAIL-07 in isolation
set -euo pipefail

# Source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

# Setup test environment
setup_test_environment

# Test FAIL-07
log_info "Testing FAIL-07 with --no-config flag"
run_test_case "FAIL-07" "Commands without config" 0 "No workspaces found" "" \
    --no-config list --non-interactive

log_info "FAIL-07 test completed"
