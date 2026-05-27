'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, RefreshCw, TreePine, Flame, Droplets, Zap, Sun, Plus, Copy, Trash2, Eye, Save, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Types ────────────────────────────────────────────────────────────────

interface FormulaData {
  expression: string;
  variables: Record<string, string>;
}

interface ParameterData {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default: string;
}

interface ConditionData {
  field: string;
  operator: string;
  value: string;
  message: string;
}

interface MethodologyRule {
  id: string;
  name: string;
  methodology: string;
  trackType: string;
  version: string;
  description: string;
  formula: string;
  parameters: string;
  conditions: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface MethodologySummary {
  total: number;
  byStatus: Record<string, number>;
  byTrackType: Record<string, number>;
}

interface MethodologyResponse {
  rules: MethodologyRule[];
  summary: MethodologySummary;
}

// ─── Config ───────────────────────────────────────────────────────────────

const trackTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  forest: { icon: TreePine, color: '#10b981', bgColor: 'bg-emerald-50', label: 'Forest' },
  biochar: { icon: Flame, color: '#f59e0b', bgColor: 'bg-amber-50', label: 'Biochar' },
  awd: { icon: Droplets, color: '#3b82f6', bgColor: 'bg-blue-50', label: 'AWD' },
  biogas: { icon: Zap, color: '#8b5cf6', bgColor: 'bg-violet-50', label: 'Biogas' },
  solar: { icon: Sun, color: '#ef4444', bgColor: 'bg-red-50', label: 'Solar' },
};

const statusConfig: Record<string, { bgColor: string; color: string; hoverBg: string }> = {
  ACTIVE: { bgColor: 'bg-emerald-100', color: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
  DRAFT: { bgColor: 'bg-amber-100', color: 'text-amber-700', hoverBg: 'hover:bg-amber-100' },
  DEPRECATED: { bgColor: 'bg-slate-100', color: 'text-slate-600', hoverBg: 'hover:bg-slate-100' },
};

const OPERATOR_OPTIONS = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'gte', label: 'Greater or equal (>=)' },
  { value: 'lte', label: 'Less or equal (<=)' },
  { value: 'eq', label: 'Equal (=)' },
  { value: 'neq', label: 'Not equal (!=)' },
];

