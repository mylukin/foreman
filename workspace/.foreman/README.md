# Foreman Workspace

This directory contains AI-generated artifacts from the Foreman plugin for Claude Code.

## Structure

- `state.json` - Current session state (phase, progress) [gitignored]
- `prd.md` - Product Requirements Document [committed to git]
- `tasks/` - Task breakdown (one markdown file per task) [committed to git]
- `progress.log` - Audit trail [gitignored]
- `debug.log` - Error recovery log [gitignored]

## Safe to Delete?

Yes, but you'll lose session progress. Foreman will start fresh next time.

## Resuming Work on Different Machine

Commit `prd.md` and `tasks/**/*.md` to git (already configured in .gitignore).
Don't commit `state.json` or log files.

## Multi-Session Note

Only one active ralph-dev session per directory is supported in the current version.
