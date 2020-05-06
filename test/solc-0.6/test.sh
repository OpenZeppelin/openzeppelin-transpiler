#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$BASH_SOURCE")"

rm -rf build/contracts contracts/__upgradable__
oz compile --no-interactive
jest --verbose
