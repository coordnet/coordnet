#!/usr/bin/env bash
# Wrapper to run commands for pre-commit inside a docker container
#set -x

# We need to run the command from the parent directory, since the Dockerfile will[[
# put us into the backend directory directly.
docker compose run --rm -T django bash -c "cd ..; $*"
