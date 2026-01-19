#!/usr/bin/env bash
#
# Foreman CLI Bootstrap Script
# Include this at the top of every skill that uses ralph-dev
#
# Usage in SKILL.md:
#   source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh
#
# This script will:
# 1. Check if the CLI is built and available
# 2. Build it automatically if missing (npm install + build)
# 3. Validate it works correctly
# 4. Provide friendly error messages if build fails
#
# Environment variables:
#   SKIP_BOOTSTRAP=1        Skip automatic bootstrap (for testing)
#   FORCE_REBUILD=1         Force rebuild even if CLI exists
#   BOOTSTRAP_QUIET=1       Suppress non-error output
#

set -euo pipefail

# ============================================================
# Color Output Helpers
# ============================================================

if [ -t 1 ]; then
  # Terminal supports colors
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  GRAY='\033[0;90m'
  BOLD='\033[1m'
  NC='\033[0m' # No Color
else
  # No color support
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  GRAY=''
  BOLD=''
  NC=''
fi

# ============================================================
# Configuration
# ============================================================

# Determine plugin root
if [ -z "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  # Fallback: assume script is in ralph-dev/shared/
  CLAUDE_PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

FOREMAN_CLI_PATH="${CLAUDE_PLUGIN_ROOT}/cli/dist/index.js"
FOREMAN_CLI_DIR="${CLAUDE_PLUGIN_ROOT}/cli"

# Helper function to run CLI (more reliable than string expansion)
_run_cli() {
  node "${FOREMAN_CLI_PATH}" "$@"
}

# Logging helpers
log_info() {
  if [ "${BOOTSTRAP_QUIET:-0}" != "1" ]; then
    echo -e "${BLUE}ℹ${NC} $*" >&2
  fi
}

log_success() {
  if [ "${BOOTSTRAP_QUIET:-0}" != "1" ]; then
    echo -e "${GREEN}✓${NC} $*" >&2
  fi
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*" >&2
}

log_error() {
  echo -e "${RED}✗${NC} $*" >&2
}

log_step() {
  if [ "${BOOTSTRAP_QUIET:-0}" != "1" ]; then
    echo -e "${CYAN}▸${NC} $*" >&2
  fi
}

# ============================================================
# CLI Detection Functions
# ============================================================

# Check if CLI binary exists
check_cli_exists() {
  [ -f "$FOREMAN_CLI_PATH" ]
}

# Check if node_modules exists
check_dependencies_installed() {
  [ -d "${FOREMAN_CLI_DIR}/node_modules" ]
}

# Validate CLI is executable and works
validate_cli() {
  if [ ! -f "$FOREMAN_CLI_PATH" ]; then
    return 1
  fi

  # Try to run CLI --version
  if _run_cli --version > /dev/null 2>&1; then
    return 0
  else
    log_error "CLI exists but failed to execute"
    return 1
  fi
}

# Check Node.js version compatibility
check_node_version() {
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    log_error "Foreman requires Node.js >= 18.0.0"
    log_error "Install from: https://nodejs.org/"
    return 1
  fi

  local node_version
  node_version=$(node --version | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d. -f1)

  if [ "$major_version" -lt 18 ]; then
    log_error "Node.js version $node_version is too old"
    log_error "Foreman requires Node.js >= 18.0.0"
    log_error "Current version: $node_version"
    return 1
  fi

  return 0
}

# ============================================================
# Build Functions
# ============================================================

# Install npm dependencies
install_dependencies() {
  log_step "Installing dependencies..."

  cd "$FOREMAN_CLI_DIR"

  # Use npm ci if package-lock.json exists, otherwise npm install
  if [ -f "package-lock.json" ]; then
    if npm ci --silent --no-progress 2>&1 | grep -v "^npm WARN"; then
      return 0
    else
      log_warning "npm ci failed, falling back to npm install"
      npm install --silent --no-progress 2>&1 | grep -v "^npm WARN" || true
    fi
  else
    npm install --silent --no-progress 2>&1 | grep -v "^npm WARN" || true
  fi

  if [ -d "node_modules" ]; then
    log_success "Dependencies installed"
    return 0
  else
    log_error "Failed to install dependencies"
    return 1
  fi
}

# Build TypeScript CLI
build_typescript() {
  log_step "Compiling TypeScript..."

  cd "$FOREMAN_CLI_DIR"

  # Run TypeScript compiler
  if npm run build --silent 2>&1 | grep -E "error TS|Build failed" >&2; then
    log_error "TypeScript compilation failed"
    return 1
  fi

  # Make output executable
  if [ -f "$FOREMAN_CLI_PATH" ]; then
    chmod +x "$FOREMAN_CLI_PATH"
    log_success "CLI compiled successfully"
    return 0
  else
    log_error "Build succeeded but output file not found"
    return 1
  fi
}

# Full build process
build_cli() {
  if [ "${BOOTSTRAP_QUIET:-0}" != "1" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}🔧 Building Foreman CLI${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  fi

  # Check Node.js version first
  if ! check_node_version; then
    return 1
  fi

  # Install dependencies if needed
  if ! check_dependencies_installed; then
    if ! install_dependencies; then
      return 1
    fi
  else
    log_info "Dependencies already installed"
  fi

  # Build TypeScript
  if ! build_typescript; then
    return 1
  fi

  if [ "${BOOTSTRAP_QUIET:-0}" != "1" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
  fi

  return 0
}

# ============================================================
# Main Bootstrap Logic
# ============================================================

bootstrap_ralph-dev_cli() {
  local force_rebuild="${FORCE_REBUILD:-0}"

  # Check if we should skip bootstrap
  if [ "${SKIP_BOOTSTRAP:-0}" = "1" ]; then
    log_info "Bootstrap skipped (SKIP_BOOTSTRAP=1)"
    return 0
  fi

  # Force rebuild if requested
  if [ "$force_rebuild" = "1" ]; then
    log_warning "Force rebuild requested (FORCE_REBUILD=1)"
    if ! build_cli; then
      log_error "CRITICAL: CLI build failed"
      return 1
    fi
    if ! validate_cli; then
      log_error "CRITICAL: CLI validation failed after build"
      return 1
    fi
    log_success "CLI rebuilt and validated"
    return 0
  fi

  # Check if CLI exists and works
  if check_cli_exists; then
    if validate_cli; then
      # CLI exists and works - we're done
      log_success "Foreman CLI ready"
      return 0
    else
      # CLI exists but is broken - rebuild
      log_warning "CLI exists but is not functional"
      log_warning "Rebuilding..."
      if ! build_cli; then
        log_error "CRITICAL: CLI rebuild failed"
        return 1
      fi
    fi
  else
    # CLI doesn't exist - build it
    if [ "${BOOTSTRAP_QUIET:-0}" != "1" ]; then
      log_info "Foreman CLI not found (this is normal on first use)"
    fi
    if ! build_cli; then
      log_error "CRITICAL: CLI build failed"
      return 1
    fi
  fi

  # Final validation
  if validate_cli; then
    log_success "Foreman CLI ready"
    return 0
  else
    log_error "CRITICAL: CLI validation failed after build"
    log_error ""
    log_error "Please report this issue:"
    log_error "  https://github.com/mylukin/ralph-dev/issues"
    log_error ""
    log_error "Include this information:"
    log_error "  - Node.js version: $(node --version 2>&1 || echo 'not found')"
    log_error "  - npm version: $(npm --version 2>&1 || echo 'not found')"
    log_error "  - OS: $(uname -s) $(uname -r)"
    return 1
  fi
}

# ============================================================
# Exported Functions
# ============================================================

# Create ralph-dev wrapper function for use in skills
ralph-dev() {
  _run_cli "$@"
}

# Export functions for use in bash scripts
export -f _run_cli
export -f ralph-dev

# ============================================================
# Auto-Execute Bootstrap
# ============================================================

# Run bootstrap automatically when sourced
# Can be disabled by setting SKIP_BOOTSTRAP=1

# Check if script is being sourced (safely handle BASH_SOURCE)
if [ -n "${BASH_SOURCE[0]:-}" ] && [ "${BASH_SOURCE[0]}" != "${0}" ]; then
  # Script is being sourced, run bootstrap
  bootstrap_ralph-dev_cli
elif [ -z "${BASH_SOURCE[0]:-}" ]; then
  # BASH_SOURCE not available (sourced in some shells), run bootstrap
  bootstrap_ralph-dev_cli
else
  # Script is being executed directly (for testing)
  echo "Bootstrap script loaded. Run: bootstrap_ralph-dev_cli"
fi
