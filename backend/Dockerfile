# --- deps: install once, reused by both the build and (via prune) runtime stages
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript and generate the Prisma client
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# --- runtime: minimal image, no build tooling
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
# Applies pending migrations, then starts the API — see docs/DEPLOYMENT.md for the
# one-off-job alternative if your platform prefers migrations run as a separate step.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
