#!/usr/bin/env sh
# Mechanical checks for skills, commands, and agents. Judgement calls belong to /review-skill.
# Exits 1 on any error; warnings are reported but don't fail.
set -eu

SPEC_KEYS="name description license compatibility metadata allowed-tools"
# Tool names only one harness provides. They may appear under claude/ and opencode/, nowhere else.
HARNESS_TOOLS='WebFetch|WebSearch|TodoWrite|NotebookEdit|AskUserQuestion|run_in_background|mcp__'
MAX_SKILL_LINES=150

REPO_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$REPO_DIR"

ERRORS=0
WARNINGS=0
NL='
'

say() { printf '%s\n' "$*"; }
error() { printf '  error  %s: %s\n' "$1" "$2"; ERRORS=$((ERRORS + 1)); }
warn() { printf '  warn   %s: %s\n' "$1" "$2"; WARNINGS=$((WARNINGS + 1)); }

# frontmatter FILE: the lines between the opening and closing '---'
frontmatter() {
  awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } NR > 1 { print }' "$1"
}

# body FILE: everything after the frontmatter
body() {
  awk 'NR == 1 && $0 != "---" { b = 1 } b { print; next } NR > 1 && $0 == "---" { b = 1 }' "$1"
}

# keys FILE: the top-level frontmatter keys
keys() {
  frontmatter "$1" | sed -n 's/^\([A-Za-z0-9_-][A-Za-z0-9_-]*\):.*/\1/p'
}

# field FILE KEY: a top-level frontmatter value, unquoted, with continuation lines joined
field() {
  frontmatter "$1" | awk -v key="$2" -v q="'" '
    found && /^[ \t]/ { sub(/^[ \t]+/, ""); v = v (v == "" ? "" : " ") $0; next }
    found { exit }
    index($0, key ":") == 1 {
      found = 1
      v = substr($0, length(key) + 2)
      sub(/^[ \t]+/, "", v)
      if (v ~ /^[>|][-+]?$/) v = ""
    }
    END { gsub("^[\"" q "]|[\"" q "]$", "", v); print v }'
}

# each_hit LEVEL MESSAGE HITS: one report per 'file:line:text' line of grep output
each_hit() {
  [ -n "$3" ] || return 0
  set -f
  old_ifs=$IFS
  IFS=$NL
  for hit in $3; do
    "$1" "$(printf '%s' "$hit" | cut -d: -f1-2)" "$2"
  done
  IFS=$old_ifs
  set +f
}

check_skills() {
  say "[skills]"
  for dir in skills/*/; do
    id=$(basename -- "$dir")
    f=skills/$id/SKILL.md
    if [ ! -f "$f" ]; then
      error "$dir" "no SKILL.md"
      continue
    fi
    if [ "$(head -n 1 "$f")" != "---" ]; then
      error "$f" "no frontmatter"
      continue
    fi

    for key in $(keys "$f"); do
      case " $SPEC_KEYS " in
        *" $key "*) ;;
        *) error "$f" "'$key' is not a spec field; move it under metadata" ;;
      esac
    done

    if ! printf '%s' "$id" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' || [ ${#id} -gt 64 ]; then
      error "$f" "'$id' is not a valid skill ID"
    fi
    name=$(field "$f" name)
    [ "$name" = "$id" ] || error "$f" "name '$name' does not match the directory '$id'"

    desc=$(field "$f" description)
    if [ -z "$desc" ]; then
      error "$f" "empty description"
    elif [ ${#desc} -gt 1024 ]; then
      error "$f" "description is ${#desc} characters (max 1024)"
    fi

    bad=$(frontmatter "$f" | awk '
      /^[^ \t]/ { m = ($0 ~ /^metadata:[ \t]*$/); next }
      m && !/^[ \t]+[A-Za-z0-9_.-]+:[ \t]*[^ \t]/ { print; exit }')
    [ -z "$bad" ] || error "$f" "metadata maps strings to strings, got '$(printf '%s' "$bad" | sed 's/^[ \t]*//')'"

    lines=$(wc -l < "$f" | tr -d ' ')
    [ "$lines" -le "$MAX_SKILL_LINES" ] ||
      warn "$f" "$lines lines (over $MAX_SKILL_LINES); disclose reference that only some branches need"
  done
}

check_commands() {
  say "[commands]"
  for f in commands/*.md; do
    [ -f "$f" ] || continue
    for key in $(keys "$f"); do
      [ "$key" = description ] ||
        error "$f" "'$key' is harness-specific; shared commands carry only description"
    done
  done
}

check_agents() {
  say "[agents]"
  for f in claude/agents/*.md; do
    [ -f "$f" ] || continue
    other=opencode/agents/$(basename -- "$f")
    if [ ! -f "$other" ]; then
      error "$f" "no opencode copy at $other"
    elif [ "$(body "$f")" != "$(body "$other")" ]; then
      error "$f" "body differs from $other; the copies may differ only in frontmatter"
    fi
  done
  for f in opencode/agents/*.md; do
    [ -f "$f" ] || continue
    [ -f "claude/agents/$(basename -- "$f")" ] || error "$f" "no Claude Code copy in claude/agents/"
  done
}

check_harness_names() {
  say "[harness tool names]"
  each_hit error "names a tool only one harness provides; describe the capability instead" \
    "$(grep -rnE "$HARNESS_TOOLS" skills commands instructions || true)"
}

check_markdown() {
  say "[markdown]"
  files=$(find . -name '*.md' -not -path './.git/*' -not -path '*/node_modules/*' | sed 's|^\./||' | sort)

  each_hit error "escaped code fence; the file renders broken" \
    "$(printf '%s\n' "$files" | xargs grep -nF '\`\`\`' /dev/null || true)"

  set -f
  old_ifs=$IFS
  IFS=$NL
  for f in $files; do
    # 'line:target' for each inline link, skipping fenced blocks and code spans
    for link in $(awk '
      /^[ \t]*```/ { fence = !fence; next }
      fence { next }
      {
        line = $0
        gsub(/`[^`]*`/, "", line)
        while (match(line, /\]\([^)]+\)/)) {
          t = substr(line, RSTART + 2, RLENGTH - 3)
          line = substr(line, RSTART + RLENGTH)
          sub(/[ \t]+".*$/, "", t)
          print FNR ":" t
        }
      }' "$f"); do
      t=${link#*:}
      case $t in
        '#'* | *://* | mailto:*) continue ;;
      esac
      t=${t#<}
      t=${t%>}
      t=${t%%#*}
      case $t in
        /*) path=$t ;;
        *) path=$(dirname -- "$f")/$t ;;
      esac
      [ -e "$path" ] || error "$f:${link%%:*}" "broken link: $t"
    done
  done
  IFS=$old_ifs
  set +f
}

check_skills
check_commands
check_agents
check_harness_names
check_markdown

say "$ERRORS error(s), $WARNINGS warning(s)"
[ "$ERRORS" -eq 0 ]
