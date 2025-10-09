#!/bin/bash
# Global space CLI wrapper that handles NODE_OPTIONS and PATH issues

# Enable verbose logging if DEBUG_SPACE_WRAPPER is set
if [ -n "$DEBUG_SPACE_WRAPPER" ]; then
    echo "DEBUG: Starting space-wrapper.sh" >&2
    echo "DEBUG: Current shell: $0" >&2
    echo "DEBUG: Arguments: $*" >&2
    echo "DEBUG: Working directory: $(pwd)" >&2
    echo "DEBUG: PATH: $PATH" >&2
    echo "DEBUG: NVM_BIN: ${NVM_BIN:-'not set'}" >&2
    echo "DEBUG: NVM_DIR: ${NVM_DIR:-'not set'}" >&2
fi

# Find node executable BEFORE clearing environment variables
NODE_BIN=""

# First, try to ensure NVM is loaded if it exists
if [ -z "$NVM_DIR" ] && [ -d "$HOME/.nvm" ]; then
    export NVM_DIR="$HOME/.nvm"
fi

if [ -n "$NVM_DIR" ] && [ -s "$NVM_DIR/nvm.sh" ] && [ -z "$NVM_BIN" ]; then
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Loading NVM environment..." >&2
    # Source NVM to load environment
    source "$NVM_DIR/nvm.sh" >/dev/null 2>&1
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: NVM loaded. NVM_BIN is now: ${NVM_BIN:-'still not set'}" >&2
fi

# Strategy 1: Use which command to find node in PATH
if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(which node)"
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node via 'which': $NODE_BIN" >&2
# Strategy 2: Check NVM_BIN environment variable
elif [ -n "$NVM_BIN" ] && [ -x "$NVM_BIN/node" ]; then
    NODE_BIN="$NVM_BIN/node"
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node via NVM_BIN: $NODE_BIN" >&2
# Strategy 3: Check common node installation paths
elif [ -x "/usr/local/bin/node" ]; then
    NODE_BIN="/usr/local/bin/node"
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node at /usr/local/bin/node" >&2
elif [ -x "/opt/homebrew/bin/node" ]; then
    NODE_BIN="/opt/homebrew/bin/node"
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node at /opt/homebrew/bin/node" >&2
# Strategy 4: Look for nvm installations in standard location
elif [ -d "$HOME/.nvm" ]; then
    # Find the latest node version in nvm - use more robust search
    NODE_BIN="$(find "$HOME/.nvm/versions/node" -type f -name "node" -executable 2>/dev/null | sort -V | tail -1)"
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node via find in ~/.nvm: $NODE_BIN" >&2
# Strategy 5: Try to source nvm and find node
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    # Source nvm in a subshell and get node path
    NODE_BIN="$(bash -c 'source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 && nvm use default >/dev/null 2>&1 && which node' 2>/dev/null)"
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node via sourcing nvm.sh: $NODE_BIN" >&2
fi

