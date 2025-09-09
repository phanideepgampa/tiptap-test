#!/usr/bin/env bash
set -euo pipefail

# Very small YAML scanner for our limited backlog structure.
# Prints the first task with status: pending as key=value lines.

FILE=${1:-tasks/backlog.yaml}

current_id=""
current_title=""
current_status=""
current_allowed=""
current_validate=""
in_task=0
in_allowed=0
in_validate=0

while IFS= read -r line; do
  case "$line" in
    "  - id:"*)
      in_task=1; in_allowed=0; in_validate=0
      current_id=$(echo "$line" | sed -E 's/.*id:[[:space:]]*//')
      current_title=""; current_status=""; current_allowed=""; current_validate=""
      ;;
    "    title:"*)
      current_title=$(echo "$line" | sed -E 's/.*title:[[:space:]]*"?//; s/"$//')
      ;;
    "    status:"*)
      current_status=$(echo "$line" | sed -E 's/.*status:[[:space:]]*//')
      ;;
    "    allowed_files:"*)
      in_allowed=1; in_validate=0
      ;;
    "    validate:"*)
      in_allowed=0; in_validate=1
      ;;
    "    acceptance:"*)
      in_allowed=0; in_validate=0
      ;;
    "    depends_on:"*)
      in_allowed=0; in_validate=0
      ;;
    "      - "*)
      if [ "$in_allowed" -eq 1 ]; then
        item=$(echo "$line" | sed -E 's/.*- [[:space:]]*//')
        if [ -z "$current_allowed" ]; then current_allowed="$item"; else current_allowed="$current_allowed;$item"; fi
      elif [ "$in_validate" -eq 1 ]; then
        item=$(echo "$line" | sed -E 's/.*- [[:space:]]*//')
        if [ -z "$current_validate" ]; then current_validate="$item"; else current_validate="$current_validate;$item"; fi
      fi
      ;;
    *) ;;
  esac

  # When we hit the next task or end of file, check if pending
  if [[ "$line" =~ ^\ \ -\ id: ]] || [ -z "$line" ]; then
    if [ "$in_task" -eq 1 ] && [ "$current_status" = "pending" ] && [ -n "$current_id" ]; then
      echo "id=$current_id"
      echo "title=$current_title"
      echo "status=$current_status"
      echo "allowed_files=$current_allowed"
      echo "validate=$current_validate"
      exit 0
    fi
  fi
done < "$FILE"

exit 1

