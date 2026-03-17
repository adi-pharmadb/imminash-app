# Port Registry

Central port allocation for all projects to avoid conflicts during local development.

## Frontend Apps (3000 range)

| Port | Project | Path |
|------|---------|------|
| 3001 | PharmaDB Beta | `PharmaDB/Product/Code/pharmadb-beta` |
| 3002 | Emma 3.0 | `ScreenApp/Emma-3-0` |
| 3003 | Nuanced Beta | `Nuanced/Product/Code/Nuanced-Beta` |
| 3004 | Locad AI BDR Web | `Locad/Locad-GTM-HQ/AI BDR/apps/web` |
| 3005 | OpsBound Website | `OpsBound/Website/OpsBound-website` |
| 3006 | Human in the Loop | `Agents/Human in the loop` (client) |

## Marketing/Static Sites (4000 range)

| Port | Project | Path |
|------|---------|------|
| 4001 | PharmaDB Website | `PharmaDB/GTM/pharmadb-website` |
| 4002 | ScreenApp Pages | `ScreenApp/pages` |
| 4003 | Locad Website | `Locad/Locad-GTM-HQ/Website` |

## Backend/API Services (8000 range)

| Port | Project | Path |
|------|---------|------|
| 8001 | PharmaDB Python Service | `PharmaDB/Product/Code/pharmadb-beta/python_service` |
| 8002 | Locad AI BDR API | `Locad/Locad-GTM-HQ/AI BDR/apps/api` |
| 8003 | Human in the Loop Server | `Agents/Human in the loop` (server) |
| 8004 | Locad AI BDR Workers | `Locad/Locad-GTM-HQ/AI BDR/apps/workers` |

## Reserved Ranges

| Range | Purpose |
|-------|---------|
| 3000-3099 | Frontend applications |
| 4000-4099 | Marketing/static sites |
| 5000-5099 | Experimental/temp projects |
| 8000-8099 | Backend APIs |
| 9000-9099 | Database/infrastructure |

## Configuration Examples

Each project should configure its dev script to use the assigned port:

**Next.js** (`package.json`):
```json
"dev": "next dev -p 3001"
```

**Astro** (`package.json`):
```json
"dev": "astro dev --port 4001"
```

**Vite** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 3006,
  },
})
```

**Express** (`index.ts`):
```typescript
const PORT = process.env.PORT || 8002;
```

**FastAPI/Uvicorn**:
```bash
uvicorn app.main:app --port 8001
```

## Adding New Projects

1. Pick an available port from the appropriate range
2. Update this registry
3. Configure the project's dev script
4. If the project has both frontend and backend, use ports from both ranges
