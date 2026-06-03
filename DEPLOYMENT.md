# Loomi Deployment Guide

This guide covers deploying the Loomi application using Docker Compose for staging environments.

**Hackathon submission docs:** see [`hackathon/README.md`](./hackathon/README.md) for project summary, architecture, MCP usage, demo script, and checklist.

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- 4GB+ RAM available for Docker
- API keys for AI services (optional)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd loomi
```

### 2. Configure Environment Variables

**Local development:**

```bash
cp frontend/.env.local.example frontend/.env.local   # already created if you pulled latest
cp backend/.env.example backend/.env                 # add TEMPORAL_* and GEMINI_API_KEY
```

| File | Purpose |
|------|---------|
| `frontend/.env.local` | `BACKEND_URL` + `NEXT_PUBLIC_API_BASE_URL` → `http://localhost:3001` |
| `backend/.env` | Temporal, Gemini, MCP OAuth callback on port 3001 |

**EC2:** copy `.env.ec2.example` → `.env` on the server (see [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)).

Legacy staging compose (optional):

```bash
cp .env.staging .env
```

Edit `.env` to configure your API keys and other settings:

```env
# AI API Keys (optional - uses mock if not set)
GEMINI_API_KEY=your-gemini-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
REPLICATE_API_KEY=your-replicate-api-key-here

# Backend Configuration
BACKEND_PORT=8080

# Frontend Configuration
VITE_PORT=5173
```

### 3. Build and Start Services

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d
```

### 4. Verify Services

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check health of Temporal
docker-compose exec temporal tctl health
```

## Services Overview

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 8080 | Express.js API server |
| Frontend | 5173 | Vite development server |
| Temporal | 7233 | Temporal Server (gRPC) |
| Temporal Web UI | 8080 | Temporal Web UI |
| PostgreSQL | 5432 | Database for Temporal |
| Elasticsearch | 9200 | Visibility store for Temporal |

## API Endpoints

### Campaign Generation

```bash
# Create a new campaign
curl -X POST http://localhost:8080/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Nexus Athletics",
    "campaignGoal": "Win back customers who haven't purchased in 6 months",
    "targetAudience": "Lapsed VIPs",
    "vibe": "minimalist",
    "platform": "email"
  }'

# Get campaign status
curl http://localhost:8080/api/campaigns/{id}

# Get campaign progress
curl http://localhost:8080/api/campaigns/{id}/progress
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v
```

## Troubleshooting

### Service Health Check

```bash
# Check Temporal health
docker-compose exec temporal tctl health

# Check PostgreSQL
docker-compose exec postgres pg_isready

# Check Elasticsearch
docker-compose exec elasticsearch curl -X GET "localhost:9200/_cluster/health?pretty"
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f temporal
docker-compose logs -f frontend
```

### Restart Services

```bash
# Restart a specific service
docker-compose restart backend

# Restart all services
docker-compose restart
```

## Environment Variables Reference

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | staging | Node environment |
| `BACKEND_PORT` | 8080 | Backend server port |
| `TEMPORAL_ADDRESS` | temporal:7233 | Temporal server address |

### AI APIs

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (empty) | Google Gemini API key |
| `OPENAI_API_KEY` | (empty) | OpenAI API key |
| `REPLICATE_API_KEY` | (empty) | Replicate API key |
| `GEMINI_MODEL` | gemini-2.5-flash | Gemini model to use |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | temporal | PostgreSQL username |
| `POSTGRES_PASSWORD` | temporal | PostgreSQL password |
| `POSTGRES_DB` | temporal | PostgreSQL database name |
| `POSTGRES_HOST` | postgres | PostgreSQL host |
| `POSTGRES_PORT` | 5432 | PostgreSQL port |

## Production Deployment (AWS)

**Recommended:** one **EC2** instance + `docker-compose.ec2.yml` + optional GitHub SSH deploy. See **[AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)**.

## Production Deployment (general)

For production deployments:

1. Use a managed PostgreSQL service (RDS, Cloud SQL, etc.) — or **Temporal Cloud** instead of self-hosted Temporal
2. Use a managed Elasticsearch service (Elastic Cloud, etc.)
3. Configure proper SSL/TLS certificates
4. Set up monitoring and alerting
5. Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
6. Configure proper backup strategies

## Backup and Recovery

### Backup PostgreSQL Data

```bash
docker-compose exec postgres pg_dump -U temporal temporal > backup.sql
```

### Restore PostgreSQL Data

```bash
docker-compose exec postgres psql -U temporal -d temporal < backup.sql
```

### Backup Elasticsearch Data

```bash
docker-compose exec elasticsearch curl -X GET "localhost:9200/_snapshot/backup?pretty"
```

## Support

For issues or questions, please contact the development team.
