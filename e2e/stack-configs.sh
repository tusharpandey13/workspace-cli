#!/bin/bash

# Stack-based configuration generator for E2E tests
# Creates test configurations for different technology stacks

set -euo pipefail

# Source helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

# Generate JavaScript/TypeScript stack configuration
generate_javascript_config() {
    local config_path="$1"
    local test_base_dir="${TEST_BASE_DIR:-$HOME/tmp/space-e2e-tests}"
    
    cat > "$config_path" << EOF
# JavaScript/TypeScript stack test configuration
projects:
  js-test:
    name: 'JavaScript Test Project'
    repo: 'https://github.com/sindresorhus/is.git'
    sample_repo: 'https://github.com/sindresorhus/awesome.git' 
    env_file: 'js-test.env.local'
    post-init: 'cd is && echo "JS workspace ready" && ls -la'

global:
  src_dir: '${test_base_dir}/src'
  workspace_base: 'workspaces'
  env_files_dir: '${test_base_dir}/env-files'

templates:
  dir: './src/templates'

workflows:
  branch_patterns:
    - 'feature/**'
    - 'test/**'
EOF
}

# Generate Java stack configuration  
generate_java_config() {
    local config_path="$1"
    local test_base_dir="${TEST_BASE_DIR:-$HOME/tmp/space-e2e-tests}"
    
    cat > "$config_path" << EOF
# Java stack test configuration
projects:
  java-test:
    name: 'Java Test Project'
    repo: 'https://github.com/spring-projects/spring-boot.git'
    sample_repo: 'https://github.com/spring-guides/gs-spring-boot.git'
    env_file: 'java-test.env.local'
    post-init: 'cd spring-boot && ./gradlew --version && echo "Java Gradle ready"'

global:
  src_dir: '${test_base_dir}/src'
  workspace_base: 'workspaces'
  env_files_dir: '${test_base_dir}/env-files'

templates:
  dir: './src/templates'

workflows:
  branch_patterns:
    - 'feature/**'
    - 'test/**'
EOF
}

# Generate Go stack configuration
generate_go_config() {
    local config_path="$1"
    local test_base_dir="${TEST_BASE_DIR:-$HOME/tmp/space-e2e-tests}"
    
    cat > "$config_path" << EOF
# Go stack test configuration  
projects:
  go-test:
    name: 'Go Test Project'
    repo: 'https://github.com/golang/example.git'
    sample_repo: 'https://github.com/golang/example.git'
    env_file: 'go-test.env.local'
    post-init: 'cd example && go mod download && echo "Go modules ready"'

global:
  src_dir: '${test_base_dir}/src'
  workspace_base: 'workspaces'
  env_files_dir: '${test_base_dir}/env-files'

templates:
  dir: './src/templates'

workflows:
  branch_patterns:
    - 'feature/**'
    - 'test/**'
EOF
}

# Generate PHP stack configuration
generate_php_config() {
    local config_path="$1"
    
    cat > "$config_path" << 'EOF'
# PHP stack test configuration
projects:
  php-test:
    name: 'PHP Test Project'
    repo: 'https://github.com/laravel/laravel.git'
    sample_repo: 'https://github.com/laravel/laravel.git'
    env_file: 'php-test.env.local'
    post-init: 'cd laravel && composer --version && echo "PHP Composer ready"'

global:
  src_dir: '${TEST_BASE_DIR}/src'
  workspace_base: 'workspaces'
  env_files_dir: '${TEST_BASE_DIR}/env-files'

templates:
  dir: './src/templates'

workflows:
  branch_patterns:
    - 'feature/**'
    - 'test/**'
EOF
}

# Generate Python stack configuration
generate_python_config() {
    local config_path="$1"
    
    cat > "$config_path" << 'EOF'
# Python stack test configuration
projects:
  python-test:
    name: 'Python Test Project'
    repo: 'https://github.com/pallets/flask.git'
    sample_repo: 'https://github.com/pallets/flask.git'
    env_file: 'python-test.env.local'
    post-init: 'cd flask && python --version && echo "Python environment ready"'

global:
  src_dir: '${TEST_BASE_DIR}/src'
  workspace_base: 'workspaces'
  env_files_dir: '${TEST_BASE_DIR}/env-files'

templates:
  dir: './src/templates'

workflows:
  branch_patterns:
    - 'feature/**'
    - 'test/**'
EOF
}

# Generate environment files for testing
generate_test_env_files() {
    local env_dir="$1"
    
    mkdir -p "$env_dir"
    
    # JavaScript environment
    cat > "$env_dir/js-test.env.local" << 'EOF'
# JavaScript test environment
NODE_ENV=test
DEBUG=false
PORT=3000
EOF

    # Java environment  
    cat > "$env_dir/java-test.env.local" << 'EOF'
# Java test environment
SPRING_PROFILES_ACTIVE=test
SERVER_PORT=8080
JAVA_OPTS=-Xmx512m
EOF

    # Go environment
    cat > "$env_dir/go-test.env.local" << 'EOF'
# Go test environment
GO_ENV=test
CGO_ENABLED=0
GOOS=linux
EOF

    # PHP environment
    cat > "$env_dir/php-test.env.local" << 'EOF'
# PHP test environment
APP_ENV=testing
APP_DEBUG=true
DB_CONNECTION=sqlite
EOF

    # Python environment
    cat > "$env_dir/python-test.env.local" << 'EOF'
# Python test environment
FLASK_ENV=testing
PYTHONPATH=.
DEBUG=True
EOF
}

# Main function to generate all stack configurations
generate_all_stack_configs() {
    local base_dir="$1"
    
    mkdir -p "$base_dir/configs"
    mkdir -p "$base_dir/env-files"
    
    log_info "Generating stack-based test configurations..."
    
    generate_javascript_config "$base_dir/configs/javascript.yaml"
    generate_java_config "$base_dir/configs/java.yaml"
    generate_go_config "$base_dir/configs/go.yaml"
    generate_php_config "$base_dir/configs/php.yaml"
    generate_python_config "$base_dir/configs/python.yaml"
    
    generate_test_env_files "$base_dir/env-files"
    
    log_success "Stack configurations generated in $base_dir"
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]]; then
        echo "Usage: $0 <base_directory>"
        exit 1
    fi
    
    generate_all_stack_configs "$1"
fi
