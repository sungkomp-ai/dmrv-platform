'use client';

import React, { useState } from 'react';
import { FileText, Download, FileBarChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function ReportingView() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState('sustainability');
  const [projectId, setProjectId] = useState('');
  const [period, setPeriod] = useState('Q4-2024');
  const [generatedReport, setGeneratedReport] = useState(false);

  const handleGenerate = () => {
    if (!projectId.trim()) {
      toast({ title: 'Validation Error', description: 'Project ID is required', variant: 'destructive' });
      return;
    }
    setGeneratedReport(true);
    toast({ title: 'Report Generated', description: `${reportType === 'sustainability' ? 'Sustainability' : 'Verification'} report for ${projectId}` });
  };

  const handleExport = () => {
    toast({ title: 'Export Started', description: 'Report is being exported as PDF' });
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reporting</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Generate sustainability reports and verification documents
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Generate Report
            </CardTitle>
            <CardDescription>Create a new report for a project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sustainability">Sustainability Report</SelectItem>
                  <SelectItem value="verification">Verification Report</SelectItem>
                  <SelectItem value="carbon">Carbon Credit Statement</SelectItem>
                  <SelectItem value="audit">Audit Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input placeholder="e.g., RICE-001" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reporting Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q4-2024">Q4 2024</SelectItem>
                  <SelectItem value="Q3-2024">Q3 2024</SelectItem>
                  <SelectItem value="Q2-2024">Q2 2024</SelectItem>
                  <SelectItem value="Q1-2024">Q1 2024</SelectItem>
                  <SelectItem value="FY-2024">Full Year 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
              <FileBarChart className="h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sustainability Report</CardTitle>
                <CardDescription>Net Carbon Balance & project summary</CardDescription>
              </div>
              {generatedReport && (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedReport ? (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-emerald-800">Sustainability Report</h3>
                      <p className="text-sm text-emerald-700">Project: {projectId} | Period: {period}</p>
                    </div>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">T-VER Compliant</Badge>
                  </div>
                </div>

                {/* Net Carbon Balance */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Net Carbon Balance</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">23,970</p>
                      <p className="text-xs text-muted-foreground">Total Reductions (tCO2e)</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-red-500">1,240</p>
                      <p className="text-xs text-muted-foreground">Total Emissions (tCO2e)</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">22,730</p>
                      <p className="text-xs text-muted-foreground">Net Balance (tCO2e)</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-teal-600">94.8%</p>
                      <p className="text-xs text-muted-foreground">Reduction Ratio</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Breakdown by Type */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Emission Reduction Breakdown</h4>
                  <div className="space-y-2">
                    {[
                      { type: 'Biochar', amount: '12,450', pct: '51.9%', method: 'IPCC 2019' },
                      { type: 'AWD', amount: '8,320', pct: '34.7%', method: 'IRRI 2023' },
                      { type: 'Solar', amount: '3,200', pct: '13.3%', method: 'TGO-EF 2024' },
                    ].map((item) => (
                      <div key={item.type} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.method}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-sm">{item.amount} tCO2e</span>
                          <span className="text-xs text-muted-foreground ml-2">({item.pct})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Certification Status */}
                <div>
                  <h4 className="font-semibold text-sm mb-3">Certification Status</h4>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-sm">T-VER Certificate: Issued (#TVER-2024-089)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-sm">Master Certificate: Issued (#MC-0456)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-sm">Verification: Passed (94.7% integrity)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileBarChart className="h-16 w-16 mb-4 text-slate-200" />
                <p className="text-sm">Generate a report to preview it here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
