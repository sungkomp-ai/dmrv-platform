import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// In-memory tracking and inventory state (would be a proper DB table in production)
interface TrackingPosition {
  assetId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
}

interface InventoryItem {
  assetId: string;
  stock: number;
  unit: string;
  lastUpdated: string;
}

const trackingPositions: TrackingPosition[] = [];
const inventoryItems: InventoryItem[] = [];

// GET /api/dmrv/logistics — Get tracking/inventory/settlement data
//
// Data is DERIVED from the live CarbonCredit lifecycle so that every page in the
// platform shows consistent, related numbers:
//   • tracking   = Traded credits  → shipments on their way to buyers
//   • inventory  = Available credits → stock held at the registry warehouse
//   • settlements = Settlement table (auto-backfilled for Traded credits)
// Manual updates via POST still work and are overlaid on top of the derived data.
export async function GET() {
  try {
    const credits = await db.carbonCredit.findMany({ include: { project: true } });

    // ── Derive tracking positions from TRADED credits ───────────────────────
    // Stage is derived from a deterministic hash of the tokenId (stable across
    // reloads) so the demo dataset exercises the full shipment lifecycle:
    //   pending_pickup → in_transit → at_warehouse → delivered
    const STAGE_AGES_DAYS = [0.5, 3, 10, 20]; // representative age per stage
    const traded = credits.filter((c) => c.status === 'Traded');

    const hashToken = (tokenId: string): number => {
      let h = 0;
      for (let i = 0; i < tokenId.length; i++) h = (h * 31 + tokenId.charCodeAt(i)) % 997;
      return h;
    };

    const derivedTracking: TrackingPosition[] = traded.map((credit, idx) => {
      const ageDays = STAGE_AGES_DAYS[hashToken(credit.tokenId) % STAGE_AGES_DAYS.length];
      const status =
        ageDays < 1 ? 'pending_pickup' : ageDays < 7 ? 'in_transit' : ageDays < 14 ? 'at_warehouse' : 'delivered';
      // Deterministic small offset so multiple assets from the same project
      // do not overlap exactly on a map.
      const jitterLat = ((idx % 5) - 2) * 0.015;
      const jitterLng = ((idx % 3) - 1) * 0.015;
      return {
        assetId: credit.tokenId,
        latitude: (credit.project?.centerLat ?? 13.75) + jitterLat,
        longitude: (credit.project?.centerLng ?? 100.5) + jitterLng,
        timestamp: new Date(credit.updatedAt).toISOString(),
        status,
      };
    });

    // Manual POST updates take precedence over derived positions
    const mergedTracking = [...derivedTracking];
    for (const manual of trackingPositions) {
      const i = mergedTracking.findIndex((t) => t.assetId === manual.assetId);
      if (i >= 0) mergedTracking[i] = manual;
      else mergedTracking.push(manual);
    }

    // ── Derive inventory from AVAILABLE credits ────────────────────────────
    const available = credits.filter((c) => c.status === 'Available');
    const derivedInventory: InventoryItem[] = available.map((credit) => ({
      assetId: credit.tokenId,
      stock: credit.amount,
      unit: 'tCO2e',
      lastUpdated: new Date(credit.updatedAt).toISOString(),
    }));
    const mergedInventory = [...derivedInventory];
    for (const manual of inventoryItems) {
      const i = mergedInventory.findIndex((it) => it.assetId === manual.assetId);
      if (i >= 0) mergedInventory[i] = manual;
      else mergedInventory.push(manual);
    }

    // ── Settlements: idempotent backfill for Traded credits ───────────────
    const existing = await db.settlement.findMany();
    const settledCreditIds = new Set(existing.map((s) => s.creditId));
    const missing = traded.filter((c) => !settledCreditIds.has(c.id));
    if (missing.length > 0) {
      await db.settlement.createMany({
        data: missing.map((credit) => ({
          creditId: credit.id,
          assetId: credit.tokenId,
          amount: credit.amount,
          status: 'processed',
        })),
      });
    }
    const settlements = await db.settlement.findMany({ orderBy: { timestamp: 'desc' } });

    return NextResponse.json({
      tracking: mergedTracking,
      inventory: mergedInventory,
      settlements,
      summary: {
        trackingPoints: mergedTracking.length,
        inventoryItems: mergedInventory.length,
        totalSettlements: settlements.length,
        totalSettlementAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
        processedSettlements: settlements.filter((s) => s.status === 'processed').length,
      },
    });
  } catch (error) {
    console.error('Logistics error:', error);
    return NextResponse.json({ error: 'Failed to fetch logistics data' }, { status: 500 });
  }
}

