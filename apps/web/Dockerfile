# Build context: repo root  ->  docker build -f apps/web/Dockerfile .

FROM node:22-slim AS builder
WORKDIR /app

# Install deps via the root npm workspace lockfile
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace=apps/web

COPY apps/web apps/web

# Browser calls the Express API directly, so this URL is baked into the bundle at build time
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web


FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app ./

USER node
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
