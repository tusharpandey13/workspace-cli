#!/bin/bash
# E2E Test Safeguard System
# This script must be sourced at the beginning of all E2E tests
# It overrides dangerous commands to prevent destructive operations

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if safeguards are active
export E2E_SAFEGUARDS_ACTIVE=1

# Override git config to prevent global modifications
git() {
    # Check if command is trying to modify global config
    if [[ "$1" == "config" ]] && [[ "$2" == "--global" ]]; then
        echo -e "${RED}✗ BLOCKED: git config --global is prohibited in E2E tests${NC}" >&2
        echo -e "${YELLOW}  Use: git config --file \"\$TEST_GIT_CONFIG\" instead${NC}" >&2
        echo -e "${YELLOW}  Or use environment variables: GIT_AUTHOR_NAME, GIT_COMMITTER_NAME, etc.${NC}" >&2
        return 1
    fi
    
    # Allow all other git commands
    command git "$@"
}

# Override npm to prevent global config modifications
npm() {
    # Check if command is trying to modify global config
    if [[ "$1" == "config" ]] && ([[ "$2" == "--global" ]] || [[ "$2" == "-g" ]]); then
        echo -e "${RED}✗ BLOCKED: npm config --global is prohibited in E2E tests${NC}" >&2
        echo -e "${YELLOW}  Tests should not modify global npm configuration${NC}" >&2
        return 1
    fi
    
    # Allow all other npm commands
    command npm "$@"
}

# Validation function to check critical paths
validate_test_paths() {
    local operation="$1"
    local path="$2"
    
    # Check if path is in HOME but not in TEST_BASE_DIR
    if [[ "$path" == "$HOME"* ]] && [[ "$path" != "$TEST_BASE_DIR"* ]]; then
        # Exception: Allow reading but not modifying
        if [[ "$operation" == "write" ]] || [[ "$operation" == "modify" ]]; then
            echo -e "${RED}✗ BLOCKED: Attempting to modify file in HOME: $path${NC}" >&2
            echo -e "${YELLOW}  All test files must be in TEST_BASE_DIR: $TEST_BASE_DIR${NC}" >&2
            return 1
        fi
    fi
    
    # Check if trying to access real ~/.space-config.yaml
    if [[ "$path" == "$HOME/.space-config.yaml" ]] || [[ "$path" == "$HOME/.space-config.yaml.e2e-backup" ]]; then
        echo -e "${RED}✗ BLOCKED: Attempting to access user's config: $path${NC}" >&2
        echo -e "${YELLOW}  Use: \$TEST_BASE_DIR/home/.space-config.yaml instead${NC}" >&2
        return 1
    fi
    
    return 0
}

# Export the validation function so it's available in subshells
export -f validate_test_paths

# Validate that TEST_BASE_DIR is set and points to /tmp
if [[ -z "$TEST_BASE_DIR" ]]; then
    echo -e "${RED}✗ ERROR: TEST_BASE_DIR is not set${NC}" >&2
    echo -e "${YELLOW}  E2E tests require TEST_BASE_DIR to be set to a directory in /tmp${NC}" >&2
    exit 1
fi

if [[ "$TEST_BASE_DIR" != /tmp/* ]] && [[ "$TEST_BASE_DIR" != /private/tmp/* ]]; then
    echo -e "${RED}✗ ERROR: TEST_BASE_DIR must be in /tmp for safety${NC}" >&2
    echo -e "${YELLOW}  Current value: $TEST_BASE_DIR${NC}" >&2
    exit 1
fi

# Export git functions
export -f git
export -f npm

# Log that safeguards are active
if [[ -n "$VERBOSE" ]] || [[ -n "$DEBUG" ]]; then
    echo -e "${YELLOW}✓ E2E Test Safeguards Active${NC}"
    echo "  - git config --global: BLOCKED"
    echo "  - npm config --global: BLOCKED"
    echo "  - ~/.space-config.yaml access: BLOCKED"
    echo "  - TEST_BASE_DIR: $TEST_BASE_DIR"
fi
