# NavIndoor — Pluggable Indoor & Venue Navigation Platform

An open, standards-based, self-serve indoor turn-by-turn navigation and map authoring platform designed for small and mid-sized venues, campuses, hospitals, shopping malls, and temporary festivals.

Built on Apple's **Indoor Mapping Data Format (IMDF / GeoJSON)** open standard with **PostgreSQL**, **A* multi-level routing**, **accessible wayfinding constraints**, and **QR-based positioning**.

---

## 🏛️ System Architecture

```
indoor-nav-platform/
├── server/                           # BACKEND (Express + TypeScript + PostgreSQL)
│   ├── src/
│   │   ├── algorithms/
│   │   │   ├── AStarRouter.ts        # Shortest path & accessibility-constrained pathfinder
│   │   │   ├── GraphBuilder.ts       # 3D multi-level graph builder from PostgreSQL
│   │   │   └── DirectionGenerator.ts # Natural language turn-by-turn direction generator
│   │   ├── db/
│   │   │   ├── schema.sql            # PostgreSQL schema definition
│   │   │   ├── database.ts           # PostgreSQL client (PGlite WASM / external pg)
│   │   │   └── seedData.ts           # Pilot venues (Metropolis Medical & NeoFest Expo)
│   │   ├── services/
│   │   │   ├── venueService.ts       # Venue, level, unit, POI management
│   │   │   ├── routingService.ts     # Route execution & caching
│   │   │   └── imdfService.ts        # IMDF validation, import, and export
│   │   ├── routes/
│   │   │   ├── venues.ts             # Venue CRUD & level map routes
│   │   │   ├── route.ts              # Route computation endpoints
│   │   │   ├── pois.ts               # POI search endpoints
│   │   │   ├── checkpoints.ts        # Checkpoint QR resolver
│   │   │   └── imdf.ts               # IMDF import/export endpoints
│   │   └── index.ts                  # Express server entry point (Port 4000)
├── client/                           # FRONTEND (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/client.ts             # Typed REST API client
│   │   ├── components/
│   │   │   ├── visitor/              # Indoor Map Viewer, POI Search, HUD, Floor Selector
│   │   │   └── editor/               # Floor Plan Tracing Studio, IMDF Exporter, QR Generator
│   │   ├── styles/index.css          # Tailwind glassmorphic theme & route stroke animations
│   │   └── App.tsx                   # Master router coordinating modes
```

---

## 🚀 Quick Start (Running Locally)

### 1. Start the Backend API Server
```bash
cd server
npm install
npm run dev
```
- Backend starts at `http://localhost:4000`
- Runs embedded PostgreSQL engine with seed data automatically loaded.

### 2. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
- Frontend starts at `http://localhost:3000`

### 3. Run Automated Tests
```bash
cd server
npm run test
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/venues` | List all venues |
| `GET` | `/api/venues/:id` | Get venue details and levels |
| `GET` | `/api/venues/:id/levels/:levelId/map` | Get GeoJSON layer for a floor |
| `GET` | `/api/venues/:id/pois` | Search & filter POIs by query or category |
| `POST` | `/api/venues/:id/route` | **Core A* Route Computation** with accessibility filter and turn-by-turn guidance |
| `POST` | `/api/venues/:id/import/imdf` | **Import Layout**: Ingest Apple IMDF GeoJSON file into PostgreSQL |
| `PUT` | `/api/venues/:id/levels/:levelId/floorplan` | **Blueprint Overlay**: Upload and save background blueprint image/SVG |
| `GET` | `/api/venues/:id/checkpoints` | List all QR checkpoints |
| `GET` | `/api/venues/:id/checkpoints/:code` | Resolve a scanned QR code to exact coordinates |
| `PUT` | `/api/venues/:id/geometry` | Save traced rooms, nodes, and pathways from Editor |
| `GET` | `/api/venues/:id/export/imdf` | Export Apple IMDF GeoJSON bundle |

---

## ♿ Accessible Wayfinding
NavIndoor supports strict **Wheelchair & Mobility Accessibility Routing**:
- When `accessibleOnly: true` is passed to `/api/venues/:id/route`, the A* pathfinder removes all stairwells, escalator edges, and steep barriers from the searchable graph.
- The pathfinder prioritizes elevator cores and ramps, providing smooth step-free navigation across multiple floors.

---

## 🗺️ Apple IMDF & OGC Community Standard
All map data is serialized into Apple's Indoor Mapping Data Format (IMDF), ensuring complete compatibility with:
- Apple Maps Indoor
- Microsoft Places
- Web GIS & GeoJSON tools
- Custom mobile SDKs
