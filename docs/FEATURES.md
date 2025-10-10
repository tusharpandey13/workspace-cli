# Space CLI Enhanced Features

This document provides detailed information about the enhanced AI-powered features available in Space CLI.

## 🤖 AI Development Tools

### Copilot Instructions

Space CLI automatically creates `.github/copilot-instructions.md` files in every workspace with project-specific context and development guidelines.

**What gets created:**

- Project overview and architecture patterns
- Development methodology and testing conventions
- Quick troubleshooting guides
- Performance optimization lessons
- Critical gotchas and success metrics

**Example usage:**

```bash
space init next feature/auth-improvements
# Creates: ~/src/workspaces/next/feature/auth-improvements/.github/copilot-instructions.md
```

### Enhanced Analysis Templates

Smart analysis templates with pre-validation questions that can veto unnecessary analysis runs.

**Templates available:**

- `analysis.prompt.md` - Standard analysis with 5 mandatory validation questions
- `enhanced-analysis.prompt.md` - Advanced analysis with structured assessment patterns
- `analysis-with-sample.prompt.md` - Specialized template for sample app reproduction scenarios

**Validation questions include:**

1. Is the issue actually reproducible in the current state?
2. Have you checked if this is a known issue with documented solutions?
3. Is this analysis request specific enough to provide actionable insights?
4. Are you targeting the correct repository and branch for this analysis?
5. Have you gathered sufficient context about the problem before requesting analysis?

### Structured PR Review System

Comprehensive PR management with enhanced description templates and structured review instructions.

**Features:**

- **Enhanced PR Descriptions**: Mandatory validation sections with strong emphasis and clear requirements
- **Security-Focused Assessment**: Built-in security checklists and validation gates
- **Stop Gates**: Clear "STOP" points that prevent submission of inadequate PRs
- **Structured Review Process**: Intent analysis framework for understanding PR purpose
- **GitHub Suggestion Formatting**: Actionable feedback with proper formatting
- **Structured Patterns**: Validation patterns based on structured review methodology

**Templates:**

- `PR_DESCRIPTION_TEMPLATE.md` - Enhanced PR descriptions with mandatory validation and strong emphasis
- `PR_REVIEW_INSTRUCTIONS.md` - Comprehensive review guide with structured approach

## 🔧 Intelligent Automation

### Smart Gitignore Management

Automatically configures `.gitignore` files for sample repositories based on detected technology stack.

**Supported tech stacks:**

- Node.js (npm, pnpm, yarn artifacts)
- Java (Maven, Gradle build outputs)
- Python (pip, conda, **pycache**)
- .NET (bin, obj directories)
- And more...

**How it works:**

1. Detects tech stack from package.json, pom.xml, requirements.txt, etc.
2. Applies appropriate gitignore patterns
3. Ensures build artifacts never appear in git status

### Environment File Management

Seamless handling of environment configuration with intelligent prompting.

**Features:**

- Automatic environment file detection and copying
- User-friendly prompts for missing configurations
- Template-based environment setup
- Validation of required environment variables

**Example workflow:**

```bash
space init auth0-nextjs feature/sso-integration
# Prompts: "Environment file 'next.env.local' is required but not configured. Would you like to set it up now?"
# Copies template from env-files/next.env.local with placeholder substitution
```

### Tech Stack Detection

Automatically detects project technology and applies appropriate configurations.

**Detection patterns:**

- **Node.js**: package.json, yarn.lock, pnpm-lock.yaml
- **Java**: pom.xml, build.gradle, gradle.properties
- **Python**: requirements.txt, setup.py, pyproject.toml
- **Dockerfile**: Dockerfile, docker-compose.yml
- **And more...**

## 📝 Developer Experience Enhancements

### Sample App Integration

Intelligent prompts for reproducing issues in sample applications with context-aware template selection.

**When working with projects that have `sample_repo` configured:**

- Automatically detects sample app scenarios
- Prompts: "Do you want me to reproduce the behavior in the sample app?"
- Uses specialized templates with sample-specific placeholders
- Handles environment file requirements for sample apps

### Validation Gates

Mandatory analysis questions prevent running analysis on inappropriate scenarios, saving time and resources.

**Veto triggers:**

- Issues marked as "won't fix" or "by design"
- Build/deployment failures that require infrastructure fixes
- Questions that lack sufficient context or specificity
- Generic requests without clear success criteria
- Issues requiring extensive external research

### Progress Tracking

Built-in progress indicators and comprehensive logging for debugging complex workflows.

**Features:**

- Real-time progress updates during workspace creation
- Detailed logging for troubleshooting
- Performance metrics and timing information
- Memory usage tracking and optimization

## 🚀 Migration Guide

### For Existing Users

If you have existing Space CLI workspaces, the enhanced features will be automatically available:

1. **New workspaces** created with `space init` will include all enhanced features
2. **Existing workspaces** can be enhanced by re-running `space init` on the same project/branch
3. **Template updates** are applied automatically without breaking existing workflows

### Configuration Updates

No configuration changes are required. The enhanced features work with your existing `config.yaml`:

```yaml
# Your existing config works as-is
projects:
  my-project:
    name: 'My Project'
    repo: 'https://github.com/user/repo.git'
    sample_repo: 'https://github.com/user/samples.git' # Enhanced features auto-detect this
    env_file: 'project.env.local' # Enhanced environment handling
```

## 🧪 Testing the Enhanced Features

### Verify Copilot Instructions

```bash
space init your-project feature/test
ls ~/src/workspaces/your-project/feature/test/.github/copilot-instructions.md
```

### Test Analysis Templates

```bash
# Templates are created in: ~/src/workspaces/your-project/feature/test/
ls -la ~/src/workspaces/your-project/feature/test/*.prompt.md
```

### Check Gitignore Setup

```bash
# For projects with sample_repo, check both repositories
cat ~/src/workspaces/your-project/feature/test/your-project/.gitignore
cat ~/src/workspaces/your-project/feature/test/samples/.gitignore
```

### Validate Environment Files

```bash
# Environment files are copied to workspace root
ls ~/src/workspaces/your-project/feature/test/*.env.local
```

---

For more information, see the main [README.md](../README.md) or run `space --help`.
