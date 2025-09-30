#!/bin/bash

# E2E test to reproduce the config loading bug

set -e

# Setup test environment
TEST_DIR="/tmp/space-cli-config-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create a config file with no projects section
cat > .space-config.yaml << 'EOF'
global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
  env_files_dir: './env-files'
EOF

echo "=== Test 1: Config file with no projects section ==="
echo "Created .space-config.yaml with global config but no projects:"
cat .space-config.yaml
echo ""

# Run space command (assuming it's in PATH or we'll use the built version)
echo "Running 'space' command..."
if command -v space >/dev/null 2>&1; then
    # Use global space command
    echo "Output from 'space':"
    space --non-interactive || echo "Command exited with code $?"
else
    # Use the built version from the project
    PROJECT_ROOT="/Users/tushar.pandey/src/workspace-cli"
    if [ -f "$PROJECT_ROOT/dist/bin/workspace.js" ]; then
        echo "Output from built space CLI:"
        node "$PROJECT_ROOT/dist/bin/workspace.js" --non-interactive || echo "Command exited with code $?"
    else
        echo "Space CLI not found in PATH and built version not found"
        exit 1
    fi
fi

echo ""
echo "=== Test 2: Config file with empty projects section ==="

cat > .space-config.yaml << 'EOF'
projects:

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
  env_files_dir: './env-files'
EOF

echo "Created .space-config.yaml with empty projects section:"
cat .space-config.yaml
echo ""

echo "Running 'space' command..."
if command -v space >/dev/null 2>&1; then
    space --non-interactive || echo "Command exited with code $?"
else
    PROJECT_ROOT="/Users/tushar.pandey/src/workspace-cli"
    if [ -f "$PROJECT_ROOT/dist/bin/workspace.js" ]; then
        node "$PROJECT_ROOT/dist/bin/workspace.js" --non-interactive || echo "Command exited with code $?"
    else
        echo "Space CLI not found in PATH and built version not found"
        exit 1
    fi
fi

echo ""
echo "=== Test 3: Config file with valid projects ==="

cat > .space-config.yaml << 'EOF'
projects:
  test-project:
    name: 'Test Project'
    repo: 'https://github.com/test/test.git'

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
  env_files_dir: './env-files'
EOF

echo "Created .space-config.yaml with valid project:"
cat .space-config.yaml
echo ""

echo "Running 'space' command..."
if command -v space >/dev/null 2>&1; then
    space --non-interactive || echo "Command exited with code $?"
else
    PROJECT_ROOT="/Users/tushar.pandey/src/workspace-cli"
    if [ -f "$PROJECT_ROOT/dist/bin/workspace.js" ]; then
        node "$PROJECT_ROOT/dist/bin/workspace.js" --non-interactive || echo "Command exited with code $?"
    else
        echo "Space CLI not found in PATH and built version not found"
        exit 1
    fi
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo ""
echo "=== E2E Test completed ==="
