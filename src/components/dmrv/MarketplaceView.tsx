'use client';

import React, { useState } from 'react';
import { ShoppingCart, Plus, ArrowRightLeft, Ban, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type CreditStatus = 'Available' | 'Traded' | 'Retired';

interface Credit {
  id: string;
  batchId: string;
  projectId: string;
  type: string;
  amount: number;
  price: number;
  status: CreditStatus;
  certNumber: string;
  createdAt: string;
}

const mockCredits: Credit[] = [
  { id: '1', batchId: 'CB-0456', projectId: 'RICE-001', type: 'Biochar', amount: 5000, price: 600, status: 'Available', certNumber: 'TVER-2024-089', createdAt: '2024-12-10' },
  { id: '2', batchId: 'CB-0457', projectId: 'RICE-002', type: 'AWD', amount: 3320, price: 550, status: 'Available', certNumber: 'TVER-2024-088', createdAt: '2024-12-08' },
  { id: '3', batchId: 'CB-0458', projectId: 'BLUE-005', type: 'Blue Carbon', amount: 10000, price: 750, status: 'Available', certNumber: 'MC-0456', createdAt: '2024-11-28' },
  { id: '4', batchId: 'CB-0440', projectId: 'RICE-001', type: 'Biochar', amount: 2450, price: 580, status: 'Traded', certNumber: 'TVER-2024-080', createdAt: '2024-11-15' },
  { id: '5', batchId: 'CB-0435', projectId: 'BIOG-003', type: 'Biogas', amount: 1800, price: 520, status: 'Traded', certNumber: 'TVER-2024-075', createdAt: '2024-11-01' },
  { id: '6', batchId: 'CB-0420', projectId: 'SOL-004', type: 'Solar', amount: 3200, price: 480, status: 'Retired', certNumber: 'TVER-2024-060', createdAt: '2024-10-15' },
  { id: '7', batchId: 'CB-0410', projectId: 'RICE-001', type: 'AWD', amount: 1500, price: 550, status: 'Retired', certNumber: 'TVER-2024-050', createdAt: '2024-09-20' },
];

const statusStyles: Record<CreditStatus, string> = {
  Available: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Traded: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  Retired: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
};

export default function MarketplaceView() {
  const { toast } = useToast();
  const [credits, setCredits] = useState<Credit[]>(mockCredits);
  const [mintType, setMintType] = useState('Biochar');
  const [mintAmount, setMintAmount] = useState('');
  const [mintProjectId, setMintProjectId] = useState('');
  const [tradeId, setTradeId] = useState('');
  const [retireId, setRetireId] = useState('');

  const handleMint = () => {
    const amount = parseFloat(mintAmount);
    if (!mintProjectId.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: 'Validation Error', description: 'Project ID and valid amount are required', variant: 'destructive' });
      return;
    }
    const newCredit: Credit = {
      id: String(credits.length + 1),
      batchId: `CB-${String(459 + credits.length).padStart(4, '0')}`,
      projectId: mintProjectId.trim(),
      type: mintType,
      amount,
      price: 500 + Math.floor(Math.random() * 300),
      status: 'Available',
      certNumber: `TVER-2024-${String(93 + credits.length).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCredits((prev) => [newCredit, ...prev]);
    setMintAmount('');
    setMintProjectId('');
    toast({ title: 'Credits Minted', description: `${amount.toLocaleString()} tCO2e minted as ${newCredit.batchId}` });
  };

  const handleTrade = () => {
    const credit = credits.find((c) => c.id === tradeId);
    if (!credit || credit.status !== 'Available') {
      toast({ title: 'Cannot Trade', description: 'Only available credits can be traded', variant: 'destructive' });
      return;
    }
    setCredits((prev) => prev.map((c) => (c.id === tradeId ? { ...c, status: 'Traded' as CreditStatus } : c)));
    setTradeId('');
    toast({ title: 'Credit Traded', description: `${credit.batchId} has been traded` });
  };

  const handleRetire = () => {
    const credit = credits.find((c) => c.id === retireId);
    if (!credit || credit.status === 'Retired') {
      toast({ title: 'Cannot Retire', description: 'Already retired credits cannot be retired again', variant: 'destructive' });
      return;
    }
    setCredits((prev) => prev.map((c) => (c.id === retireId ? { ...c, status: 'Retired' as CreditStatus } : c)));
    setRetireId('');
    toast({ title: 'Credit Retired', description: `${credit.batchId} has been retired` });
  };

  const available = credits.filter((c) => c.status === 'Available');
  const traded = credits.filter((c) => c.status === 'Traded');
  const retired = credits.filter((c) => c.status === 'Retired');

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Marketplace</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Mint, trade, and retire carbon credits on the marketplace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{available.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Available tCO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{traded.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Traded tCO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-500">{retired.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Retired tCO2e</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">฿{(available.reduce((s, c) => s + c.amount * c.price, 0)).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Market Value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="listing">
        <TabsList>
          <TabsTrigger value="listing">Credit Listing</TabsTrigger>
          <TabsTrigger value="mint">Mint Credits</TabsTrigger>
          <TabsTrigger value="actions">Trade / Retire</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="listing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credit Listing</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount (tCO2e)</TableHead>
                      <TableHead>Price (฿/tCO2e)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cert</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map((credit) => (
                      <TableRow key={credit.id}>
                        <TableCell className="font-mono text-xs font-semibold">{credit.batchId}</TableCell>
                        <TableCell className="text-xs">{credit.projectId}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] h-5">{credit.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{credit.amount.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">฿{credit.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${statusStyles[credit.status]}`}>
                            {credit.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{credit.certNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mint" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Mint New Credits
              </CardTitle>
              <CardDescription>Create new carbon credit batches from certified projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <Input placeholder="e.g., RICE-001" value={mintProjectId} onChange={(e) => setMintProjectId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Credit Type</Label>
                  <Select value={mintType} onValueChange={setMintType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Biochar', 'AWD', 'Biogas', 'Solar', 'Blue Carbon'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (tCO2e)</Label>
                  <Input type="number" placeholder="e.g., 5000" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleMint} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" />
                Mint Credits
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-teal-600" />
                  Trade Credits
                </CardTitle>
                <CardDescription>Transfer available credits to a buyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Credit</Label>
                  <Select value={tradeId} onValueChange={setTradeId}>
                    <SelectTrigger><SelectValue placeholder="Select a credit batch" /></SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.batchId} — {c.amount.toLocaleString()} tCO2e ({c.projectId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleTrade} className="w-full bg-teal-600 hover:bg-teal-700 gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Execute Trade
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4 text-slate-600" />
                  Retire Credits
                </CardTitle>
                <CardDescription>Permanently retire credits from circulation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Credit</Label>
                  <Select value={retireId} onValueChange={setRetireId}>
                    <SelectTrigger><SelectValue placeholder="Select a credit batch" /></SelectTrigger>
                    <SelectContent>
                      {credits.filter((c) => c.status !== 'Retired').map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.batchId} — {c.amount.toLocaleString()} tCO2e ({c.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleRetire} variant="destructive" className="w-full gap-2">
                  <Ban className="h-4 w-4" />
                  Retire Credits
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                Portfolio Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{available.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Available tCO2e</p>
                  <p className="text-xs text-muted-foreground">{available.length} batches</p>
                </div>
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-3xl font-bold text-teal-600">{traded.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Traded tCO2e</p>
                  <p className="text-xs text-muted-foreground">{traded.length} batches</p>
                </div>
                <div className="rounded-lg border p-6 text-center">
                  <p className="text-3xl font-bold text-slate-500">{retired.reduce((s, c) => s + c.amount, 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Retired tCO2e</p>
                  <p className="text-xs text-muted-foreground">{retired.length} batches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
