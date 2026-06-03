#!/usr/bin/env bash
# Run on the EC2 host after git pull (manual or via GitHub Actions SSH).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/loomi}"
cd "$APP_DIR"

git fetch origin
git checkout "${DEPLOY_BRANCH:-main}"
git pull origin "${DEPLOY_BRANCH:-main}"

docker compose -f docker-compose.ec2.yml --env-file .env build
docker compose -f docker-compose.ec2.yml --env-file .env up -d

docker compose -f docker-compose.ec2.yml ps
