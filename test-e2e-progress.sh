#!/bin/bash

# E2E Test Script for Progress Bar Issues
# This script captures real CLI output to analyze progress bar behavior

set -e

echo "=== E2E Progress Bar Test ==="
echo "Date: $(date)"
echo "Testing workspace CLI progress bar behavior"
echo

# Clean up any existing test workspace
TEST_WORKSPACE="/Users/tushar.pandey/src/workspaces/next/test_progress_e2e"
if [ -d "$TEST_WORKSPACE" ]; then
    echo "Cleaning up existing test workspace..."
    rm -rf "$TEST_WORKSPACE"
fi

# Test 1: Normal initialization (no existing workspace)
echo "=== Test 1: Normal Initialization ==="
echo "Running: space init --no-config next test/progress-e2e"
echo "Expected: Single progress bar, clean output"
echo

# Capture output to file
OUTPUT_FILE="test-output-normal.txt"
echo "Capturing output to: $OUTPUT_FILE"

# Run the command and capture both stdout and stderr
pnpm run build > /dev/null 2>&1
timeout 60s node dist/bin/workspace.js init --no-config next test/progress-e2e > "$OUTPUT_FILE" 2>&1 || true

echo "Output captured. Contents:"
echo "--- START OUTPUT ---"
cat "$OUTPUT_FILE"
echo "--- END OUTPUT ---"
echo

# Test 2: With existing workspace (should trigger overwrite prompt)
echo "=== Test 2: Existing Workspace (Overwrite Prompt) ==="
echo "Running same command again to trigger overwrite prompt"
echo "Expected: Visible prompt, no progress bar corruption"
echo

OUTPUT_FILE2="test-output-overwrite.txt"
echo "Capturing output to: $OUTPUT_FILE2"

# Run with expect to handle the interactive prompt
expect << 'EOF'
set timeout 60
spawn node dist/bin/workspace.js init --no-config next test/progress-e2e
expect {
    "Clean and overwrite?" {
        send "y\r"
        exp_continue
    }
    "Workspace initialization completed" {
        exit 0
    }
    timeout {
        exit 1
    }
    eof
}
EOF

echo "Overwrite test completed."
echo

# Test 3: With GitHub IDs (like user's example)
echo "=== Test 3: With GitHub IDs ==="
echo "Running: space init --no-config next 2326 bugfix/RT-same-scope-as-AT-test"
echo "Expected: GitHub validation message, single progress bar"
echo

OUTPUT_FILE3="test-output-github.txt"
echo "Capturing output to: $OUTPUT_FILE3"

# Clean workspace first
TEST_WORKSPACE_GITHUB="/Users/tushar.pandey/src/workspaces/next/bugfix_RT-same-scope-as-AT-test"
if [ -d "$TEST_WORKSPACE_GITHUB" ]; then
    rm -rf "$TEST_WORKSPACE_GITHUB"
fi

timeout 60s node dist/bin/workspace.js init --no-config next 2326 bugfix/RT-same-scope-as-AT-test > "$OUTPUT_FILE3" 2>&1 || true

echo "Output captured. Contents:"
echo "--- START OUTPUT ---"
cat "$OUTPUT_FILE3"
echo "--- END OUTPUT ---"
echo

# Analysis
echo "=== Analysis ==="
echo "Checking for common issues:"
echo

echo "1. Multiple progress bars (counting progress bar lines):"
grep -c '\[.*\]' "$OUTPUT_FILE" 2>/dev/null || echo "0"
echo

echo "2. Corrupted output (looking for text after progress bars):"
grep -E '\] [0-9]+/[0-9]+[a-zA-Z]' "$OUTPUT_FILE" "$OUTPUT_FILE3" 2>/dev/null || echo "None found"
echo

echo "3. Emoji duplication (counting emojis):"
grep -o '✅\|ℹ️\|🚀\|📝' "$OUTPUT_FILE" "$OUTPUT_FILE3" 2>/dev/null | wc -l || echo "0"
echo

echo "4. GitHub validation output:"
grep -i "github.*validated" "$OUTPUT_FILE3" 2>/dev/null || echo "Not found"
echo

echo "=== Test Summary ==="
echo "Output files created:"
ls -la test-output-*.txt 2>/dev/null || echo "No output files created"
echo

echo "E2E test completed. Review output files for issues."