// POST /api/dmrv/logistics — Update tracking position, inventory stock, or process settlement
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'tracking' | 'inventory' | 'settlement';
      // Tracking
      assetId?: string;
      latitude?: number;
      longitude?: number;
      status?: string;
      // Inventory
      stock?: number;
      unit?: string;
      // Settlement
      amount?: number;
    };

    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required (tracking, inventory, or settlement)' }, { status: 400 });
    }

    switch (action) {
      case 'tracking': {
        if (!body.assetId || body.latitude === undefined || body.longitude === undefined) {
          return NextResponse.json({ error: 'assetId, latitude, and longitude are required' }, { status: 400 });
        }

        const position: TrackingPosition = {
          assetId: body.assetId,
          latitude: body.latitude,
          longitude: body.longitude,
          timestamp: new Date().toISOString(),
          status: body.status ?? 'in_transit',
        };

        // Update existing or add new
        const existingIndex = trackingPositions.findIndex((t) => t.assetId === body.assetId);
        if (existingIndex >= 0) {
          trackingPositions[existingIndex] = position;
        } else {
          trackingPositions.push(position);
        }

        await db.auditLog.create({
          data: {
            agentName: 'LogisticsAgent',
            action: 'update_tracking',
            details: JSON.stringify(position),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'tracking', position });
      }

      case 'inventory': {
        if (!body.assetId || body.stock === undefined) {
          return NextResponse.json({ error: 'assetId and stock are required' }, { status: 400 });
        }

        const item: InventoryItem = {
          assetId: body.assetId!,
          stock: body.stock!,
          unit: body.unit ?? 'kg',
          lastUpdated: new Date().toISOString(),
        };

        const existingIndex = inventoryItems.findIndex((i) => i.assetId === body.assetId);
        if (existingIndex >= 0) {
          inventoryItems[existingIndex] = item;
        } else {
          inventoryItems.push(item);
        }

        await db.auditLog.create({
          data: {
            agentName: 'LogisticsAgent',
            action: 'update_inventory',
            details: JSON.stringify(item),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'inventory', item });
      }

      case 'settlement': {
        if (!body.assetId || !body.amount) {
          return NextResponse.json({ error: 'assetId and amount are required' }, { status: 400 });
        }

        // Find the credit by tokenId (assetId) to link the settlement
        const credit = await db.carbonCredit.findFirst({ where: { tokenId: body.assetId } });
        if (!credit) {
          return NextResponse.json({ error: 'Credit not found for the given assetId' }, { status: 404 });
        }

        const settlement = await db.settlement.create({
          data: {
            creditId: credit.id,
            assetId: body.assetId,
            amount: body.amount,
            status: 'processed',
          },
        });

        await db.auditLog.create({
          data: {
            agentName: 'LogisticsAgent',
            action: 'process_settlement',
            details: JSON.stringify({ settlementId: settlement.id, assetId: body.assetId, amount: body.amount }),
            severity: 'INFO',
          },
        });

        return NextResponse.json({ success: true, action: 'settlement', settlement }, { status: 201 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use tracking, inventory, or settlement' }, { status: 400 });
    }
  } catch (error) {
    console.error('Logistics action error:', error);
    return NextResponse.json({ error: 'Logistics action failed', details: String(error) }, { status: 500 });
  }
}
