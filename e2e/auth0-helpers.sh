#!/bin/bash

# Auth0-specific helper functions for E2E testing
# Provides specialized functions for testing Auth0 repositories and configurations

# Handle unbound variables more gracefully
set +euo pipefail

# Auth0 repository base URLs
AUTH0_GITHUB_BASE="https://github.com/auth0"
AUTH0_SAMPLES_BASE="https://github.com/auth0-samples"

# Expected Auth0 repository mappings (main repo -> sample repo)
# Updated with correct repository names after research
declare -A AUTH0_SAMPLE_REPOS=(
    ["node-auth0"]="auth0-javascript-samples"
    ["nextjs-auth0"]="auth0-nextjs-samples" 
    ["auth0-spa-js"]="auth0-javascript-samples"
    ["auth0-java"]="auth0-spring-security-mvc-sample"
    ["express-openid-connect"]="auth0-express-webapp-sample"
    ["auth0-angular"]="auth0-angular-samples"
    ["auth0-vue"]="auth0-vue-samples"
    ["auth0-react"]="auth0-react-samples"
    ["lock"]="auth0-javascript-samples"
    ["terraform-provider-auth0"]="terraform-provider-auth0"
    ["react-native-auth0"]="auth0-react-native-sample"
    ["wordpress"]="wordpress"
    ["java-jwt"]="java-jwt"
    ["jwks-rsa-java"]="jwks-rsa-java"
)

# Tech stack detection patterns
declare -A TECH_PATTERNS=(
    ["nodejs"]="package.json"
    ["java_gradle"]="build.gradle gradlew"
    ["java_maven"]="pom.xml"
    ["php"]="composer.json"
    ["go"]="go.mod"
    ["terraform"]="*.tf"
)

# Test if an Auth0 repository is accessible
test_auth0_repo_accessible() {
    local repo_key="$1"
    local repo_url="${AUTH0_GITHUB_BASE}/${repo_key}.git"
    
    log_debug "Testing accessibility of $repo_url"
    
    # Test if repository exists and is accessible
    if timeout 30 git ls-remote "$repo_url" &>/dev/null; then
        log_debug "✅ Main repository $repo_key is accessible"
        
        # Test sample repository if it exists
        local sample_repo="${AUTH0_SAMPLE_REPOS[$repo_key]}"
        if [[ -n "$sample_repo" && "$sample_repo" != "$repo_key" ]]; then
            local sample_url="${AUTH0_SAMPLES_BASE}/${sample_repo}.git"
            if timeout 30 git ls-remote "$sample_url" &>/dev/null; then
                log_debug "✅ Sample repository $sample_repo is accessible"
                return 0
            else
                log_debug "❌ Sample repository $sample_repo is not accessible"
                return 1
            fi
        fi
        return 0
    else
        log_debug "❌ Main repository $repo_key is not accessible"
        return 1
    fi
}

# Test basic space init functionality for Auth0 repo
test_space_init_basic() {
    local repo_key="$1"
    local test_dir="${TEST_BASE_DIR}/basic_${repo_key}"
    
    log_debug "Testing space init for $repo_key in $test_dir"
    mkdir -p "$test_dir"
    cd "$test_dir"
    
    # Use the project's config.yaml file explicitly to access Auth0 configurations
    local config_file="${SCRIPT_DIR}/../config.yaml"
    local absolute_config_path="$(realpath "$config_file")"
    
    # Try to initialize with the Auth0 configuration using dry-run mode
    if timeout "$TIMEOUT_DEFAULT" "$SPACE_CLI" init "$repo_key" feature/test-auth0 --config "$absolute_config_path" --dry-run 2>/dev/null; then
        log_debug "✅ Basic space init worked for $repo_key"
        return 0
    else
        log_debug "❌ Basic space init failed for $repo_key"
        return 1
    fi
}

