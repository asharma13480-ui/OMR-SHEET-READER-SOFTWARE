#!/bin/bash
echo "=== OMR Sheet Reader - VPS Deploy ==="

# Install dependencies
echo "[1/5] Installing dependencies..."
bun install

# Setup database
echo "[2/5] Setting up database..."
mkdir -p db
bun run db:push

# Build
echo "[3/5] Building application..."
bun run build

# Stop old process
echo "[4/5] Restarting server..."
pm2 delete omr-reader 2>/dev/null || true

# Start new
pm2 start bun --name "omr-reader" -- start
pm2 save

echo "[5/5] Done! App running on port 3000"
echo "Configure Nginx + SSL for your domain (see Help page)"
