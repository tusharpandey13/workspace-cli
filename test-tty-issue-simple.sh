#!/bin/bash

# Simple test to reproduce the exact TTY prompt visibility issue
# This mimics the user's specific test case

set -euo pipefail

# Create test directory
TEST_DIR="$HOME/tmp/tty-prompt-test"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Build the CLI first
echo "Building workspace CLI..."
cd /Users/tushar.pandey/src/workspace-cli
pnpm run build >/dev/null 2>&1

echo "=== TTY Prompt Issue Reproduction ==="

# Create minimal config for testing
cat > "$TEST_DIR/test-config.yaml" << 'EOF'
projects:
  next:
    name: 'Next.js Auth0'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git'
    
global:
  src_dir: '$TEST_DIR/src'
  workspace_base: 'workspaces'
  env_files_dir: '$TEST_DIR/env-files'
EOF

# Replace the placeholder in config
sed -i '' "s|\$TEST_DIR|$TEST_DIR|g" "$TEST_DIR/test-config.yaml"

echo "Test config created at: $TEST_DIR/test-config.yaml"

# First, create an existing workspace 
echo ""
echo "Step 1: Creating initial workspace..."
node "/Users/tushar.pandey/src/workspace-cli/dist/bin/workspace.js" \
    --config "$TEST_DIR/test-config.yaml" \
    init next test-overwrite --silent

# Verify workspace exists
WORKSPACE_PATH="$TEST_DIR/src/workspaces/next/test-overwrite"
if [[ -d "$WORKSPACE_PATH" ]]; then
    echo "✅ Initial workspace created at: $WORKSPACE_PATH"
else 
    echo "❌ Failed to create initial workspace"
    exit 1
fi

echo ""
echo "Step 2: Testing user's exact scenario..."

# Test the user's exact command that shows the issue
echo "🔍 Testing: space init next test-overwrite (should show prompt but doesn't)"
echo "Command: node workspace.js --config test-config.yaml init next test-overwrite"

timeout 10s node "/Users/tushar.pandey/src/workspace-cli/dist/bin/workspace.js" \
    --config "$TEST_DIR/test-config.yaml" \
    init next test-overwrite || echo "Command timed out or failed"

echo ""
echo "🔍 Testing: space init next test-overwrite | cat (user says this DOES show prompt)"
echo "Command: node workspace.js --config test-config.yaml init next test-overwrite | cat"

echo 'y' | timeout 10s node "/Users/tushar.pandey/src/workspace-cli/dist/bin/workspace.js" \
    --config "$TEST_DIR/test-config.yaml" \
    init next test-overwrite | cat || echo "Piped command timed out or failed"

echo ""
echo "=== Test completed ==="
echo "If you saw the overwrite prompt in the second test but not the first,"
echo "then we've reproduced the user's issue successfully."

# Cleanup
echo ""
echo "Cleaning up test directory: $TEST_DIR"
rm -rf "$TEST_DIR"
