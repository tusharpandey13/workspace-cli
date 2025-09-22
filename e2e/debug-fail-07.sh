#!/bin/bash

# Isolated FAIL-07 Test for Debugging
set -euo pipefail

# Source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

debug_fail_07() {
    log_info "=== DEBUGGING FAIL-07 TEST ==="
    
    # Setup test environment
    setup_test_environment
    local config_file
    config_file=$(generate_test_config "fail_07_debug")
    
    log_info "Test environment ready at: $TEST_BASE_DIR"
    log_info "Using config file: $config_file"
    
    # FAIL-07: Commands without config (temporarily move global configs)
    log_info "Starting FAIL-07 complex test..."
    
    local backup_files=()
    for global_config in "$HOME/.space-config.yaml" "$HOME/.workspace-config.yaml" "$PWD/config.yaml"; do
        log_info "Checking for global config: $global_config"
        if [[ -f "$global_config" ]]; then
            log_info "Backing up: $global_config"
            mv "$global_config" "${global_config}.backup" || {
                log_error "Failed to backup $global_config"
                return 1
            }
            backup_files+=("$global_config")
        else
            log_info "Not found: $global_config"
        fi
    done
    
    # Also remove any workspaces that might exist
    local src_backup=""
    if [[ -d "$HOME/src" ]]; then
        src_backup="$HOME/src.backup.$$"
        log_info "Backing up src directory: $HOME/src -> $src_backup"
        mv "$HOME/src" "$src_backup" || {
            log_error "Failed to backup src directory"
            # Restore configs before returning
            for global_config in "${backup_files[@]}"; do
                mv "${global_config}.backup" "$global_config" 2>/dev/null || true
            done
            return 1
        }
    fi
    
    log_info "Running test command: space --config /nonexistent/config.yaml list --non-interactive"
    
    # Run the actual test with detailed logging
    local result
    local exit_code=0
    
    set +e
    result=$(run_space_command "/nonexistent/config.yaml" list --non-interactive 2>&1)
    exit_code=$?
    set -e
    
    log_info "Command exit code: $exit_code"
    log_info "Command result: $result"
    
    # Parse result
    local actual_exit_code="${result%%|*}"
    local stdout_file="${result#*|}"
    stdout_file="${stdout_file%|*}"
    local stderr_file="${result##*|}"
    
    log_info "Parsed exit code: $actual_exit_code"
    log_info "Stdout file: $stdout_file"
    log_info "Stderr file: $stderr_file"
    
    # Read output files
    if [[ -f "$stdout_file" ]]; then
        log_info "STDOUT content:"
        cat "$stdout_file" || log_warning "Could not read stdout file"
    fi
    
    if [[ -f "$stderr_file" ]]; then
        log_info "STDERR content:"
        cat "$stderr_file" || log_warning "Could not read stderr file"
    fi
    
    # Restore backed up configs and src directory
    log_info "Restoring backed up files..."
    for global_config in "${backup_files[@]}"; do
        log_info "Restoring: ${global_config}.backup -> $global_config"
        mv "${global_config}.backup" "$global_config" || {
            log_error "Failed to restore $global_config"
        }
    done
    
    if [[ -n "$src_backup" && -d "$src_backup" ]]; then
        log_info "Restoring src directory: $src_backup -> $HOME/src"
        mv "$src_backup" "$HOME/src" || {
            log_error "Failed to restore src directory"
        }
    fi
    
    log_info "FAIL-07 debug completed"
}

# Run debug function
debug_fail_07
