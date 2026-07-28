# SQL Data Generator

Monorepo managed with npm workspaces.

## Structure

- `apps/client`: React and Vite web application.
- `apps/server`: Express API and mock-data generator.
- `packages/shared`: Types and constants shared by client and server.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Run one application only:

```bash
npm run dev:client
npm run dev:server
```

## Validation

```bash
npm run build
npm test
```

## Docker

```bash
docker compose up --build
```
