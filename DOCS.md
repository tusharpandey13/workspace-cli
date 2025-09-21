# Workspace CLI - Complete Documentation

## Table of Contents

- [Installation & Prerequisites](#installation--prerequisites)
- [Detailed Usage](#detailed-usage)
- [Configuration Guide](#configuration-guide)
- [Directory Structure](#directory-structure)
- [Security Features](#security-features)
- [Error Handling](#error-handling)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Installation & Prerequisites

### Installation Methods

```bash
# NPM
npm install -g workspace-cli

# PNPM
pnpm install -g workspace-cli

# Yarn
yarn global add workspace-cli
```

### Prerequisites

Ensure the following tools are installed and available in your PATH:

- `git` - Git version control
- `gh` - GitHub CLI (for PR/issue integration)
- `pnpm` - Package manager (configurable to npm/yarn)

### Verification

```bash
workspace --version
workspace --help
```

### System Diagnostics

```bash
workspace doctor
```

Checks system dependencies, validates configuration, and helps setup the CLI environment. Use this command to:

- Verify all required tools are installed (git, GitHub CLI)
- Check Node.js and npm versions
- Validate configuration file structure
- Setup user configuration if missing
- Troubleshoot common setup issues

## Detailed Usage

### System Check First

Before using the CLI, run the diagnostic tool:

```bash
workspace doctor --setup
```

This will guide you through any missing dependencies or configuration issues.

### View Available Projects

```bash
workspace projects
```

Shows all configured SDK projects with their repositories and settings.

### Initialize a New Workspace

```bash
# Basic usage
workspace init <project> <branch-name>

# With GitHub issues/PRs
workspace init <project> [github-ids...] <branch-name>

# For a specific Pull Request (automatically checks out PR branch)
workspace init <project> --pr <pr-id>

# Examples
workspace init next feature/oauth-improvements
workspace init spa 123 456 bugfix/session-handling
workspace init next feature/hooks-refactor --verbose --dry-run
workspace init spa --pr 789  # Creates workspace for PR #789, checks out PR branch
```

### List Active Workspaces

```bash
workspace list              # Show all workspaces for all projects
workspace list next         # Show workspaces for 'next' project only
```

### Get Workspace Information

```bash
workspace info <project> <workspace-name>
workspace info next my-feature-branch
```

### Clean Up Workspace

```bash
workspace clean <project> <workspace-name>
workspace clean next my-feature-branch
```

### Submit Workspace (commit, push, create PR)

```bash
workspace submit <project> <workspace-name>
workspace submit next my-feature-branch
```

## Configuration Guide

The tool uses a YAML configuration file to define SDK projects and their repositories.

### Configuration File Locations

The tool searches for configuration in this order:

1. Custom path specified with `-c, --config <path>`
2. `~/.workspace-config.yaml`
3. `./config.yaml` (current directory)
4. `<cli-installation>/config.yaml`

### Complete Configuration Example

```yaml
# config.yaml
projects:
  next:
    name: 'NextJS Auth0 SDK'
    sdk_repo: 'nextjs-auth0'
    sample_repo: 'auth0-nextjs-samples'
    github_org: 'auth0'
    sample_app_path: 'Sample-01'
    env_file: 'next.env.local'

  spa:
    name: 'Auth0 SPA JS SDK'
    sdk_repo: '~/src/auth0-spa-js' # Can use ~ for home directory
    sample_repo: 'https://github.com/user/sample.git' # Can use URLs for external repos
    github_org: 'auth0'
    sample_app_path: '/absolute/path/to/sample' # Can use absolute paths
    env_file: 'spa.env.local'

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
  package_manager: 'pnpm'
  github_cli: 'gh'
  env_files_dir: './env-files'
```

### Environment Files

Create project-specific environment files in the `env_files_dir`:

```
env-files/
├── next.env.local      # Environment for NextJS projects
└── spa.env.local       # Environment for SPA JS projects
```

### Path Configuration Details

#### Flexible Path Configuration

- **Home directory expansion**: Use `~` in paths for cross-environment compatibility
- **Absolute paths**: Support for absolute paths in configuration
- **URL support**: Sample repositories can be Git URLs or local paths
- **Automatic path resolution**: Smart handling of different path formats

**Correct formats:**

```yaml
projects:
  spa:
    sdk_repo: '~/src/auth0-spa-js' # Tilde expansion for home directory
    sample_repo: 'spajs/spatest' # Relative to src_dir
    sample_app_path: '/absolute/path/to/app' # Absolute path for specific locations
```

**Incorrect formats:**

```yaml
projects:
  spa:
    sample_repo: '/Users/username/src/spajs/spatest' # Don't use absolute paths for sample_repo
```

The CLI resolves paths as follows:

- `sdk_repo` with `~`: Expands to full home directory path
- `sample_repo` without `/`: Treated as relative to `global.src_dir`
- `sample_app_path`: Used as-is (absolute path)

## Directory Structure

The tool creates the following structure:

```
$SRC_DIR/
├── nextjs-auth0/                    # SDK repositories (cloned manually or via worktree)
├── auth0-nextjs-samples/
├── auth0-spa-js/                    # SPA SDK (can be anywhere with ~ expansion)
├── sample-repos/                    # Sample repositories (URLs or local paths)
└── workspaces/                      # Generated workspaces
    ├── next/                        # NextJS project workspaces
    │   └── {workspace-name}/
    │       ├── nextjs-auth0/        # SDK worktree
    │       ├── auth0-nextjs-samples/ # Samples worktree
    │       └── *.prompt.md          # Generated templates
    └── spa/                         # SPA project workspaces
        └── {workspace-name}/
            ├── auth0-spa-js/        # SDK worktree
            ├── sample-app-name/     # Sample worktree (from URL or path)
            └── *.prompt.md
```

## Global Options

All commands support these global options:

- `-c, --config <path>` - Path to configuration file
- `-e, --env <path>` - Path to .workspace.env file
- `--pr <pr_id>` - Open workspace for specific pull request (automatically checks out PR branch)
- `-v, --verbose` - Enable verbose logging
- `--debug` - Enable debug logging
- `--non-interactive` - Skip all user input prompts for automated usage

## Security Features

- **Input validation and sanitization** for all user inputs
- **Path traversal protection** prevents malicious path operations
- **Dependency validation** before operations
- **Structured error handling** with user-friendly messages
- **Safe git operations** with proper validation

## Key Features & Improvements

### Robust Git Worktree Management

- **Smart default branch detection**: Automatically detects `main` or `master` branches
- **Fallback strategies**: Multiple worktree creation strategies for reliability
- **PR branch handling**: SDK uses PR branch, samples use default branch
- **Error recovery**: Graceful handling of worktree setup failures

### Enhanced Error Handling

- **Optional dependencies**: yalc publishing failures don't break the workflow
- **Graceful degradation**: Continue setup even when optional steps fail
- **Informative warnings**: Clear messages when optional features are unavailable
- **Robust validation**: Comprehensive input and configuration validation

### GitHub Integration

- **Improved API calls**: Uses repo names instead of full paths for reliability
- **PR data fetching**: Comprehensive PR information including comments
- **Branch synchronization**: Automatic fetching and setup of PR branches
- **Flexible authentication**: Works with GitHub CLI authentication

## Logging

The tool provides multiple logging levels:

- **ERROR**: Critical errors only
- **WARN**: Warnings and errors
- **INFO**: General information (default)
- **DEBUG**: Detailed debugging information
- **VERBOSE**: Maximum verbosity

Use `--verbose` or `--debug` flags to increase logging detail.

## Error Handling

The tool provides specific error types with helpful messages:

- **ValidationError**: Input validation failures
- **GitError**: Git operation failures
- **DependencyError**: Missing or invalid dependencies
- **FileSystemError**: File/directory operation failures
- **WorkspaceError**: General workspace operation failures

## Development

### Setting Up Development Environment

1. **Clone the repository:**

   ```bash
   git clone https://github.com/tusharpandey13/workspace-cli.git
   cd workspace-cli
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Set up global pnpm (if needed):**

   ```bash
   pnpm setup
   source ~/.zshrc  # or restart your terminal
   ```

4. **Install CLI globally for testing:**

   ```bash
   pnpm run install-global
   ```

5. **Run in development mode:**
   ```bash
   pnpm dev
   ```

### Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### Building

```bash
# Clean previous builds
pnpm run clean

# Build TypeScript
pnpm run build

# Test built version
pnpm start
```

### Development Scripts

- `pnpm dev` - Run CLI in development mode with TypeScript
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run compiled version
- `pnpm install-global` - Install current version globally for testing
- `pnpm uninstall-global` - Remove global installation

## Troubleshooting

### Common Issues

1. **Missing dependencies**: Ensure `git`, `gh`, and `pnpm` are installed
2. **Permission errors**: Check file/directory permissions
3. **Git worktree conflicts**: Run `git worktree prune` in the main repositories
4. **Network issues**: Ensure GitHub CLI is authenticated (`gh auth login`)

### Branch-Related Issues

#### "invalid reference" or "fatal: invalid reference" errors

This typically occurs when:

- The specified branch doesn't exist in the repository
- There are stale git worktrees that need cleanup

**Solutions:**

1. **Clean up existing worktrees:**

   ```bash
   # In the repository directory
   git worktree prune

   # Remove any conflicting workspace directories
   rm -rf ~/src/workspaces/<project>/<workspace-name>
   ```

2. **Check branch existence:**
   ```bash
   # Verify the branch exists in the SDK repository
   cd ~/src/<sdk-repo>
   git branch -a | grep <branch-name>
   ```

#### Different default branches (main vs master)

The CLI automatically detects whether repositories use `main` or `master` as the default branch:

- **SDK repositories**: Uses the specified branch for development
- **Sample repositories**: Automatically falls back to the default branch (`main` or `master`) if the specified branch doesn't exist

This allows you to work on feature branches in the SDK while using stable sample applications.

### Getting Help

The CLI provides comprehensive help text for all commands. Use any of these approaches:

#### Main Help

```bash
workspace --help        # Show main help with all commands
workspace -h            # Short form
```

#### Command-Specific Help

```bash
workspace <command> --help    # Detailed help for any command
workspace <command> -h        # Short form

# Examples
workspace init --help         # Help for init command
workspace list -h             # Help for list command
workspace projects --help     # Help for projects command
workspace info -h             # Help for info command
workspace clean --help        # Help for clean command
workspace projects -h         # Help for projects command
```

#### Help Content

Each command provides:

- **Usage syntax** - Correct command format
- **Description** - What the command does
- **Arguments** - Required and optional parameters
- **Options** - Available flags and their meanings
- **Examples** - Real-world usage scenarios
- **Related commands** - Other commands you might need

### Performance Issues

If you're experiencing slow performance:

1. **Check network connectivity** - GitHub operations require internet access
2. **Verify disk space** - Worktrees require adequate storage
3. **Clean up old workspaces** - Use `workspace clean` regularly
4. **Update dependencies** - Ensure git and GitHub CLI are current versions

### Configuration Issues

If configuration isn't working as expected:

1. **Verify file location** - Check that config.yaml is in the expected location
2. **Validate YAML syntax** - Use a YAML validator to check for syntax errors
3. **Check file permissions** - Ensure the CLI can read configuration files
4. **Use absolute paths** - When in doubt, use full absolute paths in configuration

### GitHub Integration Issues

If GitHub features aren't working:

1. **Authenticate GitHub CLI:**

   ```bash
   gh auth login
   ```

2. **Verify permissions:**

   ```bash
   gh auth status
   ```

3. **Test GitHub API access:**

   ```bash
   gh repo list
   ```

4. **Check repository access** - Ensure you have read access to configured repositories

## Support

If you're still experiencing issues:

1. **Search existing issues**: Check [GitHub Issues](https://github.com/tusharpandey13/workspace-cli/issues)
2. **Create a new issue**: Provide detailed reproduction steps
3. **Join discussions**: Ask questions in [GitHub Discussions](https://github.com/tusharpandey13/workspace-cli/discussions)
4. **Enable debug logging**: Use `--debug` flag for detailed output

When reporting issues, please include:

- Operating system and version
- Node.js version (`node --version`)
- CLI version (`workspace --version`)
- Complete error messages
- Steps to reproduce the issue
- Configuration file (with sensitive data removed)
