'use client';

import React, { useState } from 'react';
import { Truck, Package, Banknote, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface TrackingRecord {
  id: string;
  assetId: string;
  batchId: string;
  location: string;
  status: 'In Transit' | 'Delivered' | 'At Warehouse' | 'Pending Pickup';
  lastUpdate: string;
}

interface InventoryItem {
  id: string;
  product: string;
  type: string;
  quantity: number;
  unit: string;
  warehouse: string;
  status: 'In Stock' | 'Low Stock' | 'Reserved' | 'Out of Stock';
}

interface SettlementRecord {
  id: string;
  tradeId: string;
  buyer: string;
  seller: string;
  amount: number;
  currency: string;
  status: 'Completed' | 'Processing' | 'Pending' | 'Failed';
  settledAt: string;
}

const trackingRecords: TrackingRecord[] = [
  { id: '1', assetId: 'AST-001', batchId: 'CB-0456', location: 'Bangkok Distribution Center', status: 'Delivered', lastUpdate: '2 hr ago' },
  { id: '2', assetId: 'AST-002', batchId: 'CB-0457', location: 'In transit — Ayutthaya → Bangkok', status: 'In Transit', lastUpdate: '30 min ago' },
  { id: '3', assetId: 'AST-003', batchId: 'CB-0458', location: 'Chiang Mai Warehouse', status: 'At Warehouse', lastUpdate: '1 hr ago' },
  { id: '4', assetId: 'AST-004', batchId: 'CB-0460', location: 'Pending pickup — Surin Province', status: 'Pending Pickup', lastUpdate: '4 hr ago' },
  { id: '5', assetId: 'AST-005', batchId: 'CB-0440', location: 'Bangkok Distribution Center', status: 'Delivered', lastUpdate: '1 day ago' },
];

const inventoryItems: InventoryItem[] = [
  { id: '1', product: 'Biochar Credits (CB-0456)', type: 'Biochar', quantity: 5000, unit: 'tCO2e', warehouse: 'Bangkok', status: 'In Stock' },
  { id: '2', product: 'AWD Credits (CB-0457)', type: 'AWD', quantity: 3320, unit: 'tCO2e', warehouse: 'Bangkok', status: 'In Stock' },
  { id: '3', product: 'Blue Carbon Credits (CB-0458)', type: 'Blue Carbon', quantity: 10000, unit: 'tCO2e', warehouse: 'Chiang Mai', status: 'Reserved' },
  { id: '4', product: 'Solar Credits (CB-0445)', type: 'Solar', quantity: 150, unit: 'tCO2e', warehouse: 'Bangkok', status: 'Low Stock' },
  { id: '5', product: 'Biogas Credits (CB-0435)', type: 'Biogas', quantity: 0, unit: 'tCO2e', warehouse: 'Bangkok', status: 'Out of Stock' },
  { id: '6', product: 'AWD Credits (CB-0420)', type: 'AWD', quantity: 800, unit: 'tCO2e', warehouse: 'Khon Kaen', status: 'In Stock' },
];

const settlementRecords: SettlementRecord[] = [
  { id: '1', tradeId: 'TR-1234', buyer: 'PTT Public Co.', seller: 'RICE-001 Project', amount: 2450000, currency: 'THB', status: 'Completed', settledAt: '2024-12-15 14:00' },
  { id: '2', tradeId: 'TR-1235', buyer: 'CP Group', seller: 'RICE-002 Project', amount: 1826000, currency: 'THB', status: 'Completed', settledAt: '2024-12-15 11:30' },
  { id: '3', tradeId: 'TR-1236', buyer: 'Bangkok Bank', seller: 'BLUE-005 Project', amount: 3750000, currency: 'THB', status: 'Processing', settledAt: '-' },
  { id: '4', tradeId: 'TR-1237', buyer: 'SCG Chemicals', seller: 'BIOG-003 Project', amount: 936000, currency: 'THB', status: 'Pending', settledAt: '-' },
  { id: '5', tradeId: 'TR-1238', buyer: 'Thai Union Group', seller: 'SOL-004 Project', amount: 1536000, currency: 'THB', status: 'Failed', settledAt: '-' },
];

const trackingStatusStyles: Record<string, string> = {
  'In Transit': 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'Delivered': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'At Warehouse': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'Pending Pickup': 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

const inventoryStatusStyles: Record<string, string> = {
  'In Stock': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'Low Stock': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'Reserved': 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'Out of Stock': 'bg-red-100 text-red-700 hover:bg-red-100',
};

const settlementStatusStyles: Record<string, string> = {
  'Completed': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'Processing': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'Pending': 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  'Failed': 'bg-red-100 text-red-700 hover:bg-red-100',
};

export default function LogisticsView() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Logistics</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Track assets, manage inventory, and process settlements
        </p>
      </div>

      <Tabs defaultValue="tracking">
        <TabsList>
          <TabsTrigger value="tracking" className="gap-1.5"><Truck className="h-3.5 w-3.5" /> Tracking</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Inventory</TabsTrigger>
          <TabsTrigger value="settlement" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Settlement</TabsTrigger>
        </TabsList>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-teal-600">{trackingRecords.filter((t) => t.status === 'In Transit').length}</p>
                <p className="text-xs text-muted-foreground">In Transit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{trackingRecords.filter((t) => t.status === 'Delivered').length}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{trackingRecords.filter((t) => t.status === 'At Warehouse').length}</p>
                <p className="text-xs text-muted-foreground">At Warehouse</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{trackingRecords.filter((t) => t.status === 'Pending Pickup').length}</p>
                <p className="text-xs text-muted-foreground">Pending Pickup</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asset Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs font-semibold">{record.assetId}</TableCell>
                        <TableCell className="font-mono text-xs">{record.batchId}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {record.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${trackingStatusStyles[record.status]}`}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{record.lastUpdate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Levels</CardTitle>
              <CardDescription>Current inventory across all warehouses</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs font-medium">{item.product}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] h-5">{item.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{item.quantity.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.warehouse}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${inventoryStatusStyles[item.status]}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlement Tab */}
        <TabsContent value="settlement" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">฿{(settlementRecords.filter((s) => s.status === 'Completed').reduce((sum, s) => sum + s.amount, 0) / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">฿{(settlementRecords.filter((s) => s.status === 'Processing').reduce((sum, s) => sum + s.amount, 0) / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">฿{(settlementRecords.filter((s) => s.status === 'Pending').reduce((sum, s) => sum + s.amount, 0) / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">฿{(settlementRecords.filter((s) => s.status === 'Failed').reduce((sum, s) => sum + s.amount, 0) / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settlement Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trade ID</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Settled At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlementRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs font-semibold">{record.tradeId}</TableCell>
                        <TableCell className="text-xs">{record.buyer}</TableCell>
                        <TableCell className="text-xs">{record.seller}</TableCell>
                        <TableCell className="font-mono text-sm">฿{record.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${settlementStatusStyles[record.status]}`}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{record.settledAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
