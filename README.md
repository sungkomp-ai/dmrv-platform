# dMRV Platform — Thailand T-VER Carbon Credit Standard

> **Digital Measurement, Reporting & Verification (dMRV) Platform** for Thailand's T-VER carbon credit standard, featuring dual-standard support (TGO/T-VER ↔ International/IPCC), real-time IoT monitoring, AI-powered methodology generation, and cross-registry integration.

---

## 🌍 Overview

The dMRV Platform streamlines the entire carbon credit lifecycle — from project registration and data ingestion, through verification and certification, to trading and retirement — fully aligned with Thailand Greenhouse Gas Management Organization (TGO) T-VER requirements.

### Key Features

- **🇹🇭 Dual Standard System** — Toggle between TGO/T-VER (Thai, rai) and International/IPCC (ha) measurement systems
- **📊 25+ Interactive Views** — Dashboard, maps, simulators, and management modules
- **🔬 3 Scientific Simulators** — Biochar Pyrolysis, LiDAR Forest Biomass, AWD Rice Cultivation
- **🗺️ GIS Integration** — Leaflet-based maps with real project locations in Thailand
- **🤖 AI Methodology Studio** — Generative AI for creating and validating carbon quantification rules
- **🔗 Cross-Registry Bridge** — Connect with VERRA, Gold Standard, I-REC, CDM registries
- **📋 VVB Workspace** — Full validation & verification body review workflow
- **🔐 RBAC** — 5-role access control (Admin, ProjectDev, VVB, Regulator, Buyer)
- **📈 Real-Time Monitoring** — IoT sensor dashboard with alert management
- **💰 Carbon Marketplace** — Forward contracts, buffer pool, and credit trading

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
│                   (Frontend + API Routes)                    │
├─────────────────────────────────────────────────────────────┤
│  React 19 │ Tailwind CSS 4 │ shadcn/ui │ Zustand           │
│  Leaflet  │ Chart.js/Recharts │ Framer Motion               │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (26 routes)                     │
├─────────────────────────────────────────────────────────────┤
│              Prisma ORM → SQLite Database                   │
├─────────────────────────────────────────────────────────────┤
│          Mini-Services (Bun standalone)                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Pyrolysis   │ │    LiDAR     │ │     AWD      │        │
│  │  :3999       │ │    :3998     │ │    :3032     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Database** | Prisma ORM + SQLite |
| **State** | Zustand (client) + TanStack Query (server) |
| **Maps** | React-Leaflet |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Auth** | NextAuth.js v4 |
| **Runtime** | Bun |
| **Animations** | Framer Motion |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 (recommended) or Node.js ≥ 18
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/dmrv-platform.git
cd dmrv-platform

# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Initialize the database
bun run db:push

# Start the development server
bun run dev
```

The app will be available at `http://localhost:3000`.

### Mini-Services (Simulators)

Each simulator runs as an independent Bun service:

```bash
# Pyrolysis Simulator (port 3999)
cd mini-services/pyrolysis-simulator && bun install && bun --hot index.ts

# LiDAR Simulator (port 3998)
cd mini-services/lidar-simulator && bun install && bun --hot index.ts

# AWD Simulator (port 3032)
cd mini-services/awd-simulator && bun install && bun --hot index.ts
```

---

## 📂 Project Structure

```
dmrv-platform/
├── prisma/
│   └── schema.prisma          # Database schema (20+ models)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main entry page
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   └── api/               # 26 API route handlers
│   │       ├── dmrv/          # dMRV-specific APIs
│   │       └── map/           # Map data APIs
│   ├── components/
│   │   ├── dmrv/              # 25+ dMRV view components
│   │   ├── map/               # Map components
│   │   └── ui/                # shadcn/ui primitives
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Utilities & DB client
│       ├── db.ts              # Prisma client
│       ├── utils.ts           # Utility functions
│       └── seed.ts            # Database seeder
├── mini-services/             # Standalone simulation services
│   ├── pyrolysis-simulator/   # Biochar pyrolysis simulation
│   ├── lidar-simulator/       # LiDAR forest biomass simulation
│   └── awd-simulator/         # AWD rice cultivation simulation
├── public/                    # Static assets
├── db/                        # SQLite database files
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example               # Environment template
└── .gitignore
```

---

## 🗂️ Modules

