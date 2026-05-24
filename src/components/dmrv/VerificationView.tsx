'use client';

import React, { useState } from 'react';
import { CheckCircle, Shield, Activity, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const sourceTypes = ['Satellite', 'Photo', 'Drone', 'LiDAR', 'IoT', 'Weather', 'Soil', 'Biochar', 'AWD', 'Fertilizer', 'Biogas', 'Solar', 'Agri-Activity'];

interface VerificationResult {
  projectId: string;
  integrityScore: number;
  sourceCoverage: number;
  sourcesCovered: string[];
  status: 'PASSED' | 'FAILED';
  auditHash: string;
  timestamp: string;
}

export default function VerificationView() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [history, setHistory] = useState<VerificationResult[]>([
    {
      projectId: 'RICE-001',
      integrityScore: 94.7,
      sourceCoverage: 77,
      sourcesCovered: ['Satellite', 'IoT', 'Photo', 'Soil', 'Weather', 'Drone', 'Biochar', 'AWD', 'Fertilizer', 'Biogas'],
      status: 'PASSED',
      auditHash: '0x7f3a9b2c...c2d1e4f8',
      timestamp: '2024-12-15 14:30',
    },
    {
      projectId: 'BIOG-003',
      integrityScore: 87.3,
      sourceCoverage: 54,
      sourcesCovered: ['IoT', 'Photo', 'Biogas', 'Weather', 'Soil', 'Drone', 'Fertilizer'],
      status: 'PASSED',
      auditHash: '0xa1c8d5e6...3b7f902a',
      timestamp: '2024-12-15 12:15',
    },
    {
      projectId: 'SOL-004',
      integrityScore: 71.2,
      sourceCoverage: 38,
      sourcesCovered: ['Solar', 'IoT', 'Weather', 'Photo', 'Satellite'],
      status: 'FAILED',
      auditHash: '0x2d9f8b4a...e6c1d3f7',
      timestamp: '2024-12-15 10:45',
    },
  ]);

  const runVerification = async () => {
    if (!projectId.trim()) {
      toast({ title: 'Validation Error', description: 'Project ID is required', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const numSources = 5 + Math.floor(Math.random() * 8);
    const covered = [...sourceTypes].sort(() => Math.random() - 0.5).slice(0, numSources);
    const integrity = 65 + Math.random() * 30;
    const coverage = Math.round((numSources / sourceTypes.length) * 100);
    const hash = `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newResult: VerificationResult = {
      projectId: projectId.trim(),
      integrityScore: parseFloat(integrity.toFixed(1)),
      sourceCoverage: coverage,
      sourcesCovered: covered,
      status: integrity >= 80 ? 'PASSED' : 'FAILED',
      auditHash: hash,
      timestamp: new Date().toLocaleString(),
    };

    setResult(newResult);
    setHistory((prev) => [newResult, ...prev]);
    setIsVerifying(false);
    toast({
      title: newResult.status === 'PASSED' ? 'Verification Passed' : 'Verification Failed',
      description: `Integrity: ${newResult.integrityScore}% | Coverage: ${newResult.sourceCoverage}%`,
      variant: newResult.status === 'PASSED' ? 'default' : 'destructive',
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const scoreBarColor = (score: number) => {
    if (score >= 90) return '[&>div]:bg-emerald-500';
    if (score >= 80) return '[&>div]:bg-green-500';
    if (score >= 70) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Cross-Modal Verification</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Validate data integrity across multiple source types
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Verification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Run Verification
            </CardTitle>
            <CardDescription>Cross-validate project data integrity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input placeholder="e.g., RICE-001" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </div>
            <Button
              onClick={runVerification}
              disabled={isVerifying}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isVerifying ? 'Verifying...' : <><CheckCircle className="h-4 w-4" /> Run Verification</>}
            </Button>
          </CardContent>
        </Card>

        {/* Current Result */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Verification Result</CardTitle>
            <CardDescription>
              {result ? `Results for ${result.projectId}` : 'Run a verification to see results'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`rounded-lg p-4 text-center ${result.status === 'PASSED' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`text-3xl font-bold ${result.status === 'PASSED' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.status}
                  </span>
                </div>

                {/* Integrity Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Integrity Score</span>
                    <span className={`text-lg font-bold ${scoreColor(result.integrityScore)}`}>
                      {result.integrityScore}%
                    </span>
                  </div>
                  <Progress value={result.integrityScore} className={`h-3 ${scoreBarColor(result.integrityScore)}`} />
                </div>

                {/* Source Coverage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Source Type Coverage</span>
                    <span className={`text-lg font-bold ${scoreColor(result.sourceCoverage)}`}>
                      {result.sourceCoverage}%
                    </span>
                  </div>
                  <Progress value={result.sourceCoverage} className={`h-3 ${scoreBarColor(result.sourceCoverage)}`} />
                </div>

                {/* Sources Covered */}
                <div>
                  <span className="text-sm font-medium">Sources Covered ({result.sourcesCovered.length}/13)</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sourceTypes.map((st) => {
                      const covered = result.sourcesCovered.includes(st);
                      return (
                        <Badge
                          key={st}
                          variant="secondary"
                          className={`text-[10px] h-5 ${
                            covered
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-100 line-through'
                          }`}
                        >
                          {st}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Audit Hash */}
                <div className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-3">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Audit Hash:</span>
                  <span className="font-mono font-semibold">{result.auditHash}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-3 text-slate-300" />
                <p className="text-sm">No verification results yet</p>
                <p className="text-xs">Enter a Project ID and run verification</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification History</CardTitle>
          <CardDescription>Previous verification attempts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Integrity</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Coverage</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Audit Hash</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="p-3 font-medium">{h.projectId}</td>
                    <td className={`p-3 font-semibold ${scoreColor(h.integrityScore)}`}>{h.integrityScore}%</td>
                    <td className="p-3">{h.sourceCoverage}%</td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 ${
                          h.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {h.status}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{h.auditHash}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">{h.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
