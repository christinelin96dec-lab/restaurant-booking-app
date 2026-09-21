# Debian-based (not Alpine) specifically because Prisma's engine-detection and
# OpenSSL requirements are unreliable on Alpine's musl libc — this sidesteps a
# whole class of "failed to detect libssl/openssl" / schema-engine-crash issues
# that came up deploying on Alpine (see git history if curious).
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# --- runtime: minimal image, no build tooling
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
# Applies pending migrations, then starts the API — see docs/DEPLOYMENT.md for the
# one-off-job alternative if your platform prefers migrations run as a separate step.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