### Core Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | System overview with KPIs, charts, and quick actions |
| **Project Registry** | Carbon project registration & management |
| **Monitoring** | Real-time IoT sensor data & alert management |
| **Verification** | Multi-stage verification workflow |
| **Certification** | T-VER certificate issuance & management |
| **Reporting** | Automated report generation (T-VER & IPCC formats) |

### Enterprise Modules

| Module | Description |
|--------|-------------|
| **VVB Workspace** | Validation & Verification Body review portal |
| **Ingestion** | Multi-source data ingestion (satellite, IoT, drone, LiDAR) |
| **Audit** | GHG audit engine with conflict resolution |
| **Carbon Market** | Credit marketplace with forward contracts |
| **Buffer Pool** | Risk-based credit buffer management |
| **Cross-Chain Bridge** | External registry integration (VERRA, GS, I-REC, CDM) |
| **Device Management** | IoT device registration & cryptographic signing |
| **Methodology Studio** | AI-powered methodology rule generation |
| **Governance** | RBAC, policy management & compliance |
| **Dev API Portal** | API key & webhook management |

### Scientific Simulators

| Simulator | Port | Description |
|-----------|------|-------------|
| **Biochar Pyrolysis** | 3999 | Simulates biochar production, carbon sequestration & T-VER quantification |
| **LiDAR Forest** | 3998 | Forest biomass estimation using simulated LiDAR point clouds |
| **AWD Rice** | 3032 | Alternate Wetting & Drying rice cultivation emission reduction |

---

## 🔬 Dual Standard System

The platform supports seamless switching between:

| Property | 🇹🇭 TGO/T-VER | 🌐 International/IPCC |
|----------|---------------|----------------------|
| **Area Unit** | ไร่ (rai) | Hectare (ha) |
| **Conversion** | 1 ha = 6.25 rai | 1 rai = 0.16 ha |
| **Language** | Thai + English | English |
| **Standards** | T-VER, TGO guidelines | IPCC 2006/2019, VERRA, GS |

---

## 🔧 API Routes

All API routes are under `/api/dmrv/`:

```
/api/dmrv/route          # Main dMRV data
/api/dmrv/vvb            # VVB review management
/api/dmrv/submission     # Project submissions
/api/dmrv/verification   # Verification workflow
/api/dmrv/certification  # Certificate management
/api/dmrv/monitoring     # IoT & monitoring data
/api/dmrv/ingestion      # Data ingestion pipeline
/api/dmrv/audit          # Audit & conflict resolution
/api/dmrv/carbon         # Carbon credit management
/api/dmrv/marketplace    # Credit marketplace
/api/dmrv/buffer         # Buffer pool management
/api/dmrv/forward        # Forward contracts
/api/dmrv/bridge         # Cross-chain bridge
/api/dmrv/devices        # Device management
/api/dmrv/governance     # Governance & RBAC
/api/dmrv/methodology    # Methodology rules
/api/dmrv/ai-methodology # AI generation sessions
/api/dmrv/footprint      # Carbon footprint
/api/dmrv/logistics      # Logistics & tracking
/api/dmrv/reporting      # Report generation
/api/dmrv/devportal      # Dev API portal
/api/dmrv/registry       # Public registry
/api/dmrv/conflict       # Conflict cases
/api/dmrv/auth           # Authentication
/api/dmrv/pyrolysis      # Pyrolysis simulation proxy
/api/dmrv/lidar          # LiDAR simulation proxy
/api/dmrv/awd-sim        # AWD simulation proxy
/api/dmrv/map            # Map data
/api/dmrv/simulation     # Simulation data
/api/dmrv/initialize     # System initialization
```

---

## 🗄️ Database Schema

The Prisma schema includes 20+ models organized into:

- **Core**: Project, Plot, CarbonCredit, Certificate, IngestionLog, Submission, AuditLog, Alert, IoTSensor
- **Verification**: VVBReview, ConflictCase
- **Trust**: AuditTrailEntry, DeviceRegistration
- **Finance**: BufferPoolEntry, ForwardContract, Settlement
- **Integration**: ApiKey, Webhook, CrossChainBridge, BridgeTransaction
- **Methodology**: MethodologyRule, AIGenerationSession

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Build for production (standalone output) |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema changes to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset database |

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **TGO** — Thailand Greenhouse Gas Management Organization
- **T-VER** — Thailand Voluntary Emission Reduction Program
- Built with [Next.js](https://nextjs.org/), [shadcn/ui](https://ui.shadcn.com/), [Prisma](https://www.prisma.io/), and [Bun](https://bun.sh/)
