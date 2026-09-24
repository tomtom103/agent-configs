#!/usr/bin/env sh
set -eu

ALL_HARNESSES="opencode claude"

usage() {
  cat <<EOF
Usage: ./install.sh [--dry-run] [--force] [--check] [HARNESS...]

Symlink this repo into each harness's config directory.
HARNESS defaults to every supported harness: $ALL_HARNESSES

Options:
  --dry-run   Print actions without changing anything
  --force     Replace targets that differ from the repo (backs them up first)
  --check     Report link status; exit 1 if anything is missing or drifted
EOF
}

DRY_RUN=0
FORCE=0
CHECK=0
HARNESSES=

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --force) FORCE=1 ;;
    --check) CHECK=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
    *) HARNESSES="$HARNESSES $1" ;;
  esac
  shift
done

REPO_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}
STAMP=$(date +%Y%m%d-%H%M%S)
DRIFT=0

say() { printf '%s\n' "$*"; }
report() { printf '  %-10s %s\n' "$1" "$2"; }

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    say "  + $*"
  else
    "$@"
  fi
}

# link SRC DST: symlink repo-relative SRC to absolute DST.
# A DST regular file with identical content is backed up and replaced.
# Anything else already at DST is left alone unless --force.
link() {
  src=$REPO_DIR/$1
  dst=$2

  if [ ! -e "$src" ]; then
    say "ERROR: $1 does not exist in the repo" >&2
    exit 1
  fi

  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    report ok "$dst"
    return 0
  fi

  if [ -e "$dst" ] || [ -L "$dst" ]; then
    if [ -f "$dst" ] && [ ! -L "$dst" ] && cmp -s "$src" "$dst"; then
      state=identical
    else
      state=differs
    fi
    if [ "$CHECK" -eq 1 ] || { [ "$state" = differs ] && [ "$FORCE" -eq 0 ]; }; then
      report "$state" "$dst"
      DRIFT=1
      return 0
    fi
    run mv "$dst" "$dst.bak.$STAMP"
  elif [ "$CHECK" -eq 1 ]; then
    report missing "$dst"
    DRIFT=1
    return 0
  fi

  run mkdir -p "$(dirname -- "$dst")"
  run ln -s "$src" "$dst"
  [ "$DRY_RUN" -eq 1 ] || report linked "$dst"
}

harness_opencode() {
  dir=$CONFIG_HOME/opencode
  link instructions/global.md "$dir/AGENTS.md"
  link skills "$dir/skills"
  link opencode/opencode.jsonc "$dir/opencode.jsonc"
  link opencode/cli.json "$dir/cli.json"
  link opencode/agents "$dir/agents"
  link commands "$dir/commands"
  link opencode/plugins "$dir/plugins"
}

harness_claude() {
  dir=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
  link instructions/global.md "$dir/CLAUDE.md"
  link claude/agents "$dir/agents"
  link commands "$dir/commands"
  # Claude Code keeps its own synced skills in ~/.claude/skills, so link each skill
  # individually instead of replacing the directory
  for skill in "$REPO_DIR"/skills/*/; do
    skill=$(basename -- "$skill")
    link "skills/$skill" "$dir/skills/$skill"
  done
}

main() {
  set -- ${HARNESSES:-$ALL_HARNESSES}

  for h in "$@"; do
    case " $ALL_HARNESSES " in
      *" $h "*) ;;
      *) echo "Unknown harness: $h (supported: $ALL_HARNESSES)" >&2; exit 2 ;;
    esac
  done

  say "Repo: $REPO_DIR"
  for h in "$@"; do
    say "[$h]"
    "harness_$h"
  done

  if [ "$DRIFT" -eq 1 ]; then
    if [ "$CHECK" -eq 0 ]; then
      say "Some targets differ from the repo and were left alone."
      say "Reconcile them, or rerun with --force to back them up and link."
    fi
    exit 1
  fi
}

main
