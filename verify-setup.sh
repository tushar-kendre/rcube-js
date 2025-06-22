#!/usr/bin/env sh

echo "🔧 Git-CZ and Husky Setup Verification"
echo "======================================"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

echo "✅ Git repository detected"

# Check if husky is installed
if [ -d ".husky" ]; then
    echo "✅ Husky directory exists"
else
    echo "❌ Husky directory not found"
    exit 1
fi

# Check husky hooks
if [ -f ".husky/_/pre-commit" ]; then
    echo "✅ Pre-commit hook exists"
else
    echo "❌ Pre-commit hook not found"
fi

if [ -f ".husky/_/commit-msg" ]; then
    echo "✅ Commit-msg hook exists"
else
    echo "❌ Commit-msg hook not found"
fi

if [ -f ".husky/_/pre-push" ]; then
    echo "✅ Pre-push hook exists"
else
    echo "❌ Pre-push hook not found"
fi

# Check configuration files
if [ -f "commitlint.config.js" ]; then
    echo "✅ Commitlint config exists"
else
    echo "❌ Commitlint config not found"
fi

if [ -f ".czrc" ]; then
    echo "✅ Commitizen config exists"
else
    echo "❌ Commitizen config not found"
fi

# Test commitlint
echo ""
echo "🧪 Testing commitlint..."
echo "feat: test commit message" | yarn commitlint
if [ $? -eq 0 ]; then
    echo "✅ Commitlint working correctly"
else
    echo "❌ Commitlint test failed"
fi

echo "test: invalid message" | yarn commitlint
if [ $? -eq 1 ]; then
    echo "✅ Commitlint correctly rejects invalid messages"
else
    echo "❌ Commitlint should reject invalid messages"
fi

echo ""
echo "📋 Available Commands:"
echo "  yarn commit        - Interactive commit with git-cz"
echo "  git cz             - Alternative commit command"
echo "  yarn lint-staged   - Run linting on staged files"
echo ""
echo "🎉 Setup verification complete!"
