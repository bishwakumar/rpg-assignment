#!/bin/sh
set -e

echo "Starting backend service..."

# Move into backend directory
cd backend

echo "Installing dependencies..."
npm install --omit=dev

echo "Building application..."
npm run build

echo "Starting application in production mode..."
npm run start:prod


