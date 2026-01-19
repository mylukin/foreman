#!/usr/bin/env bash
#
# Test script for bootstrap-cli.sh
#

set -euo pipefail

echo "Testing Foreman CLI Bootstrap..."
echo ""

# Set up environment
export CLAUDE_PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "1. Testing bootstrap script sourcing..."
source "${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh"
echo ""

echo "2. Testing ralph-dev function..."
if command -v ralph-dev &> /dev/null; then
  echo "✓ ralph-dev function is available"
else
  echo "✗ ralph-dev function is NOT available"
  exit 1
fi
echo ""

echo "3. Testing CLI execution..."
VERSION=$(ralph-dev --version 2>&1)
if [ $? -eq 0 ]; then
  echo "✓ CLI executed successfully"
  echo "  Version: $VERSION"
else
  echo "✗ CLI execution failed"
  exit 1
fi
echo ""

echo "4. Testing tasks list command..."
if ralph-dev tasks list --help > /dev/null 2>&1; then
  echo "✓ Tasks command works"
else
  echo "✗ Tasks command failed"
  exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All bootstrap tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
