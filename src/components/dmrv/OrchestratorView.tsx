'use client';

import React, { useState, useCallback } from 'react';
import {
  Workflow,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type AgentStatus = 'pending' | 'running' | 'success' | 'failed';

interface AgentStep {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  output?: string;
  confidence?: number;
}

const initialAgents: AgentStep[] = [
  { id: 'ingestion', name: 'Data Ingestion', description: 'Collect & normalize input data from 13 source types', status: 'pending' },
  { id: 'classification', name: 'Classification Agent', description: 'Classify data as PUBLIC / CONFIDENTIAL & tag source type', status: 'pending' },
  { id: 'security', name: 'Security & PDPA Agent', description: 'RBAC validation & PDPA compliance check', status: 'pending' },
  { id: 'carbon', name: 'Carbon Quantification', description: 'Calculate emission reductions (tCO2e) per methodology', status: 'pending' },
  { id: 'verification', name: 'Cross-Modal Verification', description: 'Cross-validate data integrity across sources', status: 'pending' },
  { id: 'certification', name: 'Certification Agent', description: 'T-VER registry submission & issuance', status: 'pending' },
  { id: 'marketplace', name: 'Marketplace Agent', description: 'Mint, trade, or retire carbon credits', status: 'pending' },
  { id: 'logistics', name: 'Logistics & Settlement', description: 'Tracking, inventory & financial settlement', status: 'pending' },
];

const statusIcon: Record<AgentStatus, React.ElementType> = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle2,
  failed: XCircle,
};

const statusColor: Record<AgentStatus, string> = {
  pending: 'text-slate-400',
  running: 'text-emerald-600',
  success: 'text-emerald-600',
  failed: 'text-red-600',
};

const statusBg: Record<AgentStatus, string> = {
  pending: 'bg-slate-50 border-slate-200',
  running: 'bg-emerald-50 border-emerald-200',
  success: 'bg-emerald-50 border-emerald-200',
  failed: 'bg-red-50 border-red-200',
};

const badgeStyle: Record<AgentStatus, string> = {
  pending: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  running: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  success: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  failed: 'bg-red-100 text-red-700 hover:bg-red-100',
};

