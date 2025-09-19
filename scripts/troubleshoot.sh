#!/bin/bash

# Workspace CLI Installation Troubleshooting Script
# This script diagnoses and fixes common installation issues

echo "🔧 Workspace CLI Installation Troubleshooting"
echo "============================================="

# Check Node.js version
echo "📋 Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js version: $NODE_VERSION"
    
    # Check if Node.js version is v18+
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo "⚠️  Warning: Node.js v18+ is recommended (you have v$MAJOR_VERSION)"
    fi
else
    echo "❌ Node.js not found. Please install Node.js v18+ first."
    exit 1
fi

# Check npm version
echo "📋 Checking npm version..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm version: $NPM_VERSION"
else
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

# Check if we're in the right directory
echo "📋 Checking project structure..."
if [ -f "package.json" ] && [ -f "src/bin/workspace.ts" ]; then
    echo "✅ Found workspace-cli project files"
else
    echo "❌ Not in workspace-cli directory. Please cd to the workspace-cli directory first."
    exit 1
fi

# Check if built files exist
echo "📋 Checking build status..."
if [ -f "dist/bin/workspace.js" ]; then
    echo "✅ Build files found"
    
    # Check executable permissions
    if [ -x "dist/bin/workspace.js" ]; then
        echo "✅ CLI executable has correct permissions"
    else
        echo "🔧 Fixing executable permissions..."
        chmod +x dist/bin/workspace.js
        echo "✅ Fixed executable permissions"
    fi
else
    echo "🔨 Building project..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Build completed successfully"
    else
        echo "❌ Build failed. Please check the error messages above."
        exit 1
    fi
fi

# Test local CLI
echo "🧪 Testing local CLI..."
if node dist/bin/workspace.js --version &> /dev/null; then
    LOCAL_VERSION=$(node dist/bin/workspace.js --version)
    echo "✅ Local CLI works: v$LOCAL_VERSION"
else
    echo "❌ Local CLI test failed"
    exit 1
fi

# Check global installation
echo "📋 Checking global installation..."
if command -v workspace &> /dev/null; then
    GLOBAL_VERSION=$(workspace --version)
    echo "✅ Global CLI found: v$GLOBAL_VERSION"
    
    if [ "$LOCAL_VERSION" != "$GLOBAL_VERSION" ]; then
        echo "⚠️  Version mismatch between local and global CLI"
        echo "🔧 Reinstalling global CLI..."
        npm unlink 2>/dev/null || true
        npm link
        
        if command -v workspace &> /dev/null; then
            NEW_GLOBAL_VERSION=$(workspace --version)
            echo "✅ Global CLI updated: v$NEW_GLOBAL_VERSION"
        else
            echo "❌ Global CLI reinstallation failed"
        fi
    fi
else
    echo "🔧 Installing global CLI..."
    npm link
    
    if command -v workspace &> /dev/null; then
        GLOBAL_VERSION=$(workspace --version)
        echo "✅ Global CLI installed: v$GLOBAL_VERSION"
    else
        echo "❌ Global CLI installation failed"
        echo "💡 Try running with sudo: sudo npm link"
        echo "💡 Or check your npm global directory permissions"
    fi
fi

# Test CLI functionality
echo "🧪 Testing CLI functionality..."
if workspace --help &> /dev/null; then
    echo "✅ CLI help command works"
else
    echo "❌ CLI help command failed"
fi

if workspace doctor &> /dev/null; then
    echo "✅ CLI doctor command works"
else
    echo "⚠️  CLI doctor command failed (this might be normal if dependencies are missing)"
fi

# Final test with dry run
echo "🧪 Testing workspace creation (dry run)..."
if workspace init java test-branch --dry-run &> /dev/null; then
    echo "✅ Workspace creation test passed"
else
    echo "⚠️  Workspace creation test failed (check configuration)"
fi

echo ""
echo "🎉 Installation troubleshooting completed!"
echo "💡 If you're still having issues:"
echo "   1. Try: npm run install-global"
echo "   2. Or: node scripts/install.js"
echo "   3. Check: https://github.com/tusharpandey13/workspace-cli/issues"