const PARAM_TYPE_OPTIONS = [
  { value: 'number', label: 'Number' },
  { value: 'string', label: 'String' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
];

function parseJSON<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateText(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

// ─── Component ────────────────────────────────────────────────────────────

export default function MethodologyStudioView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MethodologyResponse | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<MethodologyRule | null>(null);

  // Builder form state
  const [builderName, setBuilderName] = useState('');
  const [builderMethodology, setBuilderMethodology] = useState('T-VER');
  const [builderTrackType, setBuilderTrackType] = useState('forest');
  const [builderVersion, setBuilderVersion] = useState('1.0');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderExpression, setBuilderExpression] = useState('');
  const [builderVariables, setBuilderVariables] = useState<{ name: string; description: string }[]>([
    { name: '', description: '' },
  ]);
  const [builderParams, setBuilderParams] = useState<ParameterData[]>([
    { name: '', type: 'number', required: false, description: '', default: '' },
  ]);
  const [builderConditions, setBuilderConditions] = useState<ConditionData[]>([
    { field: '', operator: 'gt', value: '', message: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dmrv/methodology');
      if (!res.ok) throw new Error('Failed to fetch methodology data');
      const json = (await res.json()) as MethodologyResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleViewRule = (rule: MethodologyRule) => {
    setSelectedRule(rule);
    setDetailOpen(true);
  };

  const handleDuplicate = async (rule: MethodologyRule) => {
    try {
      const formula = parseJSON<FormulaData>(rule.formula, { expression: '', variables: {} });
      const params = parseJSON<ParameterData[]>(rule.parameters, []);
      const conditions = parseJSON<ConditionData[]>(rule.conditions, []);

      await fetch('/api/dmrv/methodology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: `${rule.name} (Copy)`,
          methodology: rule.methodology,
          trackType: rule.trackType,
          version: rule.version,
          description: rule.description,
          formula: JSON.stringify(formula),
          parameters: JSON.stringify(params),
          conditions: JSON.stringify(conditions),
          status: 'DRAFT',
        }),
      });
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  const handleDeprecate = async (ruleId: string) => {
    try {
      await fetch('/api/dmrv/methodology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deprecate', ruleId }),
      });
      await fetchData();
    } catch {
      // Error handled silently
    }
  };

  const handleSaveAsDraft = async () => {
    setSaving(true);
    try {
      const formula: FormulaData = {
        expression: builderExpression,
        variables: builderVariables.reduce<Record<string, string>>((acc, v) => {
          if (v.name) acc[v.name] = v.description;
          return acc;
        }, {}),
      };

      await fetch('/api/dmrv/methodology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: builderName,
          methodology: builderMethodology,
          trackType: builderTrackType,
          version: builderVersion,
          description: builderDescription,
          formula: JSON.stringify(formula),
          parameters: JSON.stringify(builderParams),
          conditions: JSON.stringify(builderConditions),
          status: 'DRAFT',
        }),
      });
      resetBuilder();
      await fetchData();
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const formula: FormulaData = {
        expression: builderExpression,
        variables: builderVariables.reduce<Record<string, string>>((acc, v) => {
          if (v.name) acc[v.name] = v.description;
          return acc;
        }, {}),
      };

      await fetch('/api/dmrv/methodology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: builderName,
          methodology: builderMethodology,
          trackType: builderTrackType,
          version: builderVersion,
          description: builderDescription,
          formula: JSON.stringify(formula),
          parameters: JSON.stringify(builderParams),
          conditions: JSON.stringify(builderConditions),
          status: 'ACTIVE',
        }),
      });
      resetBuilder();
      await fetchData();
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  const resetBuilder = () => {
    setBuilderName('');
    setBuilderMethodology('T-VER');
    setBuilderTrackType('forest');
    setBuilderVersion('1.0');
    setBuilderDescription('');
    setBuilderExpression('');
    setBuilderVariables([{ name: '', description: '' }]);
    setBuilderParams([{ name: '', type: 'number', required: false, description: '', default: '' }]);
    setBuilderConditions([{ field: '', operator: 'gt', value: '', message: '' }]);
  };

  // Variable helpers
  const addVariable = () => setBuilderVariables((prev) => [...prev, { name: '', description: '' }]);
  const removeVariable = (idx: number) => setBuilderVariables((prev) => prev.filter((_, i) => i !== idx));
  const updateVariable = (idx: number, field: 'name' | 'description', value: string) => {
    setBuilderVariables((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  // Param helpers
  const addParam = () => setBuilderParams((prev) => [...prev, { name: '', type: 'number', required: false, description: '', default: '' }]);
  const removeParam = (idx: number) => setBuilderParams((prev) => prev.filter((_, i) => i !== idx));
  const updateParam = (idx: number, field: keyof ParameterData, value: string | boolean) => {
    setBuilderParams((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  // Condition helpers
  const addCondition = () => setBuilderConditions((prev) => [...prev, { field: '', operator: 'gt', value: '', message: '' }]);
  const removeCondition = (idx: number) => setBuilderConditions((prev) => prev.filter((_, i) => i !== idx));
  const updateCondition = (idx: number, field: keyof ConditionData, value: string) => {
    setBuilderConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  // Filter rules by tab
  const filteredRules = data?.rules.filter((r) => {
    if (activeTab === 'active') return r.status === 'ACTIVE';
    if (activeTab === 'draft') return r.status === 'DRAFT';
    return true; // 'all'
  }) || [];

  // ─── Loading State ────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            Methodology Studio
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Design and manage carbon calculation methodologies</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 self-start">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load data.{' '}
            <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{data?.summary.byStatus?.ACTIVE ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{data?.summary.byStatus?.DRAFT ?? 0}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <BookOpen className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-500">{data?.summary.byStatus?.DEPRECATED ?? 0}</p>
              <p className="text-xs text-muted-foreground">Deprecated</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <BookOpen className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-teal-600">{data?.summary.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="builder" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Builder
          </TabsTrigger>
        </TabsList>

        {/* ─── Active / Draft / All Tabs ────────────────────────────────── */}
        {['active', 'draft', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {filteredRules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No methodology rules found in this category.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRules.map((rule) => {
                  const trackCfg = trackTypeConfig[rule.trackType] || trackTypeConfig.forest;
                  const TrackIcon = trackCfg.icon;
                  const formulaData = parseJSON<FormulaData>(rule.formula, { expression: '', variables: {} });
                  const paramsData = parseJSON<ParameterData[]>(rule.parameters, []);
                  const conditionsData = parseJSON<ConditionData[]>(rule.conditions, []);
                  const statusCfg = statusConfig[rule.status] || statusConfig.DRAFT;

                  return (
                    <Card key={rule.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                              style={{ backgroundColor: `${trackCfg.color}15` }}
                            >
                              <TrackIcon className="h-4 w-4" style={{ color: trackCfg.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{rule.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600 hover:bg-slate-100">
                                  {rule.methodology}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">v{rule.version}</span>
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] h-4 shrink-0 ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.hoverBg}`}
                          >
                            {rule.status}
                          </Badge>
                        </div>

                        {/* Track type badge */}
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 gap-1"
                          style={{
                            backgroundColor: `${trackCfg.color}15`,
                            color: trackCfg.color,
                          }}
                        >
                          <TrackIcon className="h-2.5 w-2.5" />
                          {trackCfg.label}
                        </Badge>

                        {/* Description */}
                        {rule.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {truncateText(rule.description, 120)}
                          </p>
                        )}

                        {/* Formula */}
                        {formulaData.expression && (
                          <div className="rounded bg-slate-50 border border-slate-200 px-2 py-1.5">
                            <code className="text-[11px] font-mono text-slate-700 break-all">
                              {formulaData.expression}
                            </code>
                          </div>
                        )}

                        {/* Param/Condition counts */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{paramsData.length} parameter{paramsData.length !== 1 ? 's' : ''}</span>
                          <span>{conditionsData.length} condition{conditionsData.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Created by */}
                        <p className="text-[10px] text-muted-foreground">
                          By {rule.createdBy} &middot; {formatDate(rule.createdAt)}
                        </p>

                        {/* Actions */}
                        <Separator />
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 flex-1"
                            onClick={() => handleViewRule(rule)}
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 flex-1"
                            onClick={() => handleDuplicate(rule)}
                          >
                            <Copy className="h-3 w-3" />
                            Duplicate
                          </Button>
                          {rule.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                              onClick={() => handleDeprecate(rule.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Deprecate
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}

        {/* ─── Builder Tab ──────────────────────────────────────────────── */}
        <TabsContent value="builder" className="mt-4 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Forest Carbon Stock Change"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Methodology</Label>
                  <Select value={builderMethodology} onValueChange={setBuilderMethodology}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="T-VER">T-VER</SelectItem>
                      <SelectItem value="VCS">VCS</SelectItem>
                      <SelectItem value="GS">Gold Standard</SelectItem>
                      <SelectItem value="CDM">CDM</SelectItem>
                      <SelectItem value="CAR">CAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Track Type</Label>
                  <Select value={builderTrackType} onValueChange={setBuilderTrackType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(trackTypeConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <cfg.icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    placeholder="e.g., 1.0"
                    value={builderVersion}
                    onChange={(e) => setBuilderVersion(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the methodology rule..."
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Formula Builder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Formula Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expression</Label>
                <Input
                  placeholder="e.g., ΔC = Σ(A_i × ΔC_i × UF)"
                  value={builderExpression}
                  onChange={(e) => setBuilderExpression(e.target.value)}
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Use mathematical notation. Define each variable below.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Variables</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addVariable}>
                    <Plus className="h-3 w-3" />
                    Add Variable
                  </Button>
                </div>
                <div className="space-y-2">
                  {builderVariables.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Variable name (e.g., ΔC)"
                        value={v.name}
                        onChange={(e) => updateVariable(idx, 'name', e.target.value)}
                        className="flex-1 font-mono text-xs"
                      />
                      <Input
                        placeholder="Description"
                        value={v.description}
                        onChange={(e) => updateVariable(idx, 'description', e.target.value)}
                        className="flex-[2] text-xs"
                      />
                      {builderVariables.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeVariable(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parameters Builder */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Parameters</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addParam}>
                  <Plus className="h-3 w-3" />
                  Add Parameter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {builderParams.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-slate-50/50">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => updateParam(idx, 'name', e.target.value)}
                        className="text-xs"
                      />
                      <Select
                        value={p.type}
                        onValueChange={(v) => updateParam(idx, 'type', v)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARAM_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Default value"
                        value={p.default}
                        onChange={(e) => updateParam(idx, 'default', e.target.value)}
                        className="text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.required}
                          onCheckedChange={(checked) => updateParam(idx, 'required', checked)}
                        />
                        <Label className="text-xs">Required</Label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Input
                        placeholder="Description"
                        value={p.description}
                        onChange={(e) => updateParam(idx, 'description', e.target.value)}
                        className="text-xs min-w-[140px]"
                      />
                      {builderParams.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-red-500 hover:text-red-600 gap-1"
                          onClick={() => removeParam(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conditions Builder */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conditions</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addCondition}>
                  <Plus className="h-3 w-3" />
                  Add Condition
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {builderConditions.map((c, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-slate-50/50">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input
                        placeholder="Field"
                        value={c.field}
                        onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                        className="text-xs"
                      />
                      <Select
                        value={c.operator}
                        onValueChange={(v) => updateCondition(idx, 'operator', v)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATOR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={c.value}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                        className="text-xs"
                      />
                      <div className="flex gap-1">
                        <Input
                          placeholder="Error message"
                          value={c.message}
                          onChange={(e) => updateCondition(idx, 'message', e.target.value)}
                          className="text-xs flex-1"
                        />
                        {builderConditions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeCondition(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium mt-0.5">{builderName || '--'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Methodology:</span>
                  <p className="font-medium mt-0.5">{builderMethodology}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Track Type:</span>
                  <div className="mt-0.5">
                    {(() => {
                      const cfg = trackTypeConfig[builderTrackType];
                      const Icon = cfg.icon;
                      return (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 gap-1"
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>
                  <p className="font-medium mt-0.5">{builderVersion || '--'}</p>
                </div>
              </div>
              {builderExpression && (
                <div className="rounded bg-slate-50 border border-slate-200 px-3 py-2">
                  <span className="text-[10px] text-muted-foreground block mb-1">Formula</span>
                  <code className="text-sm font-mono text-slate-700">{builderExpression}</code>
                </div>
              )}
              {builderVariables.some((v) => v.name) && (
                <div>
                  <span className="text-[10px] text-muted-foreground">Variables:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {builderVariables
                      .filter((v) => v.name)
                      .map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-700 hover:bg-slate-100">
                          {v.name}: {v.description || 'undefined'}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{builderParams.filter((p) => p.name).length} parameter(s)</span>
                <span>{builderConditions.filter((c) => c.field).length} condition(s)</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveAsDraft}
              disabled={saving || !builderName.trim()}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={saving || !builderName.trim()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Detail Dialog ──────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRule && (() => {
                const cfg = trackTypeConfig[selectedRule.trackType] || trackTypeConfig.forest;
                const Icon = cfg.icon;
                return <Icon className="h-5 w-5" style={{ color: cfg.color }} />;
              })()}
              {selectedRule?.name || 'Methodology Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedRule && (() => {
            const rule = selectedRule;
            const trackCfg = trackTypeConfig[rule.trackType] || trackTypeConfig.forest;
            const TrackIcon = trackCfg.icon;
            const formulaData = parseJSON<FormulaData>(rule.formula, { expression: '', variables: {} });
            const paramsData = parseJSON<ParameterData[]>(rule.parameters, []);
            const conditionsData = parseJSON<ConditionData[]>(rule.conditions, []);
            const statusCfg = statusConfig[rule.status] || statusConfig.DRAFT;

            return (
              <div className="space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">
                    {rule.methodology}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1"
                    style={{ backgroundColor: `${trackCfg.color}15`, color: trackCfg.color }}
                  >
                    <TrackIcon className="h-3 w-3" />
                    {trackCfg.label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-100">
                    v{rule.version}
                  </Badge>
                  <Badge variant="secondary" className={`text-xs ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.hoverBg}`}>
                    {rule.status}
                  </Badge>
                </div>

                {/* Description */}
                {rule.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rule.description}</p>
                  </div>
                )}

                {/* Formula */}
                {formulaData.expression && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Formula</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded bg-slate-50 border border-slate-200 px-3 py-2">
                        <code className="text-sm font-mono text-slate-800 break-all">
                          {formulaData.expression}
                        </code>
                      </div>
                      {Object.keys(formulaData.variables).length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">Variables</h5>
                          <div className="space-y-1">
                            {Object.entries(formulaData.variables).map(([name, desc]) => (
                              <div key={name} className="flex items-center gap-3 text-xs bg-white rounded px-2 py-1.5 border">
                                <code className="font-mono font-semibold text-emerald-700 min-w-[60px]">{name}</code>
                                <span className="text-muted-foreground">{desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Parameters */}
                {paramsData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Parameters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Required</TableHead>
                            <TableHead className="text-xs">Default</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paramsData.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs font-medium">{p.name}</TableCell>
                              <TableCell className="text-xs">{p.type}</TableCell>
                              <TableCell className="text-xs">
                                {p.required ? (
                                  <Badge variant="secondary" className="text-[9px] h-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    Required
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">Optional</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{p.default || '--'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{p.description || '--'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Conditions */}
                {conditionsData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Field</TableHead>
                            <TableHead className="text-xs">Operator</TableHead>
                            <TableHead className="text-xs">Value</TableHead>
                            <TableHead className="text-xs">Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {conditionsData.map((c, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{c.field}</TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600 hover:bg-slate-100">
                                  {c.operator}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{c.value}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{c.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>Created by: <span className="font-medium text-slate-700">{rule.createdBy}</span></div>
                  <div>Created: <span className="font-medium text-slate-700">{formatDate(rule.createdAt)}</span></div>
                  <div>Updated: <span className="font-medium text-slate-700">{formatDate(rule.updatedAt)}</span></div>
                  <div>ID: <span className="font-mono text-slate-500">{rule.id.slice(0, 12)}...</span></div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
