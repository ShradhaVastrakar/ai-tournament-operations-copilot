# Build context: repo root  ->  docker build -f apps/api/Dockerfile .

FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/api

COPY apps/api apps/api
RUN npm run build --workspace=apps/api


FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=apps/api --omit=dev && npm cache clean --force

COPY --from=builder /app/apps/api/dist apps/api/dist
# matchesService/venuesService read <repo-root>/data/*.json
COPY data ./data

USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/app.js"]
