#!/usr/bin/env bash
# Wrapper to run commands for pre-commit inside a specified Docker container

# Exit immediately if a command exits with a non-zero status
set -e

# Check if at least two arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <container> <command> [args...]"
    exit 1
fi

# Extract the container name and shift
CONTAINER="$1"
shift

# The command to execute
COMMAND="$1"
shift

# Initialize an array to hold modified arguments
MODIFIED_ARGS=()

if [ "$CONTAINER" == "django" ]; then
    # For the 'django' container, pass the arguments as-is
    MODIFIED_ARGS=("$@")
elif [ "$CONTAINER" == "crdt" ] || [ "$CONTAINER" == "frontend" ]; then
    # Loop through all remaining arguments to adjust file paths
    for ARG in "$@"; do
        # If the argument starts with '$CONTAINER/', remove it
        if [[ "$ARG" == "$CONTAINER/"* ]]; then
            MODIFIED_ARG="${ARG#$CONTAINER/}"
        else
            MODIFIED_ARG="$ARG"
        fi
        MODIFIED_ARGS+=("$MODIFIED_ARG")
    done
else
    echo "Error: Unknown container '$CONTAINER'. Valid containers are 'django', 'crdt', 'frontend'."
    exit 1
fi

# Build the full command to execute
FULL_COMMAND="$COMMAND ${MODIFIED_ARGS[*]}"

if [ "$CONTAINER" == "django" ]; then
    # For the 'django' container, navigate to the parent directory
    docker compose run --rm -T "$CONTAINER" bash -c "cd ..; $FULL_COMMAND"
else
    # For 'crdt' and 'frontend' containers, mount the container directory to /app
    SCRIPTPATH="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
    docker compose run --rm \
        -v "$SCRIPTPATH/$CONTAINER:/app" \
        -v "/app/node_modules/" \
        -T "$CONTAINER" bash -c "cd /app && $FULL_COMMAND"
fi
