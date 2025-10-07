#!/bin/bash
# Global space CLI wrapper that works without nvm
exec /Users/tushar.pandey/.nvm/versions/node/v22.12.0/bin/node "$(dirname "$0")/dist/bin/workspace.js" "$@"
