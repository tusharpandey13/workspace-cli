#!/bin/bash
# Non-Destructive Test Verification System
# This script ensures E2E tests do not modify anything outside /tmp

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Use a fixed directory name so snapshot and verify can share it
SNAPSHOT_DIR="/tmp/space-test-snapshots-current"
mkdir -p "$SNAPSHOT_DIR"

# Snapshot functions
snapshot_git_config() {
    git config --global --list > "$SNAPSHOT_DIR/git-config.before" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/git-config.before"
}

snapshot_space_config() {
    if [[ -f "$HOME/.space-config.yaml" ]]; then
        cp "$HOME/.space-config.yaml" "$SNAPSHOT_DIR/space-config.before"
        md5sum "$HOME/.space-config.yaml" > "$SNAPSHOT_DIR/space-config.md5.before"
    else
        echo "NOT_EXISTS" > "$SNAPSHOT_DIR/space-config.before"
    fi
}

snapshot_npm_config() {
    npm config list --global > "$SNAPSHOT_DIR/npm-config.before" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/npm-config.before"
}

snapshot_home_files() {
    # List of files in HOME that should NOT be modified
    ls -la "$HOME/.git"* > "$SNAPSHOT_DIR/home-git-files.before" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/home-git-files.before"
    ls -la "$HOME/.npm"* > "$SNAPSHOT_DIR/home-npm-files.before" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/home-npm-files.before"
}

snapshot_env_vars() {
    env | sort > "$SNAPSHOT_DIR/env.before"
}

# Verification functions
verify_git_config() {
    git config --global --list > "$SNAPSHOT_DIR/git-config.after" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/git-config.after"
    
    if ! diff -q "$SNAPSHOT_DIR/git-config.before" "$SNAPSHOT_DIR/git-config.after" > /dev/null 2>&1; then
        echo -e "${RED}✗ VIOLATION: Git global config was modified!${NC}"
        echo "Changes detected:"
        diff "$SNAPSHOT_DIR/git-config.before" "$SNAPSHOT_DIR/git-config.after" || true
        return 1
    fi
    echo -e "${GREEN}✓ Git global config unchanged${NC}"
    return 0
}

verify_space_config() {
    if [[ -f "$SNAPSHOT_DIR/space-config.before" ]] && [[ "$(cat "$SNAPSHOT_DIR/space-config.before")" == "NOT_EXISTS" ]]; then
        if [[ -f "$HOME/.space-config.yaml" ]]; then
            echo -e "${RED}✗ VIOLATION: ~/.space-config.yaml was created!${NC}"
            return 1
        fi
    elif [[ -f "$HOME/.space-config.yaml" ]]; then
        md5sum "$HOME/.space-config.yaml" > "$SNAPSHOT_DIR/space-config.md5.after"
        if ! diff -q "$SNAPSHOT_DIR/space-config.md5.before" "$SNAPSHOT_DIR/space-config.md5.after" > /dev/null 2>&1; then
            echo -e "${RED}✗ VIOLATION: ~/.space-config.yaml was modified!${NC}"
            return 1
        fi
    fi
    echo -e "${GREEN}✓ Space config unchanged${NC}"
    return 0
}

verify_npm_config() {
    npm config list --global > "$SNAPSHOT_DIR/npm-config.after" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/npm-config.after"
    
    if ! diff -q "$SNAPSHOT_DIR/npm-config.before" "$SNAPSHOT_DIR/npm-config.after" > /dev/null 2>&1; then
        echo -e "${RED}✗ VIOLATION: npm global config was modified!${NC}"
        echo "Changes detected:"
        diff "$SNAPSHOT_DIR/npm-config.before" "$SNAPSHOT_DIR/npm-config.after" || true
        return 1
    fi
    echo -e "${GREEN}✓ npm global config unchanged${NC}"
    return 0
}

verify_home_files() {
    ls -la "$HOME/.git"* > "$SNAPSHOT_DIR/home-git-files.after" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/home-git-files.after"
    ls -la "$HOME/.npm"* > "$SNAPSHOT_DIR/home-npm-files.after" 2>/dev/null || echo "" > "$SNAPSHOT_DIR/home-npm-files.after"
    
    local violations=0
    
    if ! diff -q "$SNAPSHOT_DIR/home-git-files.before" "$SNAPSHOT_DIR/home-git-files.after" > /dev/null 2>&1; then
        echo -e "${RED}✗ VIOLATION: Git files in HOME were modified!${NC}"
        violations=1
    fi
    
    if ! diff -q "$SNAPSHOT_DIR/home-npm-files.before" "$SNAPSHOT_DIR/home-npm-files.after" > /dev/null 2>&1; then
        echo -e "${RED}✗ VIOLATION: npm files in HOME were modified!${NC}"
        violations=1
    fi
    
    if [[ $violations -eq 0 ]]; then
        echo -e "${GREEN}✓ HOME files unchanged${NC}"
    fi
    
    return $violations
}

verify_tmp_cleanup() {
    local temp_files=$(find /tmp -name "space-e2e-*" -o -name "space-test-*" 2>/dev/null | wc -l)
    
    if [[ $temp_files -gt 0 ]]; then
        echo -e "${YELLOW}⚠ Warning: ${temp_files} temp files still exist in /tmp${NC}"
        echo "These should be cleaned up:"
        find /tmp -name "space-e2e-*" -o -name "space-test-*" 2>/dev/null || true
        return 1
    fi
    echo -e "${GREEN}✓ All temp files cleaned up${NC}"
    return 0
}

# Main execution
main() {
    local mode="${1:-verify}"
    
    if [[ "$mode" == "snapshot" ]]; then
        echo "📸 Taking pre-test snapshots..."
        snapshot_git_config
        snapshot_space_config
        snapshot_npm_config
        snapshot_home_files
        snapshot_env_vars
        echo "✓ Snapshots saved to $SNAPSHOT_DIR"
        echo "Run with 'verify' after tests complete"
        
    elif [[ "$mode" == "verify" ]]; then
        echo "🔍 Verifying non-destructive guarantees..."
        echo ""
        
        local violations=0
        
        verify_git_config || violations=$((violations + 1))
        verify_space_config || violations=$((violations + 1))
        verify_npm_config || violations=$((violations + 1))
        verify_home_files || violations=$((violations + 1))
        verify_tmp_cleanup || violations=$((violations + 1))
        
        echo ""
        if [[ $violations -eq 0 ]]; then
            echo -e "${GREEN}========================================${NC}"
            echo -e "${GREEN}✓ ALL VERIFICATION CHECKS PASSED${NC}"
            echo -e "${GREEN}✓ Tests were completely non-destructive${NC}"
            echo -e "${GREEN}========================================${NC}"
            rm -rf "$SNAPSHOT_DIR"
            exit 0
        else
            echo -e "${RED}========================================${NC}"
            echo -e "${RED}✗ VERIFICATION FAILED${NC}"
            echo -e "${RED}✗ ${violations} violation(s) detected${NC}"
            echo -e "${RED}========================================${NC}"
            echo "Snapshot directory preserved at: $SNAPSHOT_DIR"
            exit 1
        fi
        
    else
        echo "Usage: $0 {snapshot|verify}"
        echo ""
        echo "  snapshot  - Take snapshots before running tests"
        echo "  verify    - Verify no changes after tests"
        exit 1
    fi
}

main "$@"
