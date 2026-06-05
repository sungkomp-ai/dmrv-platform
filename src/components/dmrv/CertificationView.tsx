'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileCheck, Award, Send, Eye, RefreshCw, CheckCircle, XCircle, ArrowRight, Shield } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type CertStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

interface Certificate {
  id: string;
  certId: string;
  projectId: string;
  trackType: string;
  status: CertStatus;
  amountTco2e: number;
  masterCertId: string;
  validator: string;
  createdAt: string;
  project: { id: string; name: string; methodology: string };
}

interface Project {
  id: string;
  name: string;
  methodology: string;
}

interface CertSummary {
  total: number;
  submitted: number;
  approved: number;
  rejected: number;
  totalTco2e: number;
}

const statusStyles: Record<CertStatus, string> = {
  SUBMITTED: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  APPROVED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  REJECTED: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const statusLabels: Record<CertStatus, string> = {
  SUBMITTED: 'Submitted',
  APPROVED: 'Issued',
  REJECTED: 'Rejected',
};

const statusLabelsTgo: Record<CertStatus, string> = {
  SUBMITTED: 'ยื่นคำขอ',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ปฏิเสธ',
};

const methodologyBadges = [
  { code: 'T-VER-P-CC-001', label: 'Biochar / Climate Change', color: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  { code: 'T-VER-P-AG-001', label: 'AWD Rice / Agriculture', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  { code: 'T-VER-P-FOR-001', label: 'Forest Carbon', color: 'bg-green-100 text-green-800 hover:bg-green-100' },
];

const trackTypeOptions = ['biochar', 'awd', 'biogas', 'solar', 'forest'];

export default function CertificationView() {
  const { toast } = useToast();
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [summary, setSummary] = useState<CertSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [formProjectId, setFormProjectId] = useState('');
  const [formType, setFormType] = useState('biochar');
  const [formTco2e, setFormTco2e] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv/certification');
      if (!res.ok) throw new Error('Failed to fetch certificates');
      const data = await res.json();
      setCertificates(data.certificates || []);
      setSummary(data.summary || null);
    } catch {
      toast({ title: 'Error', description: 'Failed to load certificates', variant: 'destructive' });
    }
  }, [toast]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCertificates(), fetchProjects()]);
      setLoading(false);
    };
    init();
  }, [fetchCertificates, fetchProjects]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchCertificates();
    setLoading(false);
    toast({ title: 'Refreshed', description: 'Certificate data updated' });
  };

  const handleSubmit = async () => {
    if (!formProjectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }
    const tco2e = parseFloat(formTco2e);
    if (isNaN(tco2e) || tco2e <= 0) {
      toast({ title: 'Invalid tCO2e', description: 'tCO2e must be a positive number', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formProjectId,
          trackType: formType,
          amountTco2e: tco2e,
          action: 'submit',
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Submission failed');
      }
      const data = await res.json();
      toast({ title: 'Submitted for Certification', description: `${data.certificate?.certId || 'Certificate'} submitted to T-VER registry` });
      setFormProjectId('');
      setFormTco2e('');
      setFormNotes('');
      await fetchCertificates();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Submission failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (certId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/dmrv/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, certId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `${action} failed`);
      }
      const data = await res.json();
      toast({
        title: action === 'approve' ? 'Certificate Approved' : 'Certificate Rejected',
        description: `${certId} has been ${action === 'approve' ? 'approved' : 'rejected'}`,
        variant: action === 'approve' ? 'default' : 'destructive',
      });
      await fetchCertificates();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Action failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
          <div className="lg:col-span-2"><Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Certification</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {standardMode === 'tgo'
              ? 'การจัดการใบรับรอง T-VER และ Master Certificate'
              : 'T-VER certification management and Master Certificate issuance'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-[10px]">
            <button onClick={() => setStandardMode('tgo')} className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'tgo' ? 'bg-amber-100 text-amber-800 font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🇹🇭 TGO/T-VER</button>
            <button onClick={() => setStandardMode('international')} className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'international' ? 'bg-blue-100 text-blue-800 font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🌐 Int'l</button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary?.approved ?? 0}</p>
            <p className="text-xs text-muted-foreground">{standardMode === 'tgo' ? 'อนุมัติ' : 'Issued'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary?.submitted ?? 0}</p>
            <p className="text-xs text-muted-foreground">{standardMode === 'tgo' ? 'รอตรวจสอบ' : 'Pending'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary?.rejected ?? 0}</p>
            <p className="text-xs text-muted-foreground">{standardMode === 'tgo' ? 'ปฏิเสธ' : 'Rejected'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{(summary?.totalTco2e ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {standardMode === 'tgo' ? 'tCO₂e ที่รับรอง (T-VER)' : 'Certified tCO₂e'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* T-VER Certification Workflow Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            {standardMode === 'tgo' ? 'ขั้นตอนการรับรอง T-VER' : 'Certification Workflow'}
          </CardTitle>
          <CardDescription>
            {standardMode === 'tgo'
              ? 'กระบวนการรับรองตามแนวทาง TGO 2566 และมาตรฐาน T-VER'
              : 'International certification process reference'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {standardMode === 'tgo' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {['ยื่นคำขอ', 'ตรวจสอบเอกสาร', 'VVB ประเมิน', 'อนุมัติ/ปฏิเสธ', 'ออก Master Certificate'].map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 font-semibold text-amber-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold">{i + 1}</span>
                      {step}
                    </div>
                    {i < 4 && <ArrowRight className="h-3.5 w-3.5 text-amber-400" />}
                  </React.Fragment>
                ))}
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {methodologyBadges.map((m) => (
                  <Badge key={m.code} variant="secondary" className={`text-[10px] h-6 ${m.color}`}>
                    {m.code} — {m.label}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                อ้างอิง: TGO Guidelines 2566, มาตรฐาน T-VER | รูปแบบ Master Certificate: TVER-MC-YYYY-XXXXX
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {['Submit', 'Document Review', 'VVB Assessment', 'Approve/Reject', 'Issue Certificate'].map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 font-semibold text-blue-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold">{i + 1}</span>
                      {step}
                    </div>
                    {i < 4 && <ArrowRight className="h-3.5 w-3.5 text-blue-400" />}
                  </React.Fragment>
                ))}
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] h-6 bg-blue-100 text-blue-800 hover:bg-blue-100">Verra VCS</Badge>
                <Badge variant="secondary" className="text-[10px] h-6 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Gold Standard</Badge>
                <Badge variant="secondary" className="text-[10px] h-6 bg-purple-100 text-purple-800 hover:bg-purple-100">ISO 14064-2</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Reference: Verra VCS Standard v4.5, Gold Standard for the Global Goals, ISO 14064-2:2019
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Submit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-600" />
              Submit for Certification
            </CardTitle>
            <CardDescription>Request T-VER certification for a project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credit Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trackTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Emission Reductions (tCO2e)</Label>
              <Input type="number" placeholder="e.g., 5000" value={formTco2e} onChange={(e) => setFormTco2e(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Supporting Notes</Label>
              <Textarea placeholder="Additional information for the certifier..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              <FileCheck className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit for T-VER'}
            </Button>
          </CardContent>
        </Card>

        {/* Certificate List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              Certificates
            </CardTitle>
            <CardDescription>All T-VER and Master Certificate records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cert Number</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>tCO2e</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No certificates found. Submit one above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-mono text-xs font-semibold">{cert.certId}</TableCell>
                        <TableCell className="text-xs">{cert.project?.name || cert.projectId}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] h-5">{cert.trackType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{cert.amountTco2e.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[cert.status as CertStatus] || ''}`}>
                              {standardMode === 'tgo'
                                ? statusLabelsTgo[cert.status as CertStatus] || cert.status
                                : statusLabels[cert.status as CertStatus] || cert.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                          {cert.status === 'SUBMITTED' && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(cert.certId, 'approve')}
                                className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Approve"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(cert.certId, 'reject')}
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedCert(cert)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Certificate Details</DialogTitle>
                              </DialogHeader>
                              {selectedCert && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-muted-foreground">Certificate:</span> <span className="font-mono font-semibold">{selectedCert.certId}</span></div>
                                    <div><span className="text-muted-foreground">Project:</span> {selectedCert.project?.name || selectedCert.projectId}</div>
                                    <div><span className="text-muted-foreground">Type:</span> {selectedCert.trackType}</div>
                                    <div><span className="text-muted-foreground">{standardMode === 'tgo' ? 'tCO₂e (T-VER):' : 'tCO₂e:'}</span> <span className="font-semibold text-emerald-700">{selectedCert.amountTco2e.toLocaleString()}</span></div>
                                    <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[selectedCert.status as CertStatus] || ''}`}>{standardMode === 'tgo' ? statusLabelsTgo[selectedCert.status as CertStatus] || selectedCert.status : statusLabels[selectedCert.status as CertStatus] || selectedCert.status}</Badge></div>
                                    <div><span className="text-muted-foreground">Validator:</span> {selectedCert.validator}</div>
                                    {selectedCert.masterCertId && <div><span className="text-muted-foreground">{standardMode === 'tgo' ? 'Master Certificate (T-VER):' : 'Master Cert:'}</span> <span className="font-mono font-semibold">{selectedCert.masterCertId}</span></div>}
                                    <div><span className="text-muted-foreground">Issued:</span> {new Date(selectedCert.createdAt).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
