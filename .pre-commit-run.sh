#!/usr/bin/env bash
# Wrapper to run commands for pre-commit inside a docker container
#set -x

DIR=$(pwd)
export DIR
#echo "$@"

docker compose run --rm -T django bash -c "$*"
