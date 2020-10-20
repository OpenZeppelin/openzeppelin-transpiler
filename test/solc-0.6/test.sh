#!/usr/bin/env bash

set -euo pipefail

cwd="$(pwd)"

cd "$(dirname "$BASH_SOURCE")"

rm -rf contracts/__upgradeable__
oz compile --no-interactive

cd "$cwd"

ava "$@"
