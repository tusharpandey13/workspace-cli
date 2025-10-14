#!/bin/bash
# Safe E2E Test Execution Wrapper
# This script ensures all E2E tests run with non-destructive safeguards

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Safe E2E Test Execution"
echo "=========================================="
echo ""

# Step 1: Take snapshots
echo "Step 1: Taking pre-test snapshots..."
if "$SCRIPT_DIR/verify-non-destructive.sh" snapshot; then
    echo -e "${GREEN}✓ Snapshots created${NC}"
else
    echo -e "${RED}✗ Failed to create snapshots${NC}"
    exit 1
fi
echo ""

# Step 2: Run E2E tests
echo "Step 2: Running E2E tests with safeguards..."
cd "$PROJECT_ROOT"

# Ensure safeguards are loaded
export TEST_BASE_DIR="/tmp/space-e2e-tests-$$"
export VERBOSE=1

# Run the test suite
TEST_EXIT_CODE=0
if "$SCRIPT_DIR/test-suite.sh" "$@"; then
    echo -e "${GREEN}✓ E2E tests completed${NC}"
else
    TEST_EXIT_CODE=$?
    echo -e "${YELLOW}⚠ Some E2E tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi
echo ""

# Step 3: Verify non-destructiveness
echo "Step 3: Verifying non-destructive guarantees..."
if "$SCRIPT_DIR/verify-non-destructive.sh" verify; then
    echo -e "${GREEN}✓ All verification checks passed${NC}"
    echo -e "${GREEN}✓ Tests were completely non-destructive${NC}"
    VERIFY_EXIT_CODE=0
else
    echo -e "${RED}✗ Verification failed - tests modified user environment${NC}"
    VERIFY_EXIT_CODE=1
fi
echo ""

# Step 4: Report results
echo "=========================================="
echo "Test Execution Summary"
echo "=========================================="
if [[ $TEST_EXIT_CODE -eq 0 ]]; then
    echo -e "E2E Tests: ${GREEN}PASSED${NC}"
else
    echo -e "E2E Tests: ${YELLOW}FAILED (exit $TEST_EXIT_CODE)${NC}"
fi

if [[ $VERIFY_EXIT_CODE -eq 0 ]]; then
    echo -e "Non-Destructive Verification: ${GREEN}PASSED${NC}"
else
    echo -e "Non-Destructive Verification: ${RED}FAILED${NC}"
fi
echo ""

# Exit with appropriate code
if [[ $VERIFY_EXIT_CODE -ne 0 ]]; then
    echo -e "${RED}CRITICAL: Tests violated non-destructive guarantees${NC}"
    exit 1
elif [[ $TEST_EXIT_CODE -ne 0 ]]; then
    echo -e "${YELLOW}Tests failed but were non-destructive${NC}"
    exit "$TEST_EXIT_CODE"
else
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
fi
