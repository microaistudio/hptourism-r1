#!/bin/bash
# MinIO Server Startup Script for Replit Environment

# Set MinIO credentials
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin123

# Create data directory if it doesn't exist
mkdir -p /tmp/minio-data

# Start MinIO server
echo "Starting MinIO Object Storage Server..."
echo "Console: http://localhost:9001"
echo "API: http://localhost:9000"

minio server /tmp/minio-data --console-address ":9001" --address ":9000"
