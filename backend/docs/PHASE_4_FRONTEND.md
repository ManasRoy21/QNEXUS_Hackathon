# Phase 4 — Unified Frontend Architecture & 6-Step Workflow

## Overview
Phase 4 consolidates fragmented frontend interactions into a single, cohesive research workflow:
`01 PROTOCOL → 02 MATERIAL → 03 SIGNING → 04 ATTACK → 05 SWEEPS → 06 STAT BOUNDS`

## Architecture
- **Canonical Frontend State**: Defined in `frontend/src/types/unifiedSimulation.ts`
- **Centralized API Client**: `frontend/src/services/qdsClient.ts`
- **Workflow Container**: `frontend/src/components/workflow/SimulationWorkflow.tsx`
- **6 Step Modules**:
  1. `Step01Protocol.tsx`
  2. `Step02Material.tsx`
  3. `Step03Signing.tsx`
  4. `Step04Attack.tsx`
  5. `Step05Sweeps.tsx`
  6. `Step06StatBounds.tsx`
- **Dedicated Route**: `/workflow` linked prominently in top navigation and hero callouts.
