'use client';

import React, { useState } from 'react';
import { Scale, BookOpen, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Methodology {
  id: string;
  name: string;
  version: string;
  type: string;
  parameters: { name: string; value: string; unit: string }[];
  status: 'Active' | 'Draft' | 'Deprecated';
  lastUpdated: string;
}

const mockMethodologies: Methodology[] = [
  {
    id: '1',
    name: 'Biochar Carbon Removal',
    version: 'v3.1',
    type: 'Biochar',
    parameters: [
      { name: 'Carbon Stability Factor', value: '0.73', unit: 'fraction' },
      { name: 'H/C Ratio Threshold', value: '0.4', unit: 'ratio' },
      { name: 'Min Pyrolysis Temp', value: '350', unit: '°C' },
      { name: 'Max Moisture Content', value: '15', unit: '%' },
    ],
    status: 'Active',
    lastUpdated: '2024-12-01',
  },
  {
    id: '2',
    name: 'AWD Methane Reduction',
    version: 'v2.4',
    type: 'AWD',
    parameters: [
      { name: 'CH4 Reduction Factor', value: '1.38', unit: 'tCO2e/ha/season' },
      { name: 'Water Threshold', value: '-15', unit: 'cm' },
      { name: 'Min AWD Cycles', value: '3', unit: 'cycles/season' },
      { name: 'Baseline Emission', value: '3.42', unit: 'tCO2e/ha/season' },
    ],
    status: 'Active',
    lastUpdated: '2024-11-15',
  },
  {
    id: '3',
    name: 'Biogas Methane Capture',
    version: 'v2.1',
    type: 'Biogas',
    parameters: [
      { name: 'GWP CH4', value: '25', unit: 'tCO2e/t CH4' },
      { name: 'Capture Efficiency', value: '0.95', unit: 'fraction' },
      { name: 'Min Methane Content', value: '50', unit: '%' },
      { name: 'Leakage Rate Max', value: '0.05', unit: 'fraction' },
    ],
    status: 'Active',
    lastUpdated: '2024-10-20',
  },
  {
    id: '4',
    name: 'Solar PV Grid Offset',
    version: 'v1.3',
    type: 'Solar',
    parameters: [
      { name: 'Grid Emission Factor', value: '0.5086', unit: 'tCO2e/MWh' },
      { name: 'Degradation Factor', value: '0.005', unit: '/year' },
      { name: 'Min Capacity Factor', value: '14', unit: '%' },
    ],
    status: 'Active',
    lastUpdated: '2024-09-10',
  },
  {
    id: '5',
    name: 'Blue Carbon Sequestration',
    version: 'v1.0',
    type: 'Blue Carbon',
    parameters: [
      { name: 'Sequestration Rate', value: '9.9', unit: 'tCO2e/ha/yr' },
      { name: 'Min Project Duration', value: '20', unit: 'years' },
      { name: 'Buffer Pool', value: '0.15', unit: 'fraction' },
    ],
    status: 'Draft',
    lastUpdated: '2024-12-10',
  },
];

const rules = [
  { name: 'Uncertainty Threshold', value: '±10%', description: 'Maximum allowable uncertainty in emission calculations', category: 'Quantification' },
  { name: 'Confidence Minimum', value: '90%', description: 'Minimum confidence score for automated approval', category: 'Verification' },
  { name: 'Buffer Pool Rate', value: '15%', description: 'Percentage of credits held in buffer for reversal risk', category: 'Risk Management' },
  { name: 'Monitoring Frequency', value: 'Quarterly', description: 'Minimum frequency for on-site monitoring', category: 'Monitoring' },
  { name: 'Leakage Discount', value: '5-15%', description: 'Discount applied for potential leakage outside project boundary', category: 'Quantification' },
  { name: 'Vintage Validity', value: '2 years', description: 'Maximum age of data for credit generation', category: 'Data Quality' },
  { name: 'PDPA Encryption', value: 'AES-256', description: 'Required encryption standard for confidential data', category: 'Security' },
  { name: 'RBAC Max Roles', value: '5', description: 'Maximum number of defined roles in the system', category: 'Auth' },
];

export default function GovernanceView() {
  const { toast } = useToast();
  const [methodologies, setMethodologies] = useState<Methodology[]>(mockMethodologies);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Biochar');
  const [newVersion, setNewVersion] = useState('');
  const [newParams, setNewParams] = useState('');

  const handleAddMethodology = () => {
    if (!newName.trim() || !newVersion.trim()) {
      toast({ title: 'Validation Error', description: 'Name and version are required', variant: 'destructive' });
      return;
    }
    const params = newParams.trim()
      ? newParams.split('\n').map((line) => {
          const parts = line.split(',');
          return { name: parts[0]?.trim() || '', value: parts[1]?.trim() || '', unit: parts[2]?.trim() || '' };
        })
      : [];
    const newMethod: Methodology = {
      id: String(methodologies.length + 1),
      name: newName.trim(),
      version: newVersion.trim(),
      type: newType,
      parameters: params,
      status: 'Draft',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setMethodologies((prev) => [...prev, newMethod]);
    setNewName('');
    setNewVersion('');
    setNewParams('');
    setShowForm(false);
    toast({ title: 'Methodology Added', description: `${newMethod.name} ${newMethod.version} created as Draft` });
  };

  const statusStyles: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    Draft: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    Deprecated: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Governance</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage methodologies, rules, and system parameters</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Add Methodology
        </Button>
      </div>

      {/* Add Methodology Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Methodology Name</Label>
                <Input placeholder="e.g., Biochar Carbon Removal" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Credit Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Biochar', 'AWD', 'Biogas', 'Solar', 'Blue Carbon'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input placeholder="e.g., v1.0" value={newVersion} onChange={(e) => setNewVersion(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parameters (one per line: name, value, unit)</Label>
              <Textarea
                placeholder={"Carbon Stability Factor, 0.73, fraction\nH/C Ratio Threshold, 0.4, ratio"}
                value={newParams}
                onChange={(e) => setNewParams(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddMethodology} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Methodology List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Methodologies
              </CardTitle>
              <CardDescription>{methodologies.length} registered methodologies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {methodologies.map((method) => (
                <div key={method.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{method.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{method.version}</Badge>
                      <Badge variant="secondary" className="text-[10px] h-5">{method.type}</Badge>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[method.status]}`}>
                      {method.status}
                    </Badge>
                  </div>
                  {method.parameters.length > 0 && (
                    <div className="rounded bg-slate-50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Parameters</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {method.parameters.map((param, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="text-muted-foreground">{param.name}:</span>{' '}
                            <span className="font-mono font-semibold">{param.value}</span>{' '}
                            <span className="text-muted-foreground">{param.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">Last updated: {method.lastUpdated}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Rules Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-600" />
              Rules & Thresholds
            </CardTitle>
            <CardDescription>System governance parameters</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="px-6">
                {rules.map((rule, idx) => (
                  <React.Fragment key={rule.name}>
                    <div className="py-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <span className="font-mono text-sm font-semibold text-emerald-700">{rule.value}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                      <Badge variant="secondary" className="text-[10px] h-5 mt-1">{rule.category}</Badge>
                    </div>
                    {idx < rules.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
