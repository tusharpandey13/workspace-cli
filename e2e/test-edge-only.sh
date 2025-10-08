#!/bin/bash

# Run just the edge case tests including our new interactive tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

# Run just the edge case tests
init_test_session
run_edge_case_tests
print_test_summary
cleanup_test_environment
