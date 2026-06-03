#!/usr/bin/env bash
# One-time setup on Amazon Linux 2023 EC2. Run as ec2-user with sudo.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/loomi}"
REPO_URL="${REPO_URL:-}" # e.g. https://github.com/you/loomi.git

echo "==> Installing Docker..."
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

echo "==> Installing Docker Compose plugin..."
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

if [[ -n "$REPO_URL" ]]; then
  echo "==> Cloning application to ${APP_DIR}..."
  sudo mkdir -p "$(dirname "$APP_DIR")"
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    sudo git clone "$REPO_URL" "$APP_DIR"
    sudo chown -R ec2-user:ec2-user "$APP_DIR"
  fi
fi

echo "==> Done. Log out and back in so docker group applies, then:"
echo "    cd ${APP_DIR}"
echo "    cp .env.ec2.example .env   # edit YOUR_EC2_PUBLIC_IP and secrets"
echo "    docker compose -f docker-compose.ec2.yml --env-file .env up -d --build"
