# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Dipendenze
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

# Sorgenti
COPY . .

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/index.js"]
