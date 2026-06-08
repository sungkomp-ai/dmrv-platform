---
Task ID: 1
Agent: main
Task: จำลองการทำงาน - BioCarbon Simulation Lab

Work Log:
- Analyzed existing dMRV platform codebase (30+ view components, DmrvApp shell)
- Created BioCarbonView.tsx component with 8 tabs of bio/microorganism simulation data
- Fixed import error: `Bacteria` doesn't exist in lucide-react, replaced with `Bug`
- Removed unused imports (Thermometer, TrendingDown, Clock, Target, PieChartIcon)
- Added BioCarbonView to DmrvApp navigation (new menu item + lazy load)
- Changed React.lazy to next/dynamic with ssr:false for all 30 components
- Due to sandbox memory constraints, created standalone BioCarbon page (page.tsx)
- Built production build successfully with `next build`
- Verified all 8 tabs work via Agent Browser:
  - Overview: KPI cards, pathway map, TRL chart, microorganism summary
  - Methanotrophs: 6 strains table, CH₄ oxidation chart, radar comparison
  - SynMEC: 5 syntrophic processes, CH₄/H₂ pressure charts, pH/VS removal
  - CO₂ Capture: 5 CCU systems, capture over time, efficiency pie chart
  - Waste→Value: 5 processes, CO₂e savings chart, distribution
  - Bioremediation: 6 processes, performance simulation chart
  - Calculator: T-VER credit calculator with GWP factors
  - AI Lab: Analysis tools + AI insights
- Simulation control (Play/Pause/Reset) works across all chart tabs
- Dual standard mode (🇹🇭 TGO / 🌐 Int'l) implemented
- Server stability issue: dev server OOM during compilation, production server dies periodically
- Production server verified working (HTTP 200, 39KB page content)

Stage Summary:
- BioCarbon Simulation Lab fully implemented with 8 interactive tabs
- All simulation data based on BIOTEC-NSTDA research (methanotrophs, SynMEC, CCU, etc.)
- Charts: AreaChart, LineChart, BarChart, PieChart, RadarChart, ComposedChart (Recharts)
- Calculator: T-VER carbon credit calculation with GWP factors
- Production build succeeds, server serves pages correctly
- Known issue: sandbox environment causes server instability (OOM/resource limits)
