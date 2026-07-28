FROM node:24-alpine AS client-builder
WORKDIR /app/client

ENV VITE_API_BASE_URL=http://localhost:32023/api

COPY client/package*.json ./
RUN npm ci

COPY client ./
COPY shared /app/shared

RUN npm run build


FROM node:24-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server ./
COPY shared /app/shared

RUN npm run build


FROM node:24-alpine AS runner
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=32023

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist /app/client/dist

EXPOSE 32023

CMD ["npm", "start"]
