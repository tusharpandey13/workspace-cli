# Migration Guide: Enhanced Space CLI Features

This guide helps existing Space CLI users understand and adopt the new enhanced features introduced in the latest version.

## What's New?

Space CLI now includes powerful AI-driven development tools and intelligent automation features:

### 🤖 AI Development Tools

- **Copilot Instructions**: Auto-generated project context files
- **Enhanced Analysis**: Smart templates with validation questions
- **Claude-Inspired Reviews**: Structured PR review system

### 🔧 Intelligent Automation

- **Smart Gitignore**: Tech stack-aware .gitignore management
- **Environment Handling**: Seamless env file management
- **Tech Stack Detection**: Automatic project configuration

## Migration Steps

### For Existing Workspaces

**Good news**: No action required! Your existing workspaces continue to work exactly as before.

**To get enhanced features in existing workspaces:**

```bash
# Re-run space init to add enhanced features to existing workspace
cd ~/src/workspaces/your-project/your-branch
space init your-project your-branch
# This will add copilot instructions and analysis templates without disrupting your work
```

### For New Workspaces

**Automatic**: All new workspaces created with `space init` automatically include enhanced features.

```bash
# Creates workspace with all enhanced features
space init next feature/enhanced-auth
```

### Configuration Compatibility

**No changes needed** to your existing `config.yaml`. Enhanced features work with your current configuration:

```yaml
# Your existing config.yaml continues to work
projects:
  next:
    name: 'Next.js Project'
    repo: 'https://github.com/auth0/nextjs-auth0.git'
    sample_repo: 'https://github.com/auth0-samples/auth0-nextjs-samples.git' # Enhanced!
    env_file: 'next.env.local' # Enhanced!
```

**New benefits with existing config:**

- `sample_repo` now triggers intelligent sample app prompts
- `env_file` gets enhanced validation and user-friendly setup
- All projects get smart gitignore and tech stack detection

## Enhanced Feature Overview

### 1. Copilot Instructions

**What happens now:**
Every workspace gets `.github/copilot-instructions.md` with:

- Project-specific context and patterns
- Development methodology guidelines
- Performance optimization tips
- Troubleshooting guides

**Example:**

```bash
space init react feature/component-library
# Creates: ~/src/workspaces/react/feature/component-library/.github/copilot-instructions.md
```

### 2. Smart Analysis Templates

**What happens now:**
Analysis templates include validation questions that can prevent unnecessary analysis:

- **Standard analysis**: Pre-validation with 5 key questions
- **Enhanced analysis**: Claude-inspired patterns with security focus
- **Sample app analysis**: Specialized for reproduction scenarios

**Validation questions prevent analysis when:**

- Issue is not actually reproducible
- It's a known issue with documented solutions
- Request lacks sufficient specificity
- Wrong repository/branch is targeted
- Insufficient context is provided

### 3. Intelligent Gitignore

**What happens now:**
Sample repositories automatically get appropriate `.gitignore` files:

```bash
# For Node.js projects
node_modules/
dist/
.next/
.vercel/

# For Java projects
target/
*.class
*.jar

# For Python projects
__pycache__/
*.pyc
venv/
```

### 4. Environment File Management

**What happens now:**
When `env_file` is configured but missing:

```bash
space init auth0-nextjs feature/sso
# Prompts: "Environment file 'next.env.local' is required but not configured.
#          Would you like to set it up now? (y/n)"
# Copies template with proper placeholder substitution
```

## Troubleshooting

### Issue: "I don't see enhanced features in my existing workspace"

**Solution**: Re-run `space init` to add enhanced features:

```bash
cd ~/src/workspaces/existing-project/existing-branch
space init existing-project existing-branch
```

### Issue: "New templates are not appearing"

**Solution**: Check that Space CLI is updated:

```bash
npm list -g @tusharpandey13/space-cli
# Update if needed:
npm update -g @tusharpandey13/space-cli
```

### Issue: "Sample app prompts not appearing"

**Solution**: Ensure your project has `sample_repo` configured in `config.yaml`:

```yaml
projects:
  your-project:
    name: 'Your Project'
    repo: 'https://github.com/user/main-repo.git'
    sample_repo: 'https://github.com/user/samples-repo.git' # Required for sample app features
```

### Issue: "Environment file prompts not working"

**Solution**: Verify configuration and file existence:

```yaml
# In config.yaml
projects:
  your-project:
    env_file: 'project.env.local' # Must match file in env_files_dir

global:
  env_files_dir: './env-files' # Directory must exist
```

```bash
# Check file exists
ls env-files/project.env.local
```

## Rollback Plan

If you need to temporarily disable enhanced features:

### 1. Use `--no-config` flag for testing

```bash
space --no-config init your-project your-branch
# Creates basic workspace without enhanced features
```

### 2. Remove enhanced files from existing workspace

```bash
cd ~/src/workspaces/your-project/your-branch
rm -f .github/copilot-instructions.md
rm -f *.prompt.md
# Your code remains untouched
```

### 3. Downgrade Space CLI (not recommended)

```bash
npm install -g @tusharpandey13/space-cli@previous-version
```

## Getting Help

### Documentation

- **Features Overview**: [docs/FEATURES.md](FEATURES.md)
- **Main Documentation**: [README.md](../README.md)
- **CLI Help**: `space --help`

### Testing Enhanced Features

```bash
# Verify enhanced features are working
space init test-project feature/test-enhanced-features
cd ~/src/workspaces/test-project/feature/test-enhanced-features

# Check created files
ls -la .github/copilot-instructions.md
ls -la *.prompt.md
ls -la *.env.local

# Clean up test workspace
space clean test-project feature/test-enhanced-features
```

### Support

- **GitHub Issues**: [Report issues or ask questions](https://github.com/tusharpandey13/space-cli/issues)
- **CLI Validation**: `space validate` to check your setup

---

**Next Steps**: Try creating a new workspace with enhanced features and explore the new AI-powered development tools!