export default function OrchestratorView() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentStep[]>(initialAgents);
  const [isRunning, setIsRunning] = useState(false);
  const [auditTrail, setAuditTrail] = useState<{ time: string; message: string; type: 'info' | 'warn' | 'error' }[]>([]);
  const [hitlAlert, setHitlAlert] = useState(false);

  const addAudit = useCallback((message: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setAuditTrail((prev) => [...prev, { time, message, type }]);
  }, []);

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    setHitlAlert(false);
    setAuditTrail([]);
    setAgents(initialAgents.map((a) => ({ ...a, status: 'pending' as AgentStatus, output: undefined, confidence: undefined })));

    addAudit('Workflow initiated — processing 8 agents sequentially');

    const outputs = [
      'Ingested 13 data sources: 4 satellite, 3 IoT, 2 photo, 2 soil, 1 weather, 1 drone',
      'Classification: 9 PUBLIC, 4 CONFIDENTIAL | Sources tagged: Satellite(4), IoT(3), Photo(2), Soil(2), Weather(1), Drone(1)',
      'RBAC: Admin access verified | PDPA: All CONFIDENTIAL data encrypted (AES-256) | Consent logs OK',
      'Biochar: 12,450 tCO2e | AWD: 8,320 tCO2e | Solar: 3,200 tCO2e | Total: 23,970 tCO2e',
      'Integrity score: 94.7% | Cross-source validation PASSED | Audit hash: 0x7f3a...c2d1',
      'T-VER #2024-089 submitted | Master Certificate #MC-0456 issued | Registry: Thailand T-VER',
      'Credits minted: 23,970 tCO2e | Batch #CB-0456 | Listed on marketplace',
      'Tracking ID #TRK-789 created | Inventory updated | Settlement: ฿14,382,000 processed',
    ];

    const confidences = [1.0, 0.98, 1.0, 0.87, 0.95, 0.99, 1.0, 0.92];

    for (let i = 0; i < agents.length; i++) {
      // Set current agent to running
      setAgents((prev) =>
        prev.map((a, idx) => (idx === i ? { ...a, status: 'running' as AgentStatus } : a))
      );
      addAudit(`Agent ${i + 1}/${agents.length}: ${initialAgents[i].name} — RUNNING`);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

      // Check for low confidence (HITL)
      if (confidences[i] < 0.9 && i === 3) {
        addAudit(`⚠️ Low confidence detected on Carbon Quantification: ${(confidences[i] * 100).toFixed(1)}% — Human review recommended`, 'warn');
        setHitlAlert(true);
      }

      // Set agent to success
      setAgents((prev) =>
        prev.map((a, idx) =>
          idx === i
            ? { ...a, status: 'success' as AgentStatus, output: outputs[i], confidence: confidences[i] }
            : a
        )
      );
      addAudit(`Agent ${i + 1}/${agents.length}: ${initialAgents[i].name} — COMPLETED ✓`);
    }

    addAudit('Workflow completed successfully — 8/8 agents passed');
    setIsRunning(false);
    toast({
      title: 'Workflow Complete',
      description: 'All 8 agents executed successfully. 23,970 tCO2e credits processed.',
    });
  }, [agents.length, addAudit, toast]);

  const completedCount = agents.filter((a) => a.status === 'success').length;
  const progress = (completedCount / agents.length) * 100;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Orchestrator</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Agent workflow pipeline for end-to-end dMRV processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runWorkflow}
            disabled={isRunning}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running...' : 'Run Workflow'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setAgents(initialAgents);
              setAuditTrail([]);
              setHitlAlert(false);
              setIsRunning(false);
            }}
            disabled={isRunning}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {(isRunning || completedCount > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Workflow Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{agents.length} agents completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* HITL Alert */}
      {hitlAlert && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Human-in-the-Loop Review Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            Carbon Quantification confidence is below 90%. Please review the calculation parameters before proceeding.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Agent Pipeline */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="h-4 w-4 text-emerald-600" />
                Agent Pipeline
              </CardTitle>
              <CardDescription>Sequential execution of 8 dMRV agents</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pb-4">
                {agents.map((agent, idx) => {
                  const StatusIcon = statusIcon[agent.status];
                  return (
                    <React.Fragment key={agent.id}>
                      <div
                        className={`rounded-lg border p-4 transition-all duration-300 ${statusBg[agent.status]}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <StatusIcon
                              className={`h-5 w-5 ${statusColor[agent.status]} ${
                                agent.status === 'running' ? 'animate-spin' : ''
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{agent.name}</span>
                              <Badge variant="secondary" className={`text-[10px] h-5 ${badgeStyle[agent.status]}`}>
                                {agent.status.toUpperCase()}
                              </Badge>
                              {agent.confidence !== undefined && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 ${
                                    agent.confidence >= 0.9
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                  }`}
                                >
                                  Confidence: {(agent.confidence * 100).toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                            {agent.output && (
                              <div className="mt-2 rounded bg-white/80 border p-2 text-xs text-gray-700 leading-relaxed">
                                <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                                  <Eye className="h-3 w-3" />
                                  <span className="font-medium">Output</span>
                                </div>
                                {agent.output}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                        </div>
                      </div>
                      {idx < agents.length - 1 && (
                        <div className="flex justify-center py-1.5">
                          <ChevronRight className="h-4 w-4 text-slate-300 rotate-90" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Trail</CardTitle>
            <CardDescription>Real-time workflow log</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <div className="px-6 pb-4">
                {auditTrail.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Run the workflow to see the audit trail
                  </div>
                ) : (
                  auditTrail.map((entry, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex gap-3 py-2">
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">
                          {entry.time}
                        </span>
                        <p
                          className={`text-xs leading-relaxed ${
                            entry.type === 'error'
                              ? 'text-red-600'
                              : entry.type === 'warn'
                              ? 'text-amber-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {entry.message}
                        </p>
                      </div>
                      {idx < auditTrail.length - 1 && <Separator />}
                    </React.Fragment>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
