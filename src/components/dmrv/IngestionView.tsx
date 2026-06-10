'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Lock, Unlock, FileUp, Clock, CheckCircle2, AlertCircle, RefreshCw, AlertCircle as ErrorIcon, FlaskConical, Thermometer, Beaker, Wind, Droplets } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  'Methanotroph',
  'SynMEC',
  'CCU',
  'Bioremediation',
  'Waste-to-Value',
  'Bio-Digest',
] as const;

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  Methanotroph: 'จุลินทรีย์ย่อยสลายมีเทน',
  SynMEC: 'สหชีวภาพผลิตมีเทน',
  CCU: 'การดักจับและใช้ประโยชน์ CO₂',
  Bioremediation: 'การบำบัดทางชีวภาพ',
  'Waste-to-Value': 'เปลี่ยนของเสียเป็นผลิตภัณฑ์',
  'Bio-Digest': 'การย่อยสลายทางชีวภาพ',
};

// Bio-specific extra fields per source type
const BIO_EXTRA_FIELDS: Record<string, { key: string; label: string; placeholder: string; type?: 'text' | 'number' | 'select'; options?: string[] }[]> = {
  Methanotroph: [
    { key: 'strainName', label: 'สายพันธุ์จุลินทรีย์ (Strain)', placeholder: 'e.g., Methylococcus capsulatus', type: 'select', options: ['Methylococcus capsulatus', 'Methylosinus trichosporium', 'Methylocystis parvus', 'Methylomonas methanica', 'Methylocaldum szegediense', 'Ca. Methylomirabilis oxyfera'] },
    { key: 'ch4Concentration', label: 'ความเข้มข้น CH₄ (%)', placeholder: 'e.g., 50', type: 'number' },
    { key: 'temperature', label: 'อุณหภูมิ (°C)', placeholder: 'e.g., 37', type: 'number' },
    { key: 'ph', label: 'ค่า pH', placeholder: 'e.g., 7.0', type: 'number' },
    { key: 'oxidationRate', label: 'อัตราย่อยสลาย CH₄ (g/g biomass/day)', placeholder: 'e.g., 12.5', type: 'number' },
    { key: 'samplingMethod', label: 'วิธีการเก็บตัวอย่าง', placeholder: 'e.g., Biofilter gas sampling', type: 'select', options: ['Biofilter gas sampling', 'Soil pore gas', 'Bioreactor headspace', 'Flux chamber', 'Direct measurement'] },
  ],
  SynMEC: [
    { key: 'organismGroup', label: 'กลุ่มจุลินทรีย์', placeholder: '', type: 'select', options: ['Syntrophic Bacteria', 'Methanogens (H₂-utilizing)', 'Methanogens (Acetoclastic)', 'Mixed Consortium'] },
    { key: 'organicLoad', label: 'ปริมาณสารอินทรีย์ (ton VS/day)', placeholder: 'e.g., 50', type: 'number' },
    { key: 'biogasYield', label: 'ผลผลิตไบโอก๊าซ (m³/ton VS)', placeholder: 'e.g., 35', type: 'number' },
    { key: 'h2PartialPressure', label: 'H₂ partial pressure (atm × 10⁻³)', placeholder: 'e.g., 0.5', type: 'number' },
    { key: 'reactorType', label: 'ประเภทเครื่องปฏิกรณ์', placeholder: '', type: 'select', options: ['UASB', 'CSTR', 'Fixed-bed', 'Fluidized-bed', 'Anaerobic filter'] },
  ],
  CCU: [
    { key: 'captureOrganism', label: 'จุลินทรีย์ที่ใช้จับ CO₂', placeholder: '', type: 'select', options: ['Clostridium ljungdahlii', 'Synechocystis sp. PCC 6803', 'Chlorella vulgaris', 'Sporomusa ovata', 'Mixed culture'] },
    { key: 'co2Concentration', label: 'ความเข้มข้น CO₂ ขาเข้า (%)', placeholder: 'e.g., 15', type: 'number' },
    { key: 'captureEfficiency', label: 'ประสิทธิภาพการจับ (%)', placeholder: 'e.g., 85', type: 'number' },
    { key: 'pathway', label: 'Metabolic pathway', placeholder: '', type: 'select', options: ['Wood-Ljungdahl', 'Calvin-Benson', 'Serpentine', 'Electro-fermentation', '3-HP/4-HB cycle'] },
    { key: 'productType', label: 'ผลิตภัณฑ์', placeholder: '', type: 'select', options: ['Acetate', 'Ethanol', 'Biomass', 'Bioplastic (PHA)', 'Lipids', 'Formate'] },
  ],
  Bioremediation: [
    { key: 'pollutantType', label: 'ประเภทสารพิษ', placeholder: '', type: 'select', options: ['Heavy Metals', 'Hydrocarbons/PAHs', 'Organic Pollutants', 'Oil Spills', 'CH₄ from Landfill', 'Nutrients/BOD'] },
    { key: 'remediationType', label: 'วิธีบำบัด', placeholder: '', type: 'select', options: ['Phytoremediation', 'Mycoremediation', 'Bioaugmentation', 'Biostimulation', 'Methanotrophic Biocover', 'Constructed Wetland'] },
    { key: 'treatmentEfficiency', label: 'ประสิทธิภาพการบำบัด (%)', placeholder: 'e.g., 75', type: 'number' },
    { key: 'pollutantLoad', label: 'ปริมาณสารพิษ (m³/day)', placeholder: 'e.g., 500', type: 'number' },
    { key: 'treatmentDuration', label: 'ระยะเวลาบำบัด (วัน)', placeholder: 'e.g., 30', type: 'number' },
  ],
  'Waste-to-Value': [
    { key: 'wasteType', label: 'ประเภทของเสีย', placeholder: '', type: 'select', options: ['Organic Waste', 'Food Waste', 'Agricultural Residue', 'Wastewater', 'Syngas/CO₂'] },
    { key: 'processType', label: 'กระบวนการ', placeholder: '', type: 'select', options: ['Anaerobic Digestion', 'Gas Fermentation', 'Composting', 'Nutrient Recovery (Struvite)', 'Dark Fermentation'] },
    { key: 'wasteInput', label: 'ปริมาณของเสีย (ton/day)', placeholder: 'e.g., 100', type: 'number' },
    { key: 'processEfficiency', label: 'ประสิทธิภาพกระบวนการ (%)', placeholder: 'e.g., 75', type: 'number' },
    { key: 'outputProduct', label: 'ผลิตภัณฑ์ที่ได้', placeholder: '', type: 'select', options: ['Biogas', 'Ethanol', 'Compost', 'Struvite fertilizer', 'Hydrogen', 'Bioplastic'] },
  ],
  'Bio-Digest': [
    { key: 'feedstockType', label: 'วัตถุดิบ', placeholder: '', type: 'select', options: ['Livestock manure', 'Food waste', 'Crop residue', 'Wastewater sludge', 'Energy crop'] },
    { key: 'retentionTime', label: 'Retention time (วัน)', placeholder: 'e.g., 20', type: 'number' },
    { key: 'temperature', label: 'อุณหภูมิ (°C)', placeholder: 'e.g., 37', type: 'number' },
    { key: 'ph', label: 'ค่า pH', placeholder: 'e.g., 7.0', type: 'number' },
    { key: 'vsContent', label: 'Volatile Solids (%)', placeholder: 'e.g., 75', type: 'number' },
  ],
};

