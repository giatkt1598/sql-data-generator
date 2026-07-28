FROM node:24-alpine AS builder
WORKDIR /app

ENV VITE_API_BASE_URL=http://localhost:32023/api

COPY package.json package-lock.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci

COPY apps ./apps
COPY packages ./packages

RUN npm run build -w @sql-data-generator/client
RUN npm run build -w @sql-data-generator/server


FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=32023

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev --workspace @sql-data-generator/server --include-workspace-root=false

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/client/dist ./apps/client/dist

WORKDIR /app/apps/server

EXPOSE 32023

CMD ["node", "dist/index.js"]
