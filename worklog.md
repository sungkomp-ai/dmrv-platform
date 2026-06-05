# Worklog — Task 3: Embed Pyrolysis Simulation Engine into Next.js API Routes

## Summary

Replaced the external Pyrolysis Simulator mini-service (port 3031, Socket.IO) with an embedded simulation engine running directly in the Next.js process. The Caddy gateway's XTransformPort pattern doesn't reliably support WebSocket/Socket.IO connections, so the simulation was embedded into the Next.js API routes — following the same pattern used for the AWD simulator (Task 1).

## What Was Done

### 1. Read Existing Code
- Read `mini-services/pyrolysis-simulator/index.ts` — the full Pyrolysis simulation logic with 3 rounds (Eucalyptus Hardwood, Rice Husk, Coconut Shell), Socket.IO-based communication, REST API endpoints.
- Read `PyrolysisSimulatorView.tsx` — confirmed the expected data structures (`SimulationStatus`, `IoTSensorReading`, `RoundCompleteEvent`, `PyrolysisRound`) and the local simulation fallback already built into the component.
- Read `awd-simulation.ts` — reference implementation for the embedded singleton pattern using `globalThis`.
- Read all AWD API routes — reference for route structure.

### 2. Created Simulation Engine Singleton
**File**: `src/lib/pyrolysis-simulation.ts`

- Created `PyrolysisSimulationEngine` class containing all simulation logic:
  - 3 pyrolysis rounds: Eucalyptus Hardwood (400°C), Rice Husk (550°C), Coconut Shell (700°C)
  - T-VER-P-AG-003 methodology reference for biochar carbon sequestration
  - Carbon credit formula: ER = M_biochar(t) × f_C × f_perm × (44/12)
  - Stoichiometric ratio: 44/12 = 3.667
  - Carbon fraction: 0.70 (400°C) to 0.85 (700°C)
  - Stability/permanence factor: 0.85 (400°C) to 0.94 (700°C)
  - 60x speed factor, 5-second interval = 5 simulated minutes per tick
  - Phases: PREHEAT → DRYING → PYROLYSIS → COOLING → COMPLETE
  - IoT sensor readings with temperature profile, gas emissions, biochar yield, carbon sequestration
  - Max 2000 readings stored in memory (auto-capped)
- Exported types: `PyrolysisRound`, `IoTSensorReading`, `RoundCompleteEvent`, `SimulationStatus`, `PyrolysisSummary`, `PyrolysisFullStatus`
- Used `globalThis` singleton pattern with `ENGINE_VERSION` checking to persist state across Next.js hot reloads

### 3. Created API Routes
All 6 routes call the embedded simulation engine singleton directly:

| Route | Method | Engine Call |
|-------|--------|-------------|
| `/api/pyrolysis/status` | GET | `sim.getStatus()` |
| `/api/pyrolysis/start` | POST | `sim.startSim()` |
| `/api/pyrolysis/stop` | POST | `sim.stopSim()` |
| `/api/pyrolysis/reset` | POST | `sim.resetSim()` |
| `/api/pyrolysis/readings?roundId=N` | GET | `sim.getReadings(roundId)` |
| `/api/pyrolysis/rounds` | GET | `sim.getRounds()` |

### 4. Updated PyrolysisSimulatorView.tsx
- **Removed** Socket.IO import (`socket.io-client`) and all Socket.IO connection code
- **Added** HTTP polling via `/api/pyrolysis/status` and `/api/pyrolysis/readings` every 5 seconds
- **Updated** simulation controls (start/stop/reset) to use POST requests to `/api/pyrolysis/start|stop|reset` when API is available
- **Kept** the existing local simulation fallback — if API routes are unavailable, the component falls back to client-side simulation
- **Updated** connection status badge to show "API Connected" vs "Local Simulation"
- **Added** `useApi` state flag to distinguish API mode from local mode
- **Added** `lastReadingCountRef` to efficiently track new readings from API polling (avoids re-fetching all data each poll)

### 5. Connection Flow
1. On mount, immediately try `GET /api/pyrolysis/status`
2. If successful → set `useApi=true`, `connected=true`, start HTTP polling every 5s
3. If no API response within 3 seconds → fall back to local simulation (`useLocal=true`)
4. When API is available, start/stop/reset use POST to API routes
5. When API is unavailable, start/stop/reset use local simulation functions
6. Polling updates status, completed rounds, and readings incrementally

## Verification
- `bun run lint` — passes with no errors
- All API endpoints returning 200 with correct data
- `/api/pyrolysis/status` returns full status with rounds, readings count, current round config
- `/api/pyrolysis/start` starts the simulation, readings begin generating
- `/api/pyrolysis/stop` stops the simulation cleanly
- `/api/pyrolysis/reset` resets all state
- `/api/pyrolysis/readings` returns all readings with count
- `/api/pyrolysis/rounds` returns the 3 round configurations
- Dev server logs show simulation ticks and clean shutdown

## Files Changed
- **NEW**: `src/lib/pyrolysis-simulation.ts` — simulation engine singleton
- **NEW**: `src/app/api/pyrolysis/status/route.ts` — GET status
- **NEW**: `src/app/api/pyrolysis/start/route.ts` — POST start
- **NEW**: `src/app/api/pyrolysis/stop/route.ts` — POST stop
- **NEW**: `src/app/api/pyrolysis/reset/route.ts` — POST reset
- **NEW**: `src/app/api/pyrolysis/readings/route.ts` — GET readings
- **NEW**: `src/app/api/pyrolysis/rounds/route.ts` — GET rounds config
- **MODIFIED**: `src/components/dmrv/PyrolysisSimulatorView.tsx` — replaced Socket.IO with HTTP polling, kept local fallback
