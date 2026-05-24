'use client';

import React, { useState } from 'react';
import { ClipboardList, Plus, Send, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

type SubmissionStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

interface Submission {
  id: string;
  projectId: string;
  formType: string;
  title: string;
  status: SubmissionStatus;
  submittedAt: string;
  submittedBy: string;
}

const mockSubmissions: Submission[] = [
  { id: '1', projectId: 'RICE-001', formType: 'Project Registration', title: 'Biochar Rice Project — Phase 1', status: 'Approved', submittedAt: '2024-12-14', submittedBy: 'Admin' },
  { id: '2', projectId: 'BIOG-003', formType: 'Monitoring Report', title: 'Q4 2024 Biogas Monitoring', status: 'Under Review', submittedAt: '2024-12-13', submittedBy: 'ProjectOwner' },
  { id: '3', projectId: 'SOL-004', formType: 'Credit Request', title: 'Solar PV Credit Batch Request', status: 'Submitted', submittedAt: '2024-12-12', submittedBy: 'ProjectOwner' },
  { id: '4', projectId: 'RICE-002', formType: 'Project Registration', title: 'AWD Rice Cultivation — Phase 2', status: 'Approved', submittedAt: '2024-12-10', submittedBy: 'Admin' },
  { id: '5', projectId: 'BLUE-005', formType: 'Verification Request', title: 'Mangrove Sequestration Verification', status: 'Rejected', submittedAt: '2024-12-08', submittedBy: 'DataProvider' },
  { id: '6', projectId: 'RICE-001', formType: 'Data Submission', title: 'Sentinel-2 Satellite Imagery Upload', status: 'Approved', submittedAt: '2024-12-06', submittedBy: 'DataProvider' },
];

const statusStyles: Record<SubmissionStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  Submitted: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  'Under Review': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  Approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
};

export default function SubmissionView() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [formProjectId, setFormProjectId] = useState('');
  const [formType, setFormType] = useState('Project Registration');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const handleSubmit = () => {
    if (!formProjectId.trim() || !formTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Project ID and title are required', variant: 'destructive' });
      return;
    }
    const newSubmission: Submission = {
      id: String(submissions.length + 1),
      projectId: formProjectId.trim(),
      formType,
      title: formTitle.trim(),
      status: 'Submitted',
      submittedAt: new Date().toISOString().split('T')[0],
      submittedBy: 'Admin',
    };
    setSubmissions((prev) => [newSubmission, ...prev]);
    setFormProjectId('');
    setFormTitle('');
    setFormDescription('');
    toast({ title: 'Submission Created', description: `${formType}: ${newSubmission.title}` });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Submission</h2>
        <p className="text-muted-foreground text-sm mt-1">Create and manage project submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {(['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'] as SubmissionStatus[]).map((status) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{submissions.filter((s) => s.status === status).length}</p>
              <p className="text-xs text-muted-foreground">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              New Submission
            </CardTitle>
            <CardDescription>Create a new form submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input placeholder="e.g., RICE-001" value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Form Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Project Registration', 'Monitoring Report', 'Credit Request', 'Verification Request', 'Data Submission'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g., Q4 2024 Biochar Monitoring" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the submission..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Send className="h-4 w-4" />
              Submit
            </Button>
          </CardContent>
        </Card>

        {/* Submission List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Submission History
            </CardTitle>
            <CardDescription>All form submissions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="text-sm font-medium">{sub.title}</TableCell>
                      <TableCell className="font-mono text-xs">{sub.projectId}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] h-5">{sub.formType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[sub.status]}`}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{sub.submittedBy}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{sub.submittedAt}</TableCell>
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
