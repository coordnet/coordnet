#!/usr/bin/env bash
# Wrapper to run commands for pre-commit inside a specified Docker container

# Exit immediately if a command exits with a non-zero status
set -e

# Check if at least two arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <container> <command> [args...]"
    exit 1
fi

# Extract the container name and the command
CONTAINER="$1"
shift

if [ "$CONTAINER" == "django" ]; then
    COMMAND="$@"
else
    # For other containers, modify file paths by replacing "node/" with "/app/"
    MODIFIED_ARGS=()
    for ARG in "$@"; do
        if [[ "$ARG" == node/* ]]; then
            MODIFIED_ARG="${ARG/node\//\/app\/}"
            MODIFIED_ARGS+=("$MODIFIED_ARG")
        else
            MODIFIED_ARGS+=("$ARG")
        fi
    done
    COMMAND="${MODIFIED_ARGS[@]}"
fi

SCRIPTPATH="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"

if [ "$CONTAINER" == "django" ]; then
    # For the Django container, navigate to the parent directory
    docker compose run --rm -T "$CONTAINER" bash -c "cd ..; $COMMAND"
else
    # For all other containers, map ./node to /app inside the container
    docker compose run --rm \
        -v "$SCRIPTPATH/node:/app" \
        -v "/app/node_modules/" \
        -v "/app/frontend/node_modules/" \
        -v "/app/crdt/node_modules/" \
        -v "/app/packages/core/node_modules/" \
        -T "$CONTAINER" bash -c "$COMMAND"
fi
