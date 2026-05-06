#!/bin/bash

set -e

echo "=========================================="
echo "Running All Tests"
echo "=========================================="
echo ""

# Backend tests
echo ">>> Running Backend Unit Tests with Coverage..."
cd /workspaces/fatec-yeb-db/backend
npm run test:ci

echo ""
echo "=========================================="
echo "Backend tests completed successfully"
echo "=========================================="
echo ""

# Frontend tests  
echo ">>> Running Frontend Unit Tests..."
cd /workspaces/fatec-yeb-db/frontend
npm run test:unit

echo ""
echo "=========================================="
echo "All Tests Completed Successfully!"
echo "=========================================="
