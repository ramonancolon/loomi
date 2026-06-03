# Backend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Expose the server port (PORT env is read at runtime in src/config/env.ts)
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Run the application
CMD ["node", "dist/index.js"]