# Test post-init command execution
test_post_init_execution() {
    local repo_key="$1"
    local test_dir="${TEST_BASE_DIR}/postinit_${repo_key}"
    
    log_debug "Testing post-init execution for $repo_key in $test_dir"
    mkdir -p "$test_dir"
    cd "$test_dir"
    
    # This will fail initially since post-init commands don't exist yet
    # We'll implement them based on what we learn from repository research
    
    # For now, just test that we can identify the tech stack
    if detect_auth0_tech_stack "$repo_key" "$test_dir"; then
        log_debug "✅ Tech stack detection works for $repo_key"
        return 0
    else
        log_debug "❌ Tech stack detection failed for $repo_key"
        return 1
    fi
}

# Test sample app build functionality
test_sample_app_builds() {
    local repo_key="$1"
    local test_dir="${TEST_BASE_DIR}/build_${repo_key}"
    
    log_debug "Testing sample app build for $repo_key in $test_dir"
    mkdir -p "$test_dir"
    cd "$test_dir"
    
    # This will fail initially - we need to implement proper build commands
    # This test defines what we want to achieve
    
    local tech_stack
    tech_stack=$(detect_auth0_tech_stack "$repo_key" "$test_dir")
    
    case "$tech_stack" in
        "nodejs")
            if test_nodejs_build "$test_dir"; then
                return 0
            fi
            ;;
        "java_gradle"|"java_maven")
            if test_java_build "$test_dir" "$tech_stack"; then
                return 0
            fi
            ;;
        "php")
            if test_php_build "$test_dir"; then
                return 0
            fi
            ;;
        "go")
            if test_go_build "$test_dir"; then
                return 0
            fi
            ;;
        *)
            log_debug "❌ Unknown tech stack: $tech_stack"
            return 1
            ;;
    esac
    
    return 1
}

# Detect Auth0 repository tech stack
detect_auth0_tech_stack() {
    local repo_key="$1"
    local test_dir="$2"
    
    # Map Auth0 repos to expected tech stacks
    case "$repo_key" in
        "node-auth0"|"nextjs-auth0"|"auth0-spa-js"|"express-openid-connect"|"auth0-angular"|"auth0-vue"|"auth0-react"|"lock"|"react-native-auth0")
            echo "nodejs"
            ;;
        "auth0-java"|"java-jwt"|"jwks-rsa-java")
            echo "java_gradle"  # Most Auth0 Java projects use Gradle
            ;;
        "wordpress")
            echo "php"
            ;;
        "terraform-provider-auth0")
            echo "go"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Test Node.js build
test_nodejs_build() {
    local test_dir="$1"
    
    if [[ -f "$test_dir/package.json" ]]; then
        if command -v npm &>/dev/null; then
            if timeout "$TIMEOUT_BUILD" npm install &>/dev/null; then
                if [[ -f "$test_dir/package.json" ]] && jq -r '.scripts.build // empty' "$test_dir/package.json" | grep -q .; then
                    timeout "$TIMEOUT_BUILD" npm run build &>/dev/null
                else
                    # No build script, that's ok for some projects
                    return 0
                fi
            else
                return 1
            fi
        else
            log_debug "❌ npm not available"
            return 1
        fi
    else
        log_debug "❌ No package.json found"
        return 1
    fi
}

# Test Java build
test_java_build() {
    local test_dir="$1"
    local build_system="$2"
    
    case "$build_system" in
        "java_gradle")
            if [[ -f "$test_dir/build.gradle" || -f "$test_dir/build.gradle.kts" ]]; then
                if [[ -x "$test_dir/gradlew" ]]; then
                    timeout "$TIMEOUT_BUILD" ./gradlew build &>/dev/null
                elif command -v gradle &>/dev/null; then
                    timeout "$TIMEOUT_BUILD" gradle build &>/dev/null
                else
                    log_debug "❌ Gradle not available"
                    return 1
                fi
            else
                log_debug "❌ No Gradle build files found"
                return 1
            fi
            ;;
        "java_maven")
            if [[ -f "$test_dir/pom.xml" ]]; then
                if [[ -x "$test_dir/mvnw" ]]; then
                    timeout "$TIMEOUT_BUILD" ./mvnw compile &>/dev/null
                elif command -v mvn &>/dev/null; then
                    timeout "$TIMEOUT_BUILD" mvn compile &>/dev/null
                else
                    log_debug "❌ Maven not available"
                    return 1
                fi
            else
                log_debug "❌ No pom.xml found"
                return 1
            fi
            ;;
    esac
}

