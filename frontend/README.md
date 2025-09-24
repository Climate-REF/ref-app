# REF Frontend

React 19 + TypeScript single-page application for the Climate Rapid Evaluation Framework (REF).
 It consumes the FastAPI backend via an auto-generated OpenAPI client and presents datasets, diagnostics, executions, and explorer views.

Status: Alpha

## Tech stack
- React 19, TypeScript, Vite 6
- TanStack Router (file-based routing with plugin), TanStack Query, TanStack Table
- Tailwind CSS v4 with @tailwindcss/vite
- UI components (shadcn/ui-inspired)
- Recharts and d3 for visualization
- Biome for lint/format

Key configuration files:
- frontend/package.json — scripts and dependencies
- frontend/vite.config.ts — dev server, API proxy, plugins
- frontend/openapi-ts.config.ts — OpenAPI client generation

## Requirements
- Node.js v22 (see .nvmrc)
- Backend running locally and serving /api (default proxy target http://localhost:8000)

## Quick start
1. Generate API client (from repo root):

```bash
make generate-client
```

2. Install dependencies:

```bash
cd frontend
npm install
```

3. Start the dev server:

```bash
npm run dev
```

Vite dev server runs on http://localhost:5173 and proxies /api to http://localhost:8000 by default.

## Scripts
- npm run dev — start Vite
- npm run build — type-check and build
- npm run preview — preview production build locally
- npm run lint — run Biome (check and write)
- npm run openapi-ts — generate TypeScript client from openapi.json into src/client

## OpenAPI client generation
The client is generated with @hey-api/openapi-ts using the config in frontend/openapi-ts.config.ts. It expects openapi.json in the frontend directory and outputs to src/client, including:
- types.gen.ts — TypeScript types
- sdk.gen.ts — API functions
- @tanstack/react-query.gen.ts — React Query hooks

In this repo, make generate-client (at the repository root) prepares openapi.json and runs the generator.

## Routing
Routes are file-based under src/routes using TanStack Router and the Vite plugin with auto code splitting. The route tree is generated into src/routeTree.gen.ts.

Primary paths:
- / — dashboard
- /datasets and /datasets/:slug — dataset browser and details
- /diagnostics and /diagnostics/:providerSlug/:diagnosticSlug — diagnostic list and details (values, figures, groups)
- /executions and /executions/:groupId — execution groups and details
- /explorer — metric and source explorers
- /content/* — static content (about, privacy, terms)

## Styling
Tailwind CSS v4 is integrated via the @tailwindcss/vite plugin. Global styles live in src/styles/global.css. No separate tailwind.config.js is required.

## Environment variables
The app reads Vite variables from import.meta.env. Optional:
- VITE_ENABLE_WHY_DID_YOU_RENDER=true enables why-did-you-render during development for performance debugging.

## Build and preview

```bash
npm run build
npm run preview
```

## Linting/formatting

```bash
npm run lint
```

## Project structure (frontend/src)
- client/ — auto-generated API client and hooks
- components/ — reusable components (app, dashboard, datasets, diagnostics, execution, explorer, ui)
- hooks/ — custom React hooks
- lib/ — utilities
- routes/ — file-based routing
- styles/ — global styles

## API proxy notes
The Vite dev server proxies /api to http://localhost:8000 (see frontend/vite.config.ts). If your backend uses a different port, update the proxy target accordingly.
