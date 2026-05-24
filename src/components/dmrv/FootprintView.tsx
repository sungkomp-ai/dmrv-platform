'use client';

import React, { useState } from 'react';
import { Footprints, Calculator, Leaf } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface EmissionFactor {
  source: string;
  factor: number;
  unit: string;
  scope: 'Scope 1' | 'Scope 2' | 'Scope 3';
  reference: string;
}

const emissionFactors: EmissionFactor[] = [
  { source: 'Grid Electricity', factor: 0.5086, unit: 'tCO2e/MWh', scope: 'Scope 2', reference: 'TGO-EF 2024' },
  { source: 'Diesel', factor: 2.68, unit: 'tCO2e/kL', scope: 'Scope 1', reference: 'IPCC 2006' },
  { source: 'LPG', factor: 1.69, unit: 'tCO2e/tonne', scope: 'Scope 1', reference: 'IPCC 2006' },
  { source: 'Urea', factor: 0.0117, unit: 'tCO2e/kg N', scope: 'Scope 1', reference: 'IPCC 2019' },
  { source: 'Organic Fertilizer', factor: 0.0042, unit: 'tCO2e/kg N', scope: 'Scope 1', reference: 'IPCC 2019' },
  { source: 'Gasoline', factor: 2.30, unit: 'tCO2e/kL', scope: 'Scope 1', reference: 'IPCC 2006' },
  { source: 'Natural Gas', factor: 2.02, unit: 'tCO2e/1000m³', scope: 'Scope 1', reference: 'IPCC 2006' },
  { source: 'Water Supply', factor: 0.00034, unit: 'tCO2e/m³', scope: 'Scope 3', reference: 'TGO-EF 2024' },
];

interface FootprintEntry {
  id: string;
  scope: string;
  activity: string;
  quantity: number;
  unit: string;
  factor: number;
  emissions: number;
}

export default function FootprintView() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FootprintEntry[]>([
    { id: '1', scope: 'Scope 2', activity: 'Grid Electricity', quantity: 10000, unit: 'MWh', factor: 0.5086, emissions: 5086 },
    { id: '2', scope: 'Scope 1', activity: 'Diesel', quantity: 500, unit: 'kL', factor: 2.68, emissions: 1340 },
    { id: '3', scope: 'Scope 1', activity: 'LPG', quantity: 100, unit: 'tonnes', factor: 1.69, emissions: 169 },
    { id: '4', scope: 'Scope 1', activity: 'Urea', quantity: 50000, unit: 'kg N', factor: 0.0117, emissions: 585 },
  ]);

  const [selectedSource, setSelectedSource] = useState(emissionFactors[0].source);
  const [quantity, setQuantity] = useState('');

  const selectedFactor = emissionFactors.find((ef) => ef.source === selectedSource);

  const handleAdd = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Invalid Quantity', description: 'Please enter a positive number', variant: 'destructive' });
      return;
    }
    if (!selectedFactor) return;

    const entry: FootprintEntry = {
      id: String(entries.length + 1),
      scope: selectedFactor.scope,
      activity: selectedFactor.source,
      quantity: qty,
      unit: selectedFactor.unit.replace('tCO2e/', ''),
      factor: selectedFactor.factor,
      emissions: parseFloat((qty * selectedFactor.factor).toFixed(2)),
    };
    setEntries((prev) => [...prev, entry]);
    setQuantity('');
    toast({ title: 'Footprint Entry Added', description: `${entry.activity}: ${entry.emissions.toLocaleString()} tCO2e` });
  };

  const scope1 = entries.filter((e) => e.scope === 'Scope 1').reduce((s, e) => s + e.emissions, 0);
  const scope2 = entries.filter((e) => e.scope === 'Scope 2').reduce((s, e) => s + e.emissions, 0);
  const scope3 = entries.filter((e) => e.scope === 'Scope 3').reduce((s, e) => s + e.emissions, 0);
  const total = scope1 + scope2 + scope3;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Carbon Footprint</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Calculate and track organizational carbon footprint by scope
        </p>
      </div>

      {/* Aggregate Footprint */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{total.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-emerald-600 font-medium">Total (tCO2e)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{scope1.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground">Scope 1 (Direct)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{scope2.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground">Scope 2 (Electricity)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{scope3.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground">Scope 3 (Other)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              Add Footprint Entry
            </CardTitle>
            <CardDescription>Calculate emissions for an activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Activity / Source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {emissionFactors.map((ef) => (
                    <SelectItem key={ef.source} value={ef.source}>
                      {ef.source} ({ef.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity ({selectedFactor?.unit.replace('tCO2e/', '') || ''})</Label>
              <Input
                type="number"
                placeholder="e.g., 1000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            {selectedFactor && quantity && !isNaN(parseFloat(quantity)) && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Leaf className="h-4 w-4" />
                  <span className="font-semibold">
                    {(parseFloat(quantity) * selectedFactor.factor).toLocaleString('en-US', { maximumFractionDigits: 2 })} tCO2e
                  </span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Factor: {selectedFactor.factor} {selectedFactor.unit} | Ref: {selectedFactor.reference}
                </p>
              </div>
            )}
            <Button onClick={handleAdd} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Footprints className="h-4 w-4" />
              Add Entry
            </Button>
          </CardContent>
        </Card>

        {/* Emission Factor Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emission Factors</CardTitle>
            <CardDescription>Reference factors for calculation</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Factor</TableHead>
                    <TableHead className="text-xs">Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emissionFactors.map((ef) => (
                    <TableRow key={ef.source}>
                      <TableCell className="text-xs font-medium">{ef.source}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {ef.factor} <span className="text-muted-foreground">{ef.unit}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 ${
                            ef.scope === 'Scope 1'
                              ? 'bg-red-50 text-red-700 hover:bg-red-50'
                              : ef.scope === 'Scope 2'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                              : 'bg-teal-50 text-teal-700 hover:bg-teal-50'
                          }`}
                        >
                          {ef.scope}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Footprint Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Footprint Entries</CardTitle>
            <CardDescription>Calculated emission entries</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Activity</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Emissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div>
                          <span className="text-xs font-medium">{entry.activity}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] h-4 ml-1 ${
                              entry.scope === 'Scope 1'
                                ? 'bg-red-50 text-red-600 hover:bg-red-50'
                                : entry.scope === 'Scope 2'
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-50'
                                : 'bg-teal-50 text-teal-600 hover:bg-teal-50'
                            }`}
                          >
                            {entry.scope}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {entry.quantity.toLocaleString()} {entry.unit}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-emerald-700">
                        {entry.emissions.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