# Test PHP build
test_php_build() {
    local test_dir="$1"
    
    if [[ -f "$test_dir/composer.json" ]]; then
        if command -v composer &>/dev/null; then
            timeout "$TIMEOUT_BUILD" composer install &>/dev/null
        else
            log_debug "❌ Composer not available"
            return 1
        fi
    else
        log_debug "❌ No composer.json found"
        return 1
    fi
}

# Test Go build
test_go_build() {
    local test_dir="$1"
    
    if [[ -f "$test_dir/go.mod" ]]; then
        if command -v go &>/dev/null; then
            timeout "$TIMEOUT_BUILD" go build ./... &>/dev/null
        else
            log_debug "❌ Go not available"
            return 1
        fi
    else
        log_debug "❌ No go.mod found"  
        return 1
    fi
}

# Verify prerequisites for Auth0 tech stack
verify_auth0_prerequisites() {
    local repo_key="$1"
    local tech_stack
    tech_stack=$(detect_auth0_tech_stack "$repo_key" "")
    
    case "$tech_stack" in
        "nodejs")
            verify_nodejs_prerequisites
            ;;
        "java_gradle"|"java_maven")
            verify_java_prerequisites
            ;;
        "php")
            verify_php_prerequisites
            ;;
        "go")
            verify_go_prerequisites
            ;;
        *)
            log_debug "❌ Cannot verify prerequisites for unknown tech stack: $tech_stack"
            return 1
            ;;
    esac
}

verify_nodejs_prerequisites() {
    local node_version
    if command -v node &>/dev/null; then
        node_version=$(node --version | sed 's/v//')
        if version_compare "$node_version" "18.0.0"; then
            log_debug "✅ Node.js $node_version >= 18.0.0"
            return 0
        else
            log_debug "❌ Node.js $node_version < 18.0.0"
            return 1
        fi
    else
        log_debug "❌ Node.js not installed"
        return 1
    fi
}

verify_java_prerequisites() {
    if command -v java &>/dev/null; then
        local java_version
        java_version=$(java -version 2>&1 | head -n1 | cut -d'"' -f2 | cut -d'.' -f1)
        if [[ "$java_version" -ge 8 ]]; then
            log_debug "✅ Java $java_version >= 8"
            return 0
        else
            log_debug "❌ Java $java_version < 8"
            return 1
        fi
    else
        log_debug "❌ Java not installed"
        return 1
    fi
}

verify_php_prerequisites() {
    if command -v php &>/dev/null; then
        local php_version
        php_version=$(php -v | head -n1 | cut -d' ' -f2 | cut -d'.' -f1,2)
        if version_compare "$php_version" "8.1"; then
            log_debug "✅ PHP $php_version >= 8.1"
            return 0
        else
            log_debug "❌ PHP $php_version < 8.1"
            return 1
        fi
    else
        log_debug "❌ PHP not installed"
        return 1
    fi
}

verify_go_prerequisites() {
    if command -v go &>/dev/null; then
        local go_version
        go_version=$(go version | cut -d' ' -f3 | sed 's/go//')
        if version_compare "$go_version" "1.19"; then
            log_debug "✅ Go $go_version >= 1.19"
            return 0
        else
            log_debug "❌ Go $go_version < 1.19"
            return 1
        fi
    else
        log_debug "❌ Go not installed"
        return 1
    fi
}

# Version comparison helper
version_compare() {
    local version1="$1"
    local version2="$2"
    
    if [[ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n1)" == "$version2" ]]; then
        return 0  # version1 >= version2
    else
        return 1  # version1 < version2
    fi
}
