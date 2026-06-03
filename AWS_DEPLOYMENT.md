# Deploy Loomi on one AWS EC2 instance

**New to AWS or Temporal?** Follow **[SETUP_AWS_TEMPORAL.md](./SETUP_AWS_TEMPORAL.md)** for account creation, API keys, and `.env` values step by step.

**Hackathon note:** Judges score your **demo, MCP usage, and submission docs** — not whether you used ECS, Kubernetes, or a fancy pipeline. A single **EC2 + Docker Compose** deployment is appropriate. GitHub Actions here only runs tests and optionally SSH-deploys; that is enough.

---

## Architecture

```text
Internet → EC2 (one VM)
  ├── :3000  frontend (Next.js)
  ├── :3001  backend (Express, MCP OAuth callback)
  └── worker (no public port)
        └── Temporal Cloud (gRPC, outside EC2)
```

| Piece | Where |
|-------|--------|
| UI + Next API routes | `frontend` container |
| REST + MCP OAuth | `backend` container |
| Workflows | `temporal-worker` container |
| Temporal server | **Temporal Cloud** (recommended) — not on this EC2 |
| MCP OAuth tokens | Docker volume `mcp_oauth_data` |

**Do not** run Postgres + Elasticsearch + Temporal on a small EC2 unless you use a **t3.xlarge (16 GB)** and `docker-compose.yml` as-is. For a **t3.large (8 GB)**, use `docker-compose.ec2.yml` + Temporal Cloud.

---

## 1. Launch EC2

| Setting | Value |
|---------|--------|
| AMI | Amazon Linux 2023 |
| Instance | **t3.large** minimum (8 GB RAM) |
| Storage | 30 GB gp3 |
| Key pair | Create/download `.pem` for SSH |

**Security group inbound:**

| Port | Purpose |
|------|---------|
| 22 | SSH (your IP only) |
| 3000 | Campaign Studio UI |
| 3001 | Backend + MCP OAuth callback |

Optional later: 80/443 + Caddy/nginx if you add a domain and TLS.

---

## 2. One-time server setup

SSH in:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Bootstrap Docker and clone the repo:

```bash
export REPO_URL=https://github.com/YOUR_ORG/loomi.git
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/loomi/main/scripts/ec2/bootstrap.sh | bash
# Or from a cloned repo:
# bash scripts/ec2/bootstrap.sh
```

Log out and back in (docker group), then:

```bash
cd /opt/loomi
cp .env.ec2.example .env
nano .env   # set YOUR_EC2_PUBLIC_IP, GEMINI_API_KEY, TEMPORAL_ADDRESS
```

### Temporal Cloud (recommended)

1. Sign up at [cloud.temporal.io](https://cloud.temporal.io).
2. Create a namespace → copy **gRPC address** into `.env`:

```env
TEMPORAL_ADDRESS=your-namespace.a1b2c.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace.a1b2c
TEMPORAL_API_KEY=tmprl-your-api-key-from-cloud-ui
```

3. Ensure the EC2 security group allows **outbound** HTTPS/gRPC (default allows all outbound).

First start:

```bash
docker compose -f docker-compose.ec2.yml --env-file .env up -d --build
docker compose -f docker-compose.ec2.yml ps
```

Open: `http://YOUR_EC2_PUBLIC_IP:3000`  
MCP sign-in callback: `http://YOUR_EC2_PUBLIC_IP:3001/api/mcp/auth/callback` (must match `MCP_OAUTH_REDIRECT_URL` in `.env`).

---

## 3. GitHub CI/CD (optional)

| Workflow | When | What |
|----------|------|------|
| `ci.yml` | PR + push | Tests only |
| `deploy-ec2.yml` | Push to `main` | Tests → SSH → `scripts/ec2/deploy.sh` |

**Secrets** (repo → Settings → Actions → Secrets):

| Secret | Example |
|--------|---------|
| `EC2_HOST` | `3.12.34.56` |
| `EC2_SSH_PRIVATE_KEY` | Contents of your `.pem` file |
| `EC2_USER` | `ec2-user` (optional) |

**Variable** (optional):

| Variable | Default |
|----------|---------|
| `EC2_APP_DIR` | `/opt/loomi` |

On the EC2 host once, allow deploy key or use HTTPS git with a PAT:

```bash
cd /opt/loomi && git remote -v
# Ensure git pull works non-interactively for the deploy user
```

Manual deploy without Actions:

```bash
ssh ec2-user@YOUR_EC2_PUBLIC_IP 'bash /opt/loomi/scripts/ec2/deploy.sh'
```

You can skip `deploy-ec2.yml` entirely and deploy by SSH when you want — **no hackathon penalty**.

---

## 4. `.env` checklist

Replace `YOUR_EC2_PUBLIC_IP` everywhere it appears:

```env
PUBLIC_API_BASE_URL=http://YOUR_EC2_PUBLIC_IP:3001
MCP_OAUTH_REDIRECT_URL=http://YOUR_EC2_PUBLIC_IP:3001/api/mcp/auth/callback
CORS_ALLOWED_ORIGINS=http://YOUR_EC2_PUBLIC_IP:3000
TEMPORAL_ADDRESS=<from Temporal Cloud>
GEMINI_API_KEY=<required for live MCP reasoning>
```

After Bloomreach OAuth, MCP tokens persist in volume `mcp_oauth_data` across restarts.

---

## 5. Operations

```bash
cd /opt/loomi

# Logs
docker compose -f docker-compose.ec2.yml logs -f backend
docker compose -f docker-compose.ec2.yml logs -f temporal-worker
docker compose -f docker-compose.ec2.yml logs -f frontend

# Restart
docker compose -f docker-compose.ec2.yml --env-file .env up -d --build

# Stop (save hackathon credits)
docker compose -f docker-compose.ec2.yml down
```

**Stop the instance** in the AWS console when not demoing.

---

## 6. All-in-one EC2 (self-hosted Temporal)

Only if you refuse Temporal Cloud and accept higher cost:

- Instance: **t3.xlarge** (16 GB RAM)
- Use full `docker-compose.yml` (postgres + elasticsearch + temporal + app)
- First boot takes several minutes

```bash
docker compose --env-file .env up -d --build
```

Adjust ports in `.env` to match `BACKEND_PORT` / frontend.

---

## 7. Optional: HTTPS with a domain

Point DNS `A` record → EC2 IP. Install Caddy on the host to proxy:

- `app.yourdomain.com` → `localhost:3000`
- `api.yourdomain.com` → `localhost:3001`

Then update `.env`:

```env
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
MCP_OAUTH_REDIRECT_URL=https://api.yourdomain.com/api/mcp/auth/callback
PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

Rebuild frontend so `BACKEND_URL` at build time matches (or use internal `http://backend:3001` for rewrites and public URL only for OAuth).

---

## Appendix — ECS Fargate (not required)

If you later want containers without managing a VM, see the optional workflow `.github/workflows/deploy-aws-ecs.yml` and the ECS sections in git history. **Not needed for the hackathon.**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| UI loads, campaigns hang | Worker running? `TEMPORAL_ADDRESS` correct? Outbound network? |
| MCP OAuth fails | `MCP_OAUTH_REDIRECT_URL` must match exactly what you open in the browser |
| CORS errors | `CORS_ALLOWED_ORIGINS` must include `http://IP:3000` |
| OOM on EC2 | Use Temporal Cloud + `docker-compose.ec2.yml`, or upsize instance |
| Deploy Action fails | SSH key, `EC2_HOST`, git pull on server |

Hackathon AWS help: Slack `#aws`.
