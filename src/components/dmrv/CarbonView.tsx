'use client';

import React, { useState } from 'react';
import { Leaf, Calculator, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

type CarbonType = 'biochar' | 'awd' | 'biogas' | 'solar' | 'bluecarbon';

interface CalcResult {
  type: CarbonType;
  tco2e: number;
  methodology: string;
}

const emissionFactors = [
  { source: 'Grid Electricity (Thailand)', factor: 0.5086, unit: 'tCO2e/MWh', reference: 'TGO-EF 2024' },
  { source: 'Diesel Combustion', factor: 2.68, unit: 'tCO2e/kL', reference: 'IPCC 2006' },
  { source: 'N2O from Soil (Urea)', factor: 0.0117, unit: 'tCO2e/kg N', reference: 'IPCC 2019' },
  { source: 'Methane from Rice (AWD)', factor: 1.38, unit: 'tCO2e/ha/season', reference: 'IRRI 2023' },
  { source: 'Biochar Carbon Stability', factor: 0.73, unit: 'tCO2e/t biochar', reference: 'IPCC 2019' },
  { source: 'Biogas Methane Capture', factor: 25.0, unit: 'tCO2e/t CH4', reference: 'IPCC AR5' },
  { source: 'Solar PV Offset', factor: 0.5086, unit: 'tCO2e/MWh', reference: 'TGO-EF 2024' },
  { source: 'Blue Carbon Sequestration', factor: 9.9, unit: 'tCO2e/ha/yr', reference: 'Murray et al. 2011' },
];

export default function CarbonView() {
  const { toast } = useToast();
  const [results, setResults] = useState<CalcResult[]>([]);

  // Biochar state
  const [biocharInput, setBiocharInput] = useState({ biocharProduced: '', stabilityFactor: '0.73' });
  // AWD state
  const [awdInput, setAwdInput] = useState({ area: '', seasons: '' });
  // Biogas state
  const [biogasInput, setBiogasInput] = useState({ ch4Captured: '', efficiency: '0.95' });
  // Solar state
  const [solarInput, setSolarInput] = useState({ generation: '', gridFactor: '0.5086' });
  // Blue Carbon state
  const [blueInput, setBlueInput] = useState({ area: '', years: '' });

  const calculateBiochar = () => {
    const produced = parseFloat(biocharInput.biocharProduced);
    if (isNaN(produced) || produced <= 0) {
      toast({ title: 'Invalid Input', description: 'Biochar produced must be a positive number', variant: 'destructive' });
      return;
    }
    const factor = parseFloat(biocharInput.stabilityFactor);
    const tco2e = produced * factor;
    setResults((prev) => [...prev, { type: 'biochar', tco2e, methodology: 'IPCC 2019 — Biochar Carbon Stability' }]);
    toast({ title: 'Calculation Complete', description: `Biochar: ${tco2e.toFixed(2)} tCO2e` });
  };

  const calculateAWD = () => {
    const area = parseFloat(awdInput.area);
    const seasons = parseInt(awdInput.seasons);
    if (isNaN(area) || isNaN(seasons) || area <= 0 || seasons <= 0) {
      toast({ title: 'Invalid Input', description: 'Area and seasons must be positive numbers', variant: 'destructive' });
      return;
    }
    const factor = 1.38;
    const tco2e = area * seasons * factor;
    setResults((prev) => [...prev, { type: 'awd', tco2e, methodology: 'IRRI 2023 — AWD Methane Reduction' }]);
    toast({ title: 'Calculation Complete', description: `AWD: ${tco2e.toFixed(2)} tCO2e` });
  };

  const calculateBiogas = () => {
    const ch4 = parseFloat(biogasInput.ch4Captured);
    if (isNaN(ch4) || ch4 <= 0) {
      toast({ title: 'Invalid Input', description: 'CH4 captured must be a positive number', variant: 'destructive' });
      return;
    }
    const eff = parseFloat(biogasInput.efficiency);
    const tco2e = ch4 * 25 * eff;
    setResults((prev) => [...prev, { type: 'biogas', tco2e, methodology: 'IPCC AR5 — Biogas Methane Capture' }]);
    toast({ title: 'Calculation Complete', description: `Biogas: ${tco2e.toFixed(2)} tCO2e` });
  };

  const calculateSolar = () => {
    const gen = parseFloat(solarInput.generation);
    if (isNaN(gen) || gen <= 0) {
      toast({ title: 'Invalid Input', description: 'Generation must be a positive number', variant: 'destructive' });
      return;
    }
    const factor = parseFloat(solarInput.gridFactor);
    const tco2e = gen * factor;
    setResults((prev) => [...prev, { type: 'solar', tco2e, methodology: 'TGO-EF 2024 — Solar Grid Offset' }]);
    toast({ title: 'Calculation Complete', description: `Solar: ${tco2e.toFixed(2)} tCO2e` });
  };

  const calculateBlue = () => {
    const area = parseFloat(blueInput.area);
    const years = parseFloat(blueInput.years);
    if (isNaN(area) || isNaN(years) || area <= 0 || years <= 0) {
      toast({ title: 'Invalid Input', description: 'Area and years must be positive numbers', variant: 'destructive' });
      return;
    }
    const factor = 9.9;
    const tco2e = area * years * factor;
    setResults((prev) => [...prev, { type: 'bluecarbon', tco2e, methodology: 'Murray et al. 2011 — Blue Carbon Sequestration' }]);
    toast({ title: 'Calculation Complete', description: `Blue Carbon: ${tco2e.toFixed(2)} tCO2e` });
  };

  const typeLabels: Record<CarbonType, string> = {
    biochar: 'Biochar',
    awd: 'AWD',
    biogas: 'Biogas',
    solar: 'Solar',
    bluecarbon: 'Blue Carbon',
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Carbon Quantification</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Calculate emission reductions (tCO2e) using approved methodologies
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calculator Tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-600" />
                Carbon Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="biochar">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="biochar">Biochar</TabsTrigger>
                  <TabsTrigger value="awd">AWD</TabsTrigger>
                  <TabsTrigger value="biogas">Biogas</TabsTrigger>
                  <TabsTrigger value="solar">Solar</TabsTrigger>
                  <TabsTrigger value="bluecarbon">Blue Carbon</TabsTrigger>
                </TabsList>

                <TabsContent value="biochar" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate carbon removal via biochar production and soil application.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Biochar Produced (tonnes)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={biocharInput.biocharProduced}
                        onChange={(e) => setBiocharInput({ ...biocharInput, biocharProduced: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carbon Stability Factor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={biocharInput.stabilityFactor}
                        onChange={(e) => setBiocharInput({ ...biocharInput, stabilityFactor: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateBiochar} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    Calculate
                  </Button>
                </TabsContent>

                <TabsContent value="awd" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate methane reduction from Alternate Wetting and Drying (AWD) in rice cultivation.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Area (hectares)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 1000"
                        value={awdInput.area}
                        onChange={(e) => setAwdInput({ ...awdInput, area: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Seasons</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 2"
                        value={awdInput.seasons}
                        onChange={(e) => setAwdInput({ ...awdInput, seasons: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateAWD} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    Calculate
                  </Button>
                </TabsContent>

                <TabsContent value="biogas" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate emission reductions from biogas methane capture and utilization.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CH4 Captured (tonnes)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 200"
                        value={biogasInput.ch4Captured}
                        onChange={(e) => setBiogasInput({ ...biogasInput, ch4Captured: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Capture Efficiency</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={biogasInput.efficiency}
                        onChange={(e) => setBiogasInput({ ...biogasInput, efficiency: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateBiogas} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    Calculate
                  </Button>
                </TabsContent>

                <TabsContent value="solar" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate grid emission offset from solar PV electricity generation.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Electricity Generated (MWh)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 5000"
                        value={solarInput.generation}
                        onChange={(e) => setSolarInput({ ...solarInput, generation: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grid Emission Factor (tCO2e/MWh)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={solarInput.gridFactor}
                        onChange={(e) => setSolarInput({ ...solarInput, gridFactor: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateSolar} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    Calculate
                  </Button>
                </TabsContent>

                <TabsContent value="bluecarbon" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Calculate carbon sequestration from blue carbon ecosystems (mangroves, seagrass).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Area (hectares)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={blueInput.area}
                        onChange={(e) => setBlueInput({ ...blueInput, area: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Duration (years)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={blueInput.years}
                        onChange={(e) => setBlueInput({ ...blueInput, years: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={calculateBlue} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Leaf className="h-4 w-4" />
                    Calculate
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Emission Factor Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Emission Factor Reference
            </CardTitle>
            <CardDescription>Approved emission factors for calculations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Factor</TableHead>
                    <TableHead className="text-xs">Ref</TableHead>
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
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {ef.reference}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Calculation Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Calculation Results</CardTitle>
                <CardDescription>All calculated emission reductions</CardDescription>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Total: {results.reduce((sum, r) => sum + r.tco2e, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} tCO2e
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>tCO2e</TableHead>
                    <TableHead>Methodology</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...results].reverse().map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          {typeLabels[r.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-emerald-700">
                        {r.tco2e.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.methodology}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
