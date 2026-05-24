'use client';

import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

type AuditType = 'Biogas' | 'Blue Carbon' | 'Renewable' | 'Soil GHG' | 'Overlap' | 'Footprint';

interface AuditInput {
  [key: string]: string;
}

interface AuditResult {
  type: AuditType;
  projectId: string;
  status: 'PASSED' | 'FAILED';
  score: number;
  details: string[];
  timestamp: string;
}

const auditFields: Record<AuditType, { key: string; label: string; placeholder: string }[]> = {
  Biogas: [
    { key: 'ch4Captured', label: 'CH4 Captured (tonnes)', placeholder: 'e.g., 200' },
    { key: 'captureEfficiency', label: 'Capture Efficiency (%)', placeholder: 'e.g., 95' },
    { key: 'leakageRate', label: 'Leakage Rate (%)', placeholder: 'e.g., 3' },
  ],
  'Blue Carbon': [
    { key: 'area', label: 'Area (hectares)', placeholder: 'e.g., 500' },
    { key: 'sequestrationRate', label: 'Sequestration Rate (tCO2e/ha/yr)', placeholder: 'e.g., 9.9' },
    { key: 'projectDuration', label: 'Project Duration (years)', placeholder: 'e.g., 20' },
  ],
  Renewable: [
    { key: 'generation', label: 'Electricity Generated (MWh)', placeholder: 'e.g., 5000' },
    { key: 'gridFactor', label: 'Grid Emission Factor', placeholder: 'e.g., 0.5086' },
    { key: 'capacityFactor', label: 'Capacity Factor (%)', placeholder: 'e.g., 18' },
  ],
  'Soil GHG': [
    { key: 'area', label: 'Area (hectares)', placeholder: 'e.g., 1000' },
    { key: 'fertilizerType', label: 'Fertilizer Type', placeholder: 'e.g., Urea' },
    { key: 'applicationRate', label: 'Application Rate (kg N/ha)', placeholder: 'e.g., 120' },
  ],
  Overlap: [
    { key: 'projectId1', label: 'Project ID 1', placeholder: 'e.g., RICE-001' },
    { key: 'projectId2', label: 'Project ID 2', placeholder: 'e.g., RICE-002' },
    { key: 'overlapArea', label: 'Overlap Area (hectares)', placeholder: 'e.g., 50' },
  ],
  Footprint: [
    { key: 'electricity', label: 'Electricity Usage (MWh)', placeholder: 'e.g., 10000' },
    { key: 'diesel', label: 'Diesel Usage (kL)', placeholder: 'e.g., 500' },
    { key: 'lpg', label: 'LPG Usage (tonnes)', placeholder: 'e.g., 100' },
  ],
};

export default function AuditView() {
  const { toast } = useToast();
  const [auditType, setAuditType] = useState<AuditType>('Biogas');
  const [projectId, setProjectId] = useState('');
  const [inputs, setInputs] = useState<AuditInput>({});
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([
    {
      type: 'Soil GHG',
      projectId: 'RICE-001',
      status: 'PASSED',
      score: 92,
      details: ['N2O calculation within acceptable range', 'Fertilizer application verified', 'Soil carbon baseline confirmed'],
      timestamp: '2024-12-15 13:00',
    },
    {
      type: 'Biogas',
      projectId: 'BIOG-003',
      status: 'FAILED',
      score: 68,
      details: ['CH4 leakage exceeds threshold (8% > 5%)', 'Capture efficiency below minimum', 'Missing monitoring data for Q3'],
      timestamp: '2024-12-15 10:30',
    },
    {
      type: 'Overlap',
      projectId: 'RICE-001 / RICE-002',
      status: 'PASSED',
      score: 95,
      details: ['No geographic overlap detected', 'No double-counting of emission reductions', 'Boundary verification complete'],
      timestamp: '2024-12-14 16:00',
    },
  ]);

  const fields = auditFields[auditType];

  const handleRunAudit = async () => {
    if (!projectId.trim()) {
      toast({ title: 'Validation Error', description: 'Project ID is required', variant: 'destructive' });
      return;
    }

    const hasEmpty = fields.some((f) => !inputs[f.key]?.trim());
    if (hasEmpty) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const score = 55 + Math.floor(Math.random() * 45);
    const passed = score >= 80;
    const detailOptions = {
      passed: [
        'All input parameters within acceptable range',
        'Emission calculations verified against methodology',
        'Data source integrity confirmed',
        'No anomalies detected in the submission',
      ],
      failed: [
        'Input parameters exceed acceptable thresholds',
        'Emission calculation discrepancy detected',
        'Missing or inconsistent data sources',
        'Confidence score below minimum requirement',
      ],
    };
    const details = passed ? detailOptions.passed.slice(0, 2 + Math.floor(Math.random() * 3)) : detailOptions.failed.slice(0, 2 + Math.floor(Math.random() * 3));

    const result: AuditResult = {
      type: auditType,
      projectId: projectId.trim(),
      status: passed ? 'PASSED' : 'FAILED',
      score,
      details,
      timestamp: new Date().toLocaleString(),
    };

    setResults((prev) => [result, ...prev]);
    setIsRunning(false);
    setInputs({});
    toast({
      title: result.status === 'PASSED' ? 'Audit Passed' : 'Audit Failed',
      description: `${auditType} audit for ${projectId}: Score ${score}%`,
      variant: result.status === 'PASSED' ? 'default' : 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Domain-Specific Audit</h2>
        <p className="text-muted-foreground text-sm mt-1">Run specialized audits for different carbon credit domains</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Audit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-600" />
              Run Audit
            </CardTitle>
            <CardDescription>Select audit type and provide inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audit Domain</Label>
              <Select value={auditType} onValueChange={(v) => { setAuditType(v as AuditType); setInputs({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(auditFields) as AuditType[]).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input placeholder="e.g., RICE-001" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </div>
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  placeholder={field.placeholder}
                  value={inputs[field.key] || ''}
                  onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                />
              </div>
            ))}
            <Button
              onClick={handleRunAudit}
              disabled={isRunning}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isRunning ? 'Running Audit...' : <><Search className="h-4 w-4" /> Run Audit</>}
            </Button>
          </CardContent>
        </Card>

        {/* Audit Results Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Audit Results Timeline</CardTitle>
            <CardDescription>History of all domain-specific audits</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <div className="px-6">
                {results.map((result, idx) => (
                  <React.Fragment key={idx}>
                    <div className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {result.status === 'PASSED' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{result.type} Audit</span>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${
                              result.status === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-100 text-red-700 hover:bg-red-100'
                            }`}>
                              {result.status}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${
                              result.score >= 80
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                                : result.score >= 60
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                                : 'bg-red-50 text-red-700 hover:bg-red-50'
                            }`}>
                              Score: {result.score}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Project: {result.projectId} | {result.timestamp}
                          </p>
                          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1">
                            {result.details.map((detail, didx) => (
                              <div key={didx} className="flex items-start gap-2 text-xs">
                                {result.status === 'PASSED' ? (
                                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                                )}
                                <span>{detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {idx < results.length - 1 && <Separator />}
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
