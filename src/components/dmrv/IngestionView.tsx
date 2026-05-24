'use client';

import React, { useState } from 'react';
import { Upload, Lock, Unlock, FileUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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

const SOURCE_TYPES = [
  'Satellite',
  'Photo',
  'Drone',
  'LiDAR',
  'IoT',
  'Weather',
  'Soil',
  'Biochar',
  'AWD',
  'Fertilizer',
  'Biogas',
  'Solar',
  'Agri-Activity',
] as const;

type SourceType = (typeof SOURCE_TYPES)[number];

interface IngestionLog {
  id: string;
  sourceType: SourceType;
  fileName: string;
  classification: 'PUBLIC' | 'CONFIDENTIAL';
  encrypted: boolean;
  status: 'ingested' | 'processing' | 'failed';
  timestamp: string;
}

const mockLogs: IngestionLog[] = [
  { id: '1', sourceType: 'Satellite', fileName: 'sentinel2_2024_bangkok.tif', classification: 'PUBLIC', encrypted: false, status: 'ingested', timestamp: '2024-12-15 14:23' },
  { id: '2', sourceType: 'IoT', fileName: 'sensor_moisture_001.json', classification: 'CONFIDENTIAL', encrypted: true, status: 'ingested', timestamp: '2024-12-15 14:20' },
  { id: '3', sourceType: 'Photo', fileName: 'field_plot_047.jpg', classification: 'PUBLIC', encrypted: false, status: 'ingested', timestamp: '2024-12-15 13:55' },
  { id: '4', sourceType: 'Soil', fileName: 'soil_carbon_core_12.csv', classification: 'CONFIDENTIAL', encrypted: true, status: 'processing', timestamp: '2024-12-15 13:40' },
  { id: '5', sourceType: 'Weather', fileName: 'weather_station_daily.json', classification: 'PUBLIC', encrypted: false, status: 'ingested', timestamp: '2024-12-15 12:10' },
  { id: '6', sourceType: 'Drone', fileName: 'drone_ndvi_survey.tif', classification: 'PUBLIC', encrypted: false, status: 'ingested', timestamp: '2024-12-15 11:30' },
  { id: '7', sourceType: 'Biochar', fileName: 'biochar_production_log.xlsx', classification: 'CONFIDENTIAL', encrypted: true, status: 'failed', timestamp: '2024-12-15 10:15' },
  { id: '8', sourceType: 'LiDAR', fileName: 'lidar_biomass_scan.las', classification: 'PUBLIC', encrypted: false, status: 'ingested', timestamp: '2024-12-15 09:45' },
  { id: '9', sourceType: 'Solar', fileName: 'solar_generation_meter.csv', classification: 'PUBLIC', encrypted: false, status: 'ingested', timestamp: '2024-12-15 08:20' },
  { id: '10', sourceType: 'AWD', fileName: 'awd_water_level_monitor.json', classification: 'CONFIDENTIAL', encrypted: true, status: 'processing', timestamp: '2024-12-15 07:55' },
];

const statusIcons = {
  ingested: CheckCircle2,
  processing: Clock,
  failed: AlertCircle,
};

const statusColors = {
  ingested: 'text-emerald-600',
  processing: 'text-amber-600',
  failed: 'text-red-600',
};

export default function IngestionView() {
  const { toast } = useToast();
  const [sourceType, setSourceType] = useState<SourceType>('Satellite');
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState<'PUBLIC' | 'CONFIDENTIAL'>('PUBLIC');
  const [logs, setLogs] = useState<IngestionLog[]>(mockLogs);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIngest = async () => {
    if (!fileName.trim()) {
      toast({ title: 'Validation Error', description: 'File name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const newLog: IngestionLog = {
      id: String(logs.length + 1),
      sourceType,
      fileName: fileName.trim(),
      classification,
      encrypted: classification === 'CONFIDENTIAL',
      status: 'ingested',
      timestamp: new Date().toLocaleString(),
    };

    setLogs((prev) => [newLog, ...prev]);
    setFileName('');
    setDescription('');
    setIsSubmitting(false);

    toast({
      title: 'Data Ingested',
      description: `${sourceType} data "${fileName}" ingested successfully as ${classification}`,
    });
  };

  const publicCount = logs.filter((l) => l.classification === 'PUBLIC').length;
  const confidentialCount = logs.filter((l) => l.classification === 'CONFIDENTIAL').length;
  const encryptedCount = logs.filter((l) => l.encrypted).length;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Data Ingestion</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Collect and normalize data from 13 source types with automatic classification & encryption
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Total Ingested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{publicCount}</p>
            <p className="text-xs text-muted-foreground">PUBLIC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{confidentialCount}</p>
            <p className="text-xs text-muted-foreground">CONFIDENTIAL</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{encryptedCount}</p>
            <p className="text-xs text-muted-foreground">Encrypted</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ingestion Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-600" />
              Ingest New Data
            </CardTitle>
            <CardDescription>Submit data from any of the 13 supported source types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File / Data Name</Label>
              <Input
                placeholder="e.g., sentinel2_2024_bangkok.tif"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the data being ingested..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Classification</Label>
              <Select value={classification} onValueChange={(v) => setClassification(v as 'PUBLIC' | 'CONFIDENTIAL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                  <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {classification === 'CONFIDENTIAL' && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Confidential data will be encrypted with AES-256 before storage</span>
              </div>
            )}

            <Button
              onClick={handleIngest}
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Ingest Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Source Type Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported Source Types</CardTitle>
            <CardDescription>13 data sources for comprehensive carbon monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map((type) => {
                const count = logs.filter((l) => l.sourceType === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setSourceType(type)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                      sourceType === type
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{type}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingestion Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Ingestion Logs</CardTitle>
          <CardDescription>All ingested data records with classification and encryption status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Encrypted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const StatusIcon = statusIcons[log.status];
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {log.sourceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {log.fileName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-5 ${
                            log.classification === 'PUBLIC'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {log.classification}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.encrypted ? (
                          <Lock className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Unlock className="h-4 w-4 text-slate-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-3.5 w-3.5 ${statusColors[log.status]}`} />
                          <span className="text-xs capitalize">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {log.timestamp}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
