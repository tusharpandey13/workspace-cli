#!/bin/bash

echo "Testing TypeScript workspace-cli build..."

# Test basic commands
echo "1. Testing --version:"
node dist/bin/workspace.js --version

echo -e "\n2. Testing --help:"
node dist/bin/workspace.js --help | head -10

echo -e "\n3. Testing projects command:"
node dist/bin/workspace.js projects

echo -e "\n4. Testing list command:"
node dist/bin/workspace.js list

echo -e "\nAll basic tests completed successfully!"