# If still not found, try one more comprehensive NVM strategy
if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm" ]; then
    [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Trying comprehensive NVM search..." >&2
    
    # Look for any node executable in .nvm
    for node_path in "$HOME/.nvm/versions/node"/*/bin/node; do
        if [ -x "$node_path" ]; then
            NODE_BIN="$node_path"
            [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Found node via comprehensive search: $NODE_BIN" >&2
            break
        fi
    done
    
    # If still not found, try sourcing NVM and getting current node
    if [ -z "$NODE_BIN" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
        [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: Attempting NVM initialization..." >&2
        NODE_BIN="$(export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm which current 2>/dev/null)"
        [ -n "$DEBUG_SPACE_WRAPPER" ] && echo "DEBUG: NVM current node: $NODE_BIN" >&2
    fi
fi

# Log all attempted strategies
if [ -n "$DEBUG_SPACE_WRAPPER" ]; then
    echo "DEBUG: Strategy results:" >&2
    echo "  - command -v node: $(command -v node 2>/dev/null || echo 'not found')" >&2
    echo "  - which node: $(which node 2>/dev/null || echo 'not found')" >&2
    echo "  - NVM_BIN/node: $([ -n "$NVM_BIN" ] && [ -x "$NVM_BIN/node" ] && echo "exists: $NVM_BIN/node" || echo 'not found')" >&2
    echo "  - /usr/local/bin/node: $([ -x '/usr/local/bin/node' ] && echo 'exists' || echo 'not found')" >&2
    echo "  - /opt/homebrew/bin/node: $([ -x '/opt/homebrew/bin/node' ] && echo 'exists' || echo 'not found')" >&2
    echo "  - ~/.nvm directory: $([ -d "$HOME/.nvm" ] && echo 'exists' || echo 'not found')" >&2
    echo "  - ~/.nvm/nvm.sh: $([ -s "$HOME/.nvm/nvm.sh" ] && echo 'exists' || echo 'not found')" >&2
    echo "DEBUG: Final NODE_BIN: ${NODE_BIN:-'EMPTY'}" >&2
fi

# Validate that we found a working node executable
if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
    echo "Error: Node.js not found. Please install Node.js or add it to your PATH." >&2
    echo "Attempted to find node in the following locations:" >&2
    echo "  - PATH: $(which node 2>/dev/null || echo 'not found')" >&2
    echo "  - NVM_BIN: ${NVM_BIN:-'not set'}" >&2
    echo "  - /usr/local/bin/node: $([ -x '/usr/local/bin/node' ] && echo 'exists' || echo 'not found')" >&2
    echo "  - /opt/homebrew/bin/node: $([ -x '/opt/homebrew/bin/node' ] && echo 'exists' || echo 'not found')" >&2
    echo "  - ~/.nvm directory: $([ -d "$HOME/.nvm" ] && echo 'exists' || echo 'not found')" >&2
    exit 1
fi

# NOW clear all VS Code debugging-related environment variables
unset NODE_OPTIONS
unset NODE_EXTRA_CA_CERTS
unset VSCODE_GIT_ASKPASS_NODE
unset VSCODE_INJECTION

# Find the workspace.js file location
SCRIPT_DIR="$(dirname "$0")"
WORKSPACE_JS=""

# Strategy 1: Local development (relative to wrapper)
if [ -f "$SCRIPT_DIR/dist/bin/workspace.js" ]; then
    WORKSPACE_JS="$SCRIPT_DIR/dist/bin/workspace.js"
# Strategy 2: Global npm installation (in lib/node_modules)
elif [ -f "$SCRIPT_DIR/../lib/node_modules/@tusharpandey13/space-cli/dist/bin/workspace.js" ]; then
    WORKSPACE_JS="$SCRIPT_DIR/../lib/node_modules/@tusharpandey13/space-cli/dist/bin/workspace.js"
# Strategy 3: Alternative global installation path
elif [ -f "$SCRIPT_DIR/../lib/node_modules/@tusharpandey13/space-cli/space-wrapper.sh" ]; then
    # If we find the wrapper in the package, use the workspace.js next to it
    WORKSPACE_JS="$SCRIPT_DIR/../lib/node_modules/@tusharpandey13/space-cli/dist/bin/workspace.js"
# Strategy 4: Look for any workspace.js in the node_modules tree
else
    WORKSPACE_JS="$(find "$SCRIPT_DIR/.." -name "workspace.js" -path "*/dist/bin/workspace.js" 2>/dev/null | head -1)"
fi

if [ -z "$WORKSPACE_JS" ] || [ ! -f "$WORKSPACE_JS" ]; then
    echo "Error: Cannot find workspace.js file. Please reinstall @tusharpandey13/space-cli." >&2
    exit 1
fi

# Execute the CLI with the found node binary
exec "$NODE_BIN" "$WORKSPACE_JS" "$@"