type SourceType = (typeof SOURCE_TYPES)[number];

interface Project {
  id: string;
  name: string;
  status: string;
}

interface IngestionLog {
  id: string;
  sourceType: string;
  activityType: string;
  classification: string;
  isEncrypted: boolean;
  integrityHash: string;
  timestamp: string;
  projectId: string;
  project?: { id: string; name: string };
}

const statusIcons: Record<string, React.ElementType> = {
  ingested: CheckCircle2,
  processing: Clock,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
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
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [bioFields, setBioFields] = useState<Record<string, string>>({});
  const [monitoringProtocol, setMonitoringProtocol] = useState<string>('');

  // Get extra fields for current source type
  const extraFields = BIO_EXTRA_FIELDS[sourceType] || [];
  const isBioSource = sourceType in BIO_EXTRA_FIELDS;

  // Monitoring protocols per bio source type
  const BIO_MONITORING_PROTOCOLS: Record<string, string> = {
    Methanotroph: 'T-VER-AG-001: วัด CH₄ inlet/outlet ด้วย FID/GC, บันทึกอุณหภูมิ/pH รายวัน, นับ CFU รายสัปดาห์, ส่งตัวอย่างควบคุม (QA/QC) รายเดือน',
    SynMEC: 'T-VER-WT-001: วัด H₂ partial pressure ด้วย GC, วิเคราะห์ VFA รายสัปดาห์, บันทึก biogas production รายวัน, ตรวจ pH/อุณหภูมิ ต่อเนื่อง',
    CCU: 'T-VER-P-RE-001: วัด CO₂ inlet/outlet ด้วย NDIR, บันทึก flow rate รายวัน, วิเคราะห์ผลิตภัณฑ์รายสัปดาห์, ตรวจสอบ mass balance รายเดือน',
    Bioremediation: 'T-VER-WT-001: วัดสารพิษก่อน/หลังบำบัด, บันทึกจุลินทรีย์ CFU รายสัปดาห์, วิเคราะห์คุณภาพน้ำรายเดือน, ตรวจ BOD/COD รายสัปดาห์',
    'Waste-to-Value': 'T-VER-AG-001: ชั่งน้ำหนักของเสียเข้ารายวัน, วัดไบโอก๊าซด้วย flow meter, วิเคราะห์ผลิตภัณฑ์รายสัปดาห์, ตรวจสอบ mass balance รายเดือน',
    'Bio-Digest': 'T-VER-AG-001: วัดปริมาณไบโอก๊าซด้วย gas meter, วิเคราะห์ส่วนผสม CH₄/CO₂ ด้วย GC, บันทึกอุณหภูมิ/pH รายวัน, วิเคราะห์ VS/TS รายสัปดาห์',
  };

  // Update monitoring protocol when source type changes
  useEffect(() => {
    setMonitoringProtocol(BIO_MONITORING_PROTOCOLS[sourceType] || '');
    setBioFields({});
  }, [sourceType]);

  // Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/dmrv');
        if (res.ok) {
          const data = await res.json();
          const projectList: Project[] = (data.projects || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            status: p.status as string,
          }));
          setProjects(projectList);
          if (projectList.length > 0) {
            setSelectedProjectId(projectList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setProjectsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch real ingestion logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dmrv/ingestion');
      if (!res.ok) throw new Error('Failed to fetch ingestion logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ingestion logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleIngest = async () => {
    if (!fileName.trim()) {
      toast({ title: 'Validation Error', description: 'File name is required', variant: 'destructive' });
      return;
    }
    if (!selectedProjectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build payload with bio-specific fields
      const payload: Record<string, unknown> = {
        fileName: fileName.trim(),
        description: description.trim(),
        classification,
      };

      // Add bio-specific fields if present
      if (isBioSource && Object.keys(bioFields).length > 0) {
        payload.bioMetadata = bioFields;
        payload.monitoringProtocol = monitoringProtocol;
      }

      const res = await fetch('/api/dmrv/ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: sourceType.toLowerCase(),
          activityType: 'data_upload',
          payload,
          evidenceUrl: '',
          projectId: selectedProjectId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ingestion failed');
      }

      const result = await res.json();
      const newLog: IngestionLog = result.log;

      setLogs((prev) => [newLog, ...prev]);
      setFileName('');
      setDescription('');
      setBioFields({});

      toast({
        title: 'Data Ingested',
        description: `${sourceType} data "${fileName}" ingested successfully as ${newLog.classification}${isBioSource ? ' (with bio metadata)' : ''}`,
      });
    } catch (err) {
      toast({
        title: 'Ingestion Failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const publicCount = logs.filter((l) => l.classification === 'PUBLIC').length;
  const confidentialCount = logs.filter((l) => l.classification === 'CONFIDENTIAL').length;
  const encryptedCount = logs.filter((l) => l.isEncrypted).length;

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Data Ingestion</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Collect and normalize data from {SOURCE_TYPES.length} source types with automatic classification & encryption
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <ErrorIcon className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}. Click Refresh to try again.</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ingestion Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-600" />
              Ingest New Data
            </CardTitle>
            <CardDescription>Submit data from any of the {SOURCE_TYPES.length} supported source types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              {projectsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type} {SOURCE_DESCRIPTIONS[type] ? `— ${SOURCE_DESCRIPTIONS[type]}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File / Data Name</Label>
              <Input
                placeholder={isBioSource ? `e.g., ${sourceType.toLowerCase()}_sampling_2024.csv` : 'e.g., sentinel2_2024_bangkok.tif'}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder={isBioSource ? `Describe the bio data being ingested (e.g., strain, conditions, sampling date)...` : 'Describe the data being ingested...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Bio-specific extra fields */}
            {isBioSource && extraFields.length > 0 && (
              <div className="space-y-4">
                <Separator />
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-emerald-600" />
                  <Label className="text-sm font-semibold">
                    ข้อมูลเฉพาะทางชีวภาพ — {SOURCE_DESCRIPTIONS[sourceType] || sourceType}
                  </Label>
                </div>

                {monitoringProtocol && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <div className="flex items-center gap-1.5 font-semibold mb-1">
                      <Beaker className="h-3.5 w-3.5" />
                      แนวทางการเก็บข้อมูล (Monitoring Protocol)
                    </div>
                    <p>{monitoringProtocol}</p>
                  </div>
                )}

                {extraFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    {field.type === 'select' && field.options ? (
                      <Select
                        value={bioFields[field.key] || ''}
                        onValueChange={(v) => setBioFields({ ...bioFields, [field.key]: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={field.placeholder || 'เลือก...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder}
                        value={bioFields[field.key] || ''}
                        onChange={(e) => setBioFields({ ...bioFields, [field.key]: e.target.value })}
                        className="h-9"
                      />
                    )}
                  </div>
                ))}

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[10px] text-emerald-700">
                  <p className="font-semibold mb-0.5">📋 T-VER Data Requirements</p>
                  <p>ข้อมูลเหล่านี้จะถูกบันทึกเป็น bioMetadata พร้อม monitoring protocol สำหรับการตรวจสอบ T-VER</p>
                </div>
              </div>
            )}

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
              disabled={isSubmitting || !selectedProjectId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Ingest Data{isBioSource ? ' (with Bio Metadata)' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Source Type Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supported Source Types</CardTitle>
            <CardDescription>{SOURCE_TYPES.length} data sources for comprehensive carbon monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map((type) => {
                const count = logs.filter((l) => l.sourceType.toLowerCase() === type.toLowerCase()).length;
                const isBio = type in BIO_EXTRA_FIELDS;
                return (
                  <button
                    key={type}
                    onClick={() => setSourceType(type)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                      sourceType === type
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : isBio
                          ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium flex items-center gap-1">
                        {isBio && <FlaskConical className="h-3 w-3 text-purple-500" />}
                        {type}
                      </span>
                      {SOURCE_DESCRIPTIONS[type] && (
                        <span className="text-[10px] text-muted-foreground leading-tight">{SOURCE_DESCRIPTIONS[type]}</span>
                      )}
                      {isBio && (
                        <span className="text-[9px] text-purple-500">{BIO_EXTRA_FIELDS[type]?.length || 0} fields</span>
                      )}
                    </div>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
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
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No ingestion logs found. Submit data to create your first log.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Encrypted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const StatusIcon = statusIcons['ingested'] || CheckCircle2;
                    const isBioLog = ['methanotroph', 'synmec', 'ccu', 'bioremediation', 'waste-to-value', 'bio-digest'].includes(log.sourceType.toLowerCase());
                    return (
                      <TableRow key={log.id} className={isBioLog ? 'bg-purple-50/30' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isBioLog && <FlaskConical className="h-3 w-3 text-purple-500" />}
                            <Badge variant="secondary" className="text-[10px] h-5 capitalize">
                              {log.sourceType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {log.activityType}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.project?.name || log.projectId?.slice(0, 8) || '—'}
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
                          {log.isEncrypted ? (
                            <Lock className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-slate-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${statusColors['ingested']}`} />
                            <span className="text-xs capitalize">Ingested</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
