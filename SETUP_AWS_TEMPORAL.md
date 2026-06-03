# Step-by-step: AWS + Temporal Cloud accounts

Use this checklist once, then copy values into `.env` on your EC2 instance.

**Hackathon:** AWS credits may come from your team Slack (`#aws`). Temporal Cloud has a free tier for development.

---

## Part 1 — AWS account

### 1.1 Create the account

1. Open [https://aws.amazon.com](https://aws.amazon.com) → **Create an AWS Account**.
2. Use an email you control (team lead email is fine).
3. Choose **Personal** or **Business** (either works for a hackathon).
4. Add a payment method — required even for free tier; hackathon credits may be applied later via organizers.
5. Complete phone verification and pick a support plan (**Free** / Basic).

### 1.2 Secure sign-in (recommended)

1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → **Users** → **Create user**.
2. Name: `loomi-deploy` (or your name).
3. **Attach policies directly** → add **AmazonEC2FullAccess** (hackathon simplicity). For production, scope this down later.
4. **Create user** → open the user → **Security credentials** → **Create access key** (only if you need CLI; for EC2 SSH you mainly need the key pair below).
5. Enable **MFA** on your root or IAM user (optional but good practice).

### 1.3 Create an EC2 key pair (for SSH)

1. [EC2 Console](https://console.aws.amazon.com/ec2/) → region top-right (e.g. **US East (N. Virginia)** `us-east-1`).
2. Left menu → **Key Pairs** → **Create key pair**.
3. Name: `loomi-ec2-key`, type **RSA**, format **`.pem`**.
4. Download the `.pem` file — **you cannot download it again**.
5. On your laptop:

```bash
chmod 400 ~/Downloads/loomi-ec2-key.pem
```

### 1.4 Launch the EC2 instance

1. EC2 → **Instances** → **Launch instances**.
2. Settings:
   - **Name:** `loomi-campaign-studio`
   - **AMI:** Amazon Linux 2023
   - **Instance type:** `t3.large` (8 GiB RAM)
   - **Key pair:** `loomi-ec2-key`
   - **Network:** default VPC is fine
   - **Security group:** create new, rules:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | **My IP** |
| Custom TCP | 3000 | `0.0.0.0/0` (UI) |
| Custom TCP | 3001 | `0.0.0.0/0` (API / MCP OAuth) |

   - **Storage:** 30 GiB gp3
3. **Launch instance**.
4. Wait until **Instance state** = **Running**.
5. Copy **Public IPv4 address** (e.g. `3.15.42.10`) — this is `YOUR_EC2_PUBLIC_IP`.

### 1.5 SSH into the box

```bash
ssh -i ~/Downloads/loomi-ec2-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

If connection times out: security group must allow SSH from your current IP (it changes on home Wi‑Fi).

### 1.6 Install the app on EC2

On the instance (after SSH):

```bash
sudo dnf install -y git
export REPO_URL=https://github.com/YOUR_GITHUB_USER/loomi.git
sudo git clone "$REPO_URL" /opt/loomi
sudo chown -R ec2-user:ec2-user /opt/loomi
```

Or upload the project with `scp -r`.

Then run bootstrap (Docker):

```bash
bash /opt/loomi/scripts/ec2/bootstrap.sh
```

Log out and SSH back in, then:

```bash
cd /opt/loomi
cp .env.ec2.example .env
```

You will fill `.env` after Part 2 (Temporal) and Part 3 (API keys).

---

## Part 2 — Temporal Cloud account

### 2.1 Sign up

1. Go to [https://cloud.temporal.io](https://cloud.temporal.io).
2. **Sign up** (Google/GitHub/email).
3. Confirm email if prompted.

### 2.2 Create a namespace

1. In the UI: **Namespaces** → **Create Namespace**.
2. Suggested name: `loomi-hackathon` (or your team name).
3. Region: pick one close to your EC2 region (e.g. `us-east-1` if EC2 is in Virginia).
4. Wait until status is **Active** (1–2 minutes).

### 2.3 Copy connection settings

Open your namespace → note these three values:

| UI label | Goes in `.env` as |
|----------|-------------------|
| **Namespace** (often `name.accountId`, e.g. `loomi-hackathon.a1b2c`) | `TEMPORAL_NAMESPACE` |
| **gRPC endpoint** (host:port, e.g. `loomi-hackathon.a1b2c.tmprl.cloud:7233`) | `TEMPORAL_ADDRESS` |
| (task queue — you choose) | `TEMPORAL_TASK_QUEUE=chromaflow-task-queue` |

Example:

```env
TEMPORAL_ADDRESS=loomi-hackathon.a1b2c.tmprl.cloud:7233
TEMPORAL_NAMESPACE=loomi-hackathon.a1b2c
TEMPORAL_TASK_QUEUE=chromaflow-task-queue
```

### 2.4 Create an API key

New Temporal Cloud accounts use **API key** auth (TLS required).

1. Temporal Cloud → **Settings** or **API keys** (or **Users & accounts** → API keys).
2. **Create API key** → name `loomi-ec2` → copy the key **once** (it will not show again).
3. Add to `.env`:

```env
TEMPORAL_API_KEY=tmprl-xxxxxxxxxxxxxxxx
```

The app enables TLS automatically when `TEMPORAL_API_KEY` is set (`backend/src/lib/temporalConnection.ts`).

### 2.5 Verify from your laptop (optional)

With Node in `backend/`:

```bash
cd backend
export TEMPORAL_ADDRESS=...
export TEMPORAL_NAMESPACE=...
export TEMPORAL_API_KEY=...
npm run dev
```

In another terminal: `npm run dev:worker`. If both start without connection errors, Temporal is configured correctly.

---

## Part 3 — Fill `.env` on EC2

Edit on the server:

```bash
nano /opt/loomi/.env
```

Minimum set:

```env
# Replace with your EC2 public IP
PUBLIC_API_BASE_URL=http://3.15.42.10:3001
MCP_OAUTH_REDIRECT_URL=http://3.15.42.10:3001/api/mcp/auth/callback
CORS_ALLOWED_ORIGINS=http://3.15.42.10:3000
FRONTEND_URL=http://3.15.42.10:3000
NEXT_PUBLIC_API_BASE_URL=http://3.15.42.10:3001

FRONTEND_PORT=3000
BACKEND_PORT=3001

TEMPORAL_ADDRESS=loomi-hackathon.a1b2c.tmprl.cloud:7233
TEMPORAL_NAMESPACE=loomi-hackathon.a1b2c
TEMPORAL_API_KEY=tmprl-your-key-here
TEMPORAL_TASK_QUEUE=chromaflow-task-queue

GEMINI_API_KEY=your-gemini-key
```

Save (`Ctrl+O`, Enter, `Ctrl+X`), then start:

```bash
cd /opt/loomi
docker compose -f docker-compose.ec2.yml --env-file .env up -d --build
docker compose -f docker-compose.ec2.yml logs -f backend temporal-worker
```

You should see backend and worker start without `Transport` / `connection refused` errors.

### 3.1 Test in the browser

- App: `http://YOUR_EC2_PUBLIC_IP:3000`
- MCP login (opens backend): `http://YOUR_EC2_PUBLIC_IP:3001/api/mcp/auth/login`

---

## Part 4 — GitHub deploy secrets (optional)

If you use `.github/workflows/deploy-ec2.yml`:

| GitHub secret | Value |
|---------------|--------|
| `EC2_HOST` | Public IP, e.g. `3.15.42.10` |
| `EC2_SSH_PRIVATE_KEY` | Entire contents of `loomi-ec2-key.pem` |

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

---

## Common issues

| Problem | What to do |
|---------|------------|
| SSH timeout | Security group: port 22 from **My IP**; instance running |
| Temporal `UNAVAILABLE` / TLS errors | Set `TEMPORAL_API_KEY`; check address and namespace match Cloud UI |
| Worker connects, API does not | Same `.env` for both containers; restart compose |
| MCP OAuth redirect mismatch | `MCP_OAUTH_REDIRECT_URL` must exactly match browser URL on port **3001** |
| AWS bill worry | **Stop** EC2 instance when not using it; Temporal Cloud free tier for dev |

---

## What you do **not** need for hackathon judging

- ECS, Kubernetes, or a complex CI/CD pipeline
- Running Postgres/Elasticsearch on EC2 (use Temporal Cloud + `docker-compose.ec2.yml`)

---

## Quick reference

| Service | URL |
|---------|-----|
| AWS Console | https://console.aws.amazon.com |
| EC2 instances | https://console.aws.amazon.com/ec2/home#Instances: |
| Temporal Cloud | https://cloud.temporal.io |
| Full EC2 deploy doc | [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) |
