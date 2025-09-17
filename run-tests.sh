#!/bin/bash
cd /Users/tushar.pandey/src/workspace/workspace-cli
pnpm test --run 2>&1
echo "Exit code: $?"
