# Contributing to Workspace CLI

Thanks for your interest in contributing to Workspace CLI! 🎉

## Quick Start for Contributors

1. **Fork & Clone**

   ```bash
   git fork tusharpandey13/workspace-cli
   git clone https://github.com/YOUR_USERNAME/workspace-cli.git
   cd workspace-cli
   ```

2. **Set up Development Environment**

   ```bash
   pnpm install
   pnpm run install-global  # Install for testing
   ```

3. **Make Your Changes**

   ```bash
   git checkout -b feature/amazing-improvement
   # Make your changes...
   pnpm test  # Ensure tests pass
   ```

4. **Submit Your Contribution**
   ```bash
   git commit -m "feat: add amazing improvement"
   git push origin feature/amazing-improvement
   # Create a PR on GitHub
   ```

## 🎯 Ways to Contribute

### 🐛 Bug Reports

Found a bug? We'd love to hear about it!

- Check [existing issues](https://github.com/tusharpandey13/workspace-cli/issues) first
- Use our [bug report template](https://github.com/tusharpandey13/workspace-cli/issues/new?template=bug_report.md)
- Include reproduction steps and system info

### 💡 Feature Requests

Have an idea? Let's discuss it!

- Check [discussions](https://github.com/tusharpandey13/workspace-cli/discussions) for similar ideas
- Use our [feature request template](https://github.com/tusharpandey13/workspace-cli/issues/new?template=feature_request.md)
- Explain the use case and expected behavior

### 📝 Documentation

Help make the docs better!

- Fix typos or unclear explanations
- Add examples and use cases
- Improve setup instructions
- Translate documentation (future)

### 🔧 Code Contributions

Ready to dive into the code?

**Good First Issues:**

- Look for issues labeled [`good first issue`](https://github.com/tusharpandey13/workspace-cli/labels/good%20first%20issue)
- Small bug fixes
- Adding new configuration options
- Improving error messages

**Bigger Contributions:**

- New commands or features
- Performance improvements
- New platform support
- Integration with other tools

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Git and GitHub CLI
- Basic knowledge of TypeScript

### Project Structure

```
src/
├── bin/              # CLI entry point
├── commands/         # Command implementations
├── services/         # Core business logic
├── utils/           # Shared utilities
└── types/           # TypeScript definitions

test/                # Test files
docs/                # Documentation
```

### Development Commands

```bash
pnpm dev             # Run CLI in development mode
pnpm test            # Run all tests
pnpm test:coverage   # Run tests with coverage
pnpm lint            # Check code style
pnpm lint:fix        # Fix linting issues
pnpm format          # Format code with Prettier
```

### Testing Your Changes

```bash
# Install your changes globally for testing
pnpm run install-global

# Test with real repositories
workspace init mytest feature/test-branch

# Run the test suite
pnpm test

# Uninstall when done testing
pnpm run uninstall-global
```

## 📋 Development Guidelines

### Code Style

- We use ESLint and Prettier for consistent formatting
- TypeScript strict mode is enabled
- Follow existing patterns and naming conventions
- Write self-documenting code with clear variable names

### Git Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new workspace validation command
fix: resolve path resolution issue on Windows
docs: update configuration examples
test: add integration tests for PR workflow
refactor: simplify error handling logic
```

### Pull Request Process

1. **Before You Start**
   - Comment on the issue you want to work on
   - For large changes, discuss the approach first

2. **Writing Code**
   - Write tests for new functionality
   - Update documentation as needed
   - Follow existing code patterns
   - Keep changes focused and atomic

3. **Before Submitting**

   ```bash
   pnpm test           # All tests pass
   pnpm lint           # No linting errors
   pnpm build          # Builds successfully
   ```

4. **PR Requirements**
   - Clear description of changes
   - Reference related issues with `fixes #123`
   - Include screenshots for UI changes
   - Update CHANGELOG.md if needed

### Testing Guidelines

- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test command workflows end-to-end
- **Edge cases**: Test error conditions and boundary cases
- **Cross-platform**: Consider Windows, macOS, and Linux

Example test structure:

```typescript
describe('workspace init command', () => {
  it('should create workspace with valid project', async () => {
    // Test implementation
  });

  it('should handle missing dependencies gracefully', async () => {
    // Test error handling
  });
});
```

## 🤝 Community Guidelines

### Be Respectful

- Use inclusive language
- Be patient with newcomers
- Provide constructive feedback
- Help others learn and grow

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Request Reviews**: Code-focused feedback
- **Code of Conduct**: [Contributor Covenant](https://www.contributor-covenant.org/)

## 🎉 Recognition

Contributors get:

- Name in the CONTRIBUTORS.md file
- Credit in release notes for significant contributions
- Our eternal gratitude! 🙏

## ❓ Questions?

- 💬 [Start a discussion](https://github.com/tusharpandey13/workspace-cli/discussions)
- 📧 Email: [maintainer email if available]
- 📖 Read the [full documentation](./DOCS.md)

---

**Happy contributing!** Every contribution, no matter how small, makes Workspace CLI better for everyone. 🚀
