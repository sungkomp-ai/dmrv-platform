'use client';

import React, { useState } from 'react';
import { FileCheck, Award, Send, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type CertStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Issued' | 'Rejected';

interface Certificate {
  id: string;
  projectId: string;
  certNumber: string;
  type: string;
  tco2e: number;
  status: CertStatus;
  issuedDate: string;
  registry: string;
}

const mockCertificates: Certificate[] = [
  { id: '1', projectId: 'RICE-001', certNumber: 'TVER-2024-089', type: 'Biochar', tco2e: 12450, status: 'Issued', issuedDate: '2024-12-10', registry: 'Thailand T-VER' },
  { id: '2', projectId: 'RICE-002', certNumber: 'TVER-2024-088', type: 'AWD', tco2e: 8320, status: 'Issued', issuedDate: '2024-12-08', registry: 'Thailand T-VER' },
  { id: '3', projectId: 'BIOG-003', certNumber: 'TVER-2024-090', type: 'Biogas', tco2e: 5600, status: 'Under Review', issuedDate: '-', registry: 'Thailand T-VER' },
  { id: '4', projectId: 'SOL-004', certNumber: 'TVER-2024-091', type: 'Solar', tco2e: 3200, status: 'Submitted', issuedDate: '-', registry: 'Thailand T-VER' },
  { id: '5', projectId: 'BLUE-005', certNumber: 'MC-0456', type: 'Blue Carbon', tco2e: 49500, status: 'Issued', issuedDate: '2024-11-28', registry: 'Master Certificate' },
  { id: '6', projectId: 'RICE-006', certNumber: 'TVER-2024-092', type: 'AWD', tco2e: 4150, status: 'Draft', issuedDate: '-', registry: 'Thailand T-VER' },
  { id: '7', projectId: 'BIOG-007', certNumber: 'TVER-2024-085', type: 'Biogas', tco2e: 2800, status: 'Rejected', issuedDate: '-', registry: 'Thailand T-VER' },
];

const statusStyles: Record<CertStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  Submitted: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'Under Review': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  Issued: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
};

export default function CertificationView() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [formProjectId, setFormProjectId] = useState('');
  const [formType, setFormType] = useState('Biochar');
  const [formTco2e, setFormTco2e] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleSubmit = () => {
    if (!formProjectId.trim() || !formTco2e.trim()) {
      toast({ title: 'Validation Error', description: 'Project ID and tCO2e are required', variant: 'destructive' });
      return;
    }
    const tco2e = parseFloat(formTco2e);
    if (isNaN(tco2e) || tco2e <= 0) {
      toast({ title: 'Invalid tCO2e', description: 'tCO2e must be a positive number', variant: 'destructive' });
      return;
    }
    const newCert: Certificate = {
      id: String(certificates.length + 1),
      projectId: formProjectId.trim(),
      certNumber: `TVER-2024-${String(93 + certificates.length).padStart(3, '0')}`,
      type: formType,
      tco2e,
      status: 'Submitted',
      issuedDate: '-',
      registry: 'Thailand T-VER',
    };
    setCertificates((prev) => [newCert, ...prev]);
    setFormProjectId('');
    setFormTco2e('');
    setFormNotes('');
    toast({ title: 'Submitted for Certification', description: `${newCert.certNumber} submitted to T-VER registry` });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Certification</h2>
        <p className="text-muted-foreground text-sm mt-1">
          T-VER certification management and Master Certificate issuance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{certificates.filter((c) => c.status === 'Issued').length}</p>
            <p className="text-xs text-muted-foreground">Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{certificates.filter((c) => c.status === 'Under Review').length}</p>
            <p className="text-xs text-muted-foreground">Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{certificates.filter((c) => c.status === 'Submitted').length}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{certificates.filter((c) => c.status === 'Issued').reduce((s, c) => s + c.tco2e, 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Certified tCO2e</p>
          </CardContent>
        </Card>
      </div>

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
              <Label>Project ID</Label>
              <Input placeholder="e.g., RICE-001" value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Credit Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Biochar', 'AWD', 'Biogas', 'Solar', 'Blue Carbon'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
            <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              <FileCheck className="h-4 w-4" />
              Submit for T-VER
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono text-xs font-semibold">{cert.certNumber}</TableCell>
                      <TableCell className="text-xs">{cert.projectId}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5">{cert.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{cert.tco2e.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[cert.status]}`}>
                          {cert.status}
                        </Badge>
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
                                  <div><span className="text-muted-foreground">Certificate:</span> <span className="font-mono font-semibold">{selectedCert.certNumber}</span></div>
                                  <div><span className="text-muted-foreground">Project:</span> {selectedCert.projectId}</div>
                                  <div><span className="text-muted-foreground">Type:</span> {selectedCert.type}</div>
                                  <div><span className="text-muted-foreground">tCO2e:</span> <span className="font-semibold text-emerald-700">{selectedCert.tco2e.toLocaleString()}</span></div>
                                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[selectedCert.status]}`}>{selectedCert.status}</Badge></div>
                                  <div><span className="text-muted-foreground">Registry:</span> {selectedCert.registry}</div>
                                  <div><span className="text-muted-foreground">Issued:</span> {selectedCert.issuedDate}</div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
