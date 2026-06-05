'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Plus,
  Filter,
  FileText,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Eye,
  Users,
  Building2,
  Search,
  Globe,
  Flag,
  AlertTriangle,
  Calendar,
  ArrowRight,
  CircleDot,
  CircleCheck,
  CircleX,
  Info,
  TrendingUp,
  BookOpen,
  ArrowUpRight,
  ListChecks,
  Undo2,
  UserCheck,
  MapPin,
  Briefcase,
  Hash,
  Save,
  Download,
  ExternalLink,
  History,
  ClipboardList,
  Target,
  Award,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'REQUESTED_INFO';
type ReviewType = 'VALIDATION' | 'VERIFICATION' | 'PERIODIC_VERIFICATION';
type Recommendation = 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'PENDING';
type StandardMode = 'TGO' | 'INTERNATIONAL';

interface EvidenceRef {
  id: string;
  name: string;
  type: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  submittedAt: string;
}

interface Finding {
  completeness: number;
  accuracy: number;
  consistency: number;
  materialMisstatement?: boolean;
  nonConformities?: string[];
}

interface CorrectiveAction {
  id: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  dueDate: string;
  assignee: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

interface Review {
  id: string;
  projectId?: string;
  reviewerOrg: string;
  reviewerName: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  projectName: string;
  projectProvince: string;
  evidenceCount: number;
  evidenceRefs: EvidenceRef[];
  findings: Finding;
  recommendation: Recommendation;
  createdAt: string;
  updatedAt: string;
  comments: string;
  methodology?: string;
  priority?: string;
  deadline?: string;
  correctiveActions?: CorrectiveAction[];
  auditLog?: AuditLogEntry[];
}

interface VVBSummary {
  byStatus: Record<ReviewStatus, number>;
  byReviewType: Record<ReviewType, number>;
  total: number;
}

interface VVBData {
  reviews: Review[];
  summary: VVBSummary;
  avgFindingsByType?: Array<{ reviewType: string; completeness: number; accuracy: number; consistency: number }>;
  reviewsByMonth?: Array<{ month: string; count: number }>;
}

const CURRENT_USER_ORG = 'Bureau Veritas';

const statusColors: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  APPROVED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  REJECTED: 'bg-red-100 text-red-700 hover:bg-red-100',
  REQUESTED_INFO: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

const statusIcons: Record<ReviewStatus, React.ElementType> = {
  PENDING: Clock,
  IN_PROGRESS: Eye,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  REQUESTED_INFO: AlertCircle,
};

const reviewTypeColors: Record<ReviewType, string> = {
  VALIDATION: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  VERIFICATION: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  PERIODIC_VERIFICATION: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
};

const recommendationColors: Record<Recommendation, string> = {
  APPROVE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  REJECT: 'bg-red-100 text-red-700 hover:bg-red-100',
  REQUEST_INFO: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  PENDING: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const correctiveActionColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

// T-VER Thai terminology
const THAI_TERMS: Record<string, string> = {
  VALIDATION: 'การตรวจสอบ',
  VERIFICATION: 'การรับรอง',
  PERIODIC_VERIFICATION: 'การยืนยันระยะ',
  PENDING: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ไม่อนุมัติ',
  REQUESTED_INFO: 'ขอข้อมูลเพิ่มเติม',
};

// VVB review workflow stages
const WORKFLOW_STAGES = [
  { key: 'submission', label: 'Submission', labelTh: 'การยื่น' },
  { key: 'assignment', label: 'Assignment', labelTh: 'การมอบหมาย' },
  { key: 'document_review', label: 'Document Review', labelTh: 'ตรวจสอบเอกสาร' },
  { key: 'site_visit', label: 'Site Visit', labelTh: 'ลงพื้นที่' },
  { key: 'findings', label: 'Findings', labelTh: 'ผลการตรวจ' },
  { key: 'recommendation', label: 'Recommendation', labelTh: 'ข้อเสนอแนะ' },
  { key: 'decision', label: 'Decision', labelTh: 'การตัดสิน' },
];

// T-VER Compliance Checklist
const TVER_COMPLIANCE_ITEMS = [
  { id: 'TC-01', category: 'Project Design', item: 'Project boundary clearly defined per T-VER-P-CC-001', itemTh: 'ขอบเขตโครงการกำหนดชัดเจนตาม T-VER-P-CC-001' },
  { id: 'TC-02', category: 'Project Design', item: 'Baseline scenario properly identified', itemTh: 'สถานการณ์ฐานระบุอย่างเหมาะสม' },
  { id: 'TC-03', category: 'Additionality', item: 'Additionality demonstration compliant', itemTh: 'การแสดงความเป็นเพิ่มเป็นไปตามข้อกำหนด' },
  { id: 'TC-04', category: 'Additionality', item: 'Barrier analysis completed', itemTh: 'การวิเคราะห์อุปสรรคเสร็จสมบูรณ์' },
  { id: 'TC-05', category: 'Monitoring', item: 'Monitoring plan follows approved methodology', itemTh: 'แผนติดตามตามระเบียบวิธีที่ได้รับอนุมัติ' },
  { id: 'TC-06', category: 'Monitoring', item: 'Data collection procedures documented', itemTh: 'กระบวนการเก็บรวบรวมข้อมูลมีเอกสาร' },
  { id: 'TC-07', category: 'Emissions', item: 'Emission factor appropriate and justified', itemTh: 'ค่าปัจจัยการปล่อยเหมาะสมและมีเหตุผล' },
  { id: 'TC-08', category: 'Emissions', item: 'Leakage assessment completed', itemTh: 'การประเมินการรั่วไหลเสร็จสมบูรณ์' },
  { id: 'TC-09', category: 'Stakeholder', item: 'Stakeholder consultation conducted', itemTh: 'การประชุมผู้มีส่วนได้ส่วนเสียดำเนินการแล้ว' },
  { id: 'TC-10', category: 'Stakeholder', item: 'Environmental impact assessment approved', itemTh: 'การประเมินผลกระทบสิ่งแวดล้อมได้รับอนุมัติ' },
  { id: 'TC-11', category: 'Documentation', item: 'Project Design Document (PDD) complete', itemTh: 'เอกสารออกแบบโครงการ (PDD) สมบูรณ์' },
  { id: 'TC-12', category: 'Documentation', item: 'All required annexes attached', itemTh: 'เอกสารแนบที่จำเป็นครบถ้วน' },
];

// VVB Organization directory
const VVB_ORGS = [
  { name: 'Bureau Veritas', country: 'France/Thailand', accreditation: 'TGO, ISO 14065, VVB-T-VER', activeReviews: 8, completedReviews: 45, rating: 96, specialties: ['Energy', 'Forestry', 'Waste'] },
  { name: 'SGS Thailand', country: 'Switzerland/Thailand', accreditation: 'TGO, ISO 14065, VVB-T-VER, CDM-DOE', activeReviews: 6, completedReviews: 52, rating: 98, specialties: ['Renewable Energy', 'Industry', 'Transport'] },
  { name: 'TUV Nord', country: 'Germany', accreditation: 'UNFCCC, ISO 14065, VVB-VCS', activeReviews: 4, completedReviews: 38, rating: 94, specialties: ['Industrial', 'Methane', 'Energy'] },
  { name: 'DNV GL', country: 'Norway', accreditation: 'ISO 14065, VVB-VCS, CDM-DOE', activeReviews: 3, completedReviews: 30, rating: 92, specialties: ['Maritime', 'Energy', 'Carbon Capture'] },
  { name: "Lloyd's Register", country: 'UK', accreditation: 'ISO 14065, VVB-GS, UNFCCC', activeReviews: 2, completedReviews: 22, rating: 90, specialties: ['Blue Carbon', 'Forestry', 'Agriculture'] },
];

function getWorkflowStage(status: ReviewStatus): number {
  switch (status) {
    case 'PENDING': return 1;
    case 'IN_PROGRESS': return 3;
    case 'REQUESTED_INFO': return 5;
    case 'APPROVED': return 7;
    case 'REJECTED': return 7;
    default: return 0;
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MOCK_DATA: VVBData = {
  reviews: [
    {
      id: 'VVB-001',
      projectId: 'PRJ-001',
      reviewerOrg: 'Bureau Veritas',
      reviewerName: 'Dr. Somchai P.',
      reviewType: 'VALIDATION',
      status: 'PENDING',
      projectName: 'Rice AWD Chiang Rai',
      projectProvince: 'เชียงราย',
      evidenceCount: 8,
      evidenceRefs: [
        { id: 'EV-001', name: 'Baseline Emission Report', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-20T10:00:00Z' },
        { id: 'EV-002', name: 'AWD Implementation Log', type: 'SPREADSHEET', status: 'PENDING', submittedAt: '2025-05-21T14:00:00Z' },
        { id: 'EV-003', name: 'Satellite Imagery Analysis', type: 'IMAGE', status: 'VERIFIED', submittedAt: '2025-05-22T09:00:00Z' },
        { id: 'EV-004', name: 'Field Measurement Data', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-22T16:00:00Z' },
        { id: 'EV-005', name: 'Stakeholder Consultation Report', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-23T11:00:00Z' },
        { id: 'EV-006', name: 'Environmental Impact Assessment', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-23T15:00:00Z' },
        { id: 'EV-007', name: 'Water Management Plan', type: 'PDF', status: 'REJECTED', submittedAt: '2025-05-24T08:00:00Z' },
        { id: 'EV-008', name: 'GPS Boundary Coordinates', type: 'GEOJSON', status: 'VERIFIED', submittedAt: '2025-05-24T12:00:00Z' },
      ],
      findings: { completeness: 82, accuracy: 75, consistency: 88, materialMisstatement: false, nonConformities: [] },
      recommendation: 'PENDING',
      createdAt: '2025-05-20T08:00:00Z',
      updatedAt: '2025-05-24T12:00:00Z',
      comments: '',
      methodology: 'T-VER',
      priority: 'HIGH',
      deadline: '2025-07-01',
      correctiveActions: [
        { id: 'CA-001', description: 'Resubmit Water Management Plan with corrected discharge data', status: 'OPEN', dueDate: '2025-06-15', assignee: 'Project Developer' },
        { id: 'CA-002', description: 'Provide AWD implementation log for Q1 2025', status: 'IN_PROGRESS', dueDate: '2025-06-10', assignee: 'Field Team' },
      ],
      auditLog: [
        { id: 'AL-001', action: 'Review Created', user: 'System', timestamp: '2025-05-20T08:00:00Z', details: 'Review created from submission PRJ-001' },
        { id: 'AL-002', action: 'Assigned to Bureau Veritas', user: 'TGO Admin', timestamp: '2025-05-20T09:30:00Z', details: 'Dr. Somchai P. assigned as lead reviewer' },
        { id: 'AL-003', action: 'Document Review Started', user: 'Dr. Somchai P.', timestamp: '2025-05-21T10:00:00Z', details: 'Initial document review commenced' },
        { id: 'AL-004', action: 'Evidence Rejected', user: 'Dr. Somchai P.', timestamp: '2025-05-24T08:30:00Z', details: 'EV-007 Water Management Plan rejected — incorrect discharge parameters' },
      ],
    },
    {
      id: 'VVB-002',
      projectId: 'PRJ-002',
      reviewerOrg: 'SGS Thailand',
      reviewerName: 'Ms. Apinya K.',
      reviewType: 'VERIFICATION',
      status: 'IN_PROGRESS',
      projectName: 'Solar Farm Ubon Ratchathani',
      projectProvince: 'อุบลราชธานี',
      evidenceCount: 12,
      evidenceRefs: [
        { id: 'EV-010', name: 'Electricity Generation Records', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-18T10:00:00Z' },
        { id: 'EV-011', name: 'Grid Emission Factor Data', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-18T14:00:00Z' },
        { id: 'EV-012', name: 'Meter Reading Logs', type: 'SPREADSHEET', status: 'VERIFIED', submittedAt: '2025-05-19T09:00:00Z' },
        { id: 'EV-013', name: 'Maintenance Records', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-19T16:00:00Z' },
      ],
      findings: { completeness: 91, accuracy: 88, consistency: 85, materialMisstatement: false, nonConformities: [] },
      recommendation: 'APPROVE',
      createdAt: '2025-05-18T08:00:00Z',
      updatedAt: '2025-05-25T10:00:00Z',
      comments: 'Strong evidence package. Minor clarification needed on meter calibration records.',
      methodology: 'IPCC-2023',
      priority: 'MEDIUM',
      deadline: '2025-08-15',
      correctiveActions: [],
      auditLog: [
        { id: 'AL-010', action: 'Review Created', user: 'System', timestamp: '2025-05-18T08:00:00Z', details: 'Verification review created' },
        { id: 'AL-011', action: 'Assigned to SGS Thailand', user: 'TGO Admin', timestamp: '2025-05-18T09:00:00Z', details: 'Ms. Apinya K. assigned as lead verifier' },
        { id: 'AL-012', action: 'Site Visit Scheduled', user: 'Ms. Apinya K.', timestamp: '2025-05-20T14:00:00Z', details: 'Physical site visit scheduled for 2025-06-05' },
      ],
    },
    {
      id: 'VVB-003',
      projectId: 'PRJ-003',
      reviewerOrg: 'TUV Nord',
      reviewerName: 'Dr. Heinrich M.',
      reviewType: 'PERIODIC_VERIFICATION',
      status: 'APPROVED',
      projectName: 'Biogas Nakhon Pathom',
      projectProvince: 'นครปฐม',
      evidenceCount: 15,
      evidenceRefs: [
        { id: 'EV-020', name: 'Annual Monitoring Report', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-10T10:00:00Z' },
        { id: 'EV-021', name: 'CH4 Capture Records', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-10T14:00:00Z' },
        { id: 'EV-022', name: 'Leakage Test Results', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-11T09:00:00Z' },
      ],
      findings: { completeness: 96, accuracy: 94, consistency: 92, materialMisstatement: false, nonConformities: [] },
      recommendation: 'APPROVE',
      createdAt: '2025-05-10T08:00:00Z',
      updatedAt: '2025-05-23T16:00:00Z',
      comments: 'All monitoring parameters within acceptable ranges. Approved for crediting period continuation.',
      methodology: 'T-VER',
      priority: 'LOW',
      correctiveActions: [],
      auditLog: [
        { id: 'AL-020', action: 'Review Created', user: 'System', timestamp: '2025-05-10T08:00:00Z', details: 'Periodic verification review created' },
        { id: 'AL-021', action: 'Approved', user: 'Dr. Heinrich M.', timestamp: '2025-05-23T16:00:00Z', details: 'All parameters satisfactory. Recommendation: APPROVE' },
      ],
    },
    {
      id: 'VVB-004',
      projectId: 'PRJ-004',
      reviewerOrg: 'Bureau Veritas',
      reviewerName: 'Mr. Tanawat S.',
      reviewType: 'VALIDATION',
      status: 'REJECTED',
      projectName: 'Blue Carbon Phang Nga',
      projectProvince: 'พังงา',
      evidenceCount: 5,
      evidenceRefs: [
        { id: 'EV-030', name: 'Mangrove Area Assessment', type: 'GEOJSON', status: 'REJECTED', submittedAt: '2025-05-15T10:00:00Z' },
        { id: 'EV-031', name: 'Sequestration Rate Study', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-15T14:00:00Z' },
      ],
      findings: { completeness: 45, accuracy: 52, consistency: 38, materialMisstatement: true, nonConformities: ['Baseline methodology not followed per T-VER-P-CC-001', 'Mangrove boundary delineation insufficient'] },
      recommendation: 'REJECT',
      createdAt: '2025-05-15T08:00:00Z',
      updatedAt: '2025-05-22T11:00:00Z',
      comments: 'Insufficient evidence for mangrove boundary delineation. Sequestration rates not aligned with T-VER methodology.',
      methodology: 'T-VER',
      priority: 'CRITICAL',
      correctiveActions: [
        { id: 'CA-010', description: 'Redo mangrove boundary delineation using T-VER approved methodology', status: 'OPEN', dueDate: '2025-07-15', assignee: 'Project Developer' },
        { id: 'CA-011', description: 'Update sequestration rate calculations per T-VER-P-CC-001 guidelines', status: 'OPEN', dueDate: '2025-07-15', assignee: 'Technical Team' },
        { id: 'CA-012', description: 'Provide additional GPS survey data for mangrove area', status: 'OPEN', dueDate: '2025-06-30', assignee: 'Field Survey Team' },
      ],
      auditLog: [
        { id: 'AL-030', action: 'Review Created', user: 'System', timestamp: '2025-05-15T08:00:00Z', details: 'Validation review created' },
        { id: 'AL-031', action: 'Material Misstatement Identified', user: 'Mr. Tanawat S.', timestamp: '2025-05-18T14:00:00Z', details: 'Significant discrepancies found in boundary delineation' },
        { id: 'AL-032', action: 'Rejected', user: 'Mr. Tanawat S.', timestamp: '2025-05-22T11:00:00Z', details: 'Review rejected due to material misstatement and non-conformities' },
      ],
    },
    {
      id: 'VVB-005',
      projectId: 'PRJ-005',
      reviewerOrg: 'SGS Thailand',
      reviewerName: 'Ms. Ploypailin R.',
      reviewType: 'VERIFICATION',
      status: 'REQUESTED_INFO',
      projectName: 'Biochar Chachoengsao',
      projectProvince: 'ฉะเชิงเทรา',
      evidenceCount: 10,
      evidenceRefs: [
        { id: 'EV-040', name: 'Production Batch Records', type: 'SPREADSHEET', status: 'VERIFIED', submittedAt: '2025-05-12T10:00:00Z' },
        { id: 'EV-041', name: 'Carbon Content Lab Results', type: 'PDF', status: 'VERIFIED', submittedAt: '2025-05-12T14:00:00Z' },
        { id: 'EV-042', name: 'Feedstock Source Documentation', type: 'PDF', status: 'PENDING', submittedAt: '2025-05-13T09:00:00Z' },
      ],
      findings: { completeness: 72, accuracy: 80, consistency: 68, materialMisstatement: false, nonConformities: ['Missing baseline data for Q2 2024', 'Incomplete monitoring records for pyrolysis unit'] },
      recommendation: 'REQUEST_INFO',
      createdAt: '2025-05-12T08:00:00Z',
      updatedAt: '2025-05-24T14:00:00Z',
      comments: 'Need additional information on feedstock sourcing and pyrolysis temperature records.',
      methodology: 'Verra VCS',
      priority: 'HIGH',
      deadline: '2025-06-30',
      correctiveActions: [
        { id: 'CA-020', description: 'Provide complete baseline data for Q2 2024', status: 'OPEN', dueDate: '2025-06-20', assignee: 'Project Developer' },
        { id: 'CA-021', description: 'Submit missing monitoring records for pyrolysis unit operations', status: 'IN_PROGRESS', dueDate: '2025-06-15', assignee: 'Operations Team' },
      ],
      auditLog: [
        { id: 'AL-040', action: 'Review Created', user: 'System', timestamp: '2025-05-12T08:00:00Z', details: 'Verification review created' },
        { id: 'AL-041', action: 'Information Requested', user: 'Ms. Ploypailin R.', timestamp: '2025-05-24T14:00:00Z', details: 'Additional evidence required for feedstock sourcing and pyrolysis operations' },
      ],
    },
    {
      id: 'VVB-006',
      projectId: 'PRJ-006',
      reviewerOrg: 'TUV Nord',
      reviewerName: 'Dr. Heinrich M.',
      reviewType: 'PERIODIC_VERIFICATION',
      status: 'PENDING',
      projectName: 'Reforestation Kanchanaburi',
      projectProvince: 'กาญจนบุรี',
      evidenceCount: 9,
      evidenceRefs: [
        { id: 'EV-050', name: 'Tree Growth Measurements', type: 'CSV', status: 'VERIFIED', submittedAt: '2025-05-19T10:00:00Z' },
        { id: 'EV-051', name: 'Remote Sensing Data', type: 'IMAGE', status: 'PENDING', submittedAt: '2025-05-19T14:00:00Z' },
      ],
      findings: { completeness: 78, accuracy: 70, consistency: 82, materialMisstatement: false, nonConformities: [] },
      recommendation: 'PENDING',
      createdAt: '2025-05-19T08:00:00Z',
      updatedAt: '2025-05-25T08:00:00Z',
      comments: '',
      methodology: 'Gold Standard',
      priority: 'MEDIUM',
      correctiveActions: [],
      auditLog: [
        { id: 'AL-050', action: 'Review Created', user: 'System', timestamp: '2025-05-19T08:00:00Z', details: 'Periodic verification review created' },
      ],
    },
  ],
  summary: {
    byStatus: {
      PENDING: 2,
      IN_PROGRESS: 1,
      APPROVED: 1,
      REJECTED: 1,
      REQUESTED_INFO: 1,
    },
    byReviewType: {
      VALIDATION: 2,
      VERIFICATION: 2,
      PERIODIC_VERIFICATION: 2,
    },
    total: 6,
  },
  avgFindingsByType: [
    { reviewType: 'Validation', completeness: 64, accuracy: 64, consistency: 63 },
    { reviewType: 'Verification', completeness: 82, accuracy: 84, consistency: 77 },
    { reviewType: 'Periodic', completeness: 87, accuracy: 82, consistency: 87 },
  ],
  reviewsByMonth: [
    { month: 'Jan', count: 2 },
    { month: 'Feb', count: 3 },
    { month: 'Mar', count: 1 },
    { month: 'Apr', count: 4 },
    { month: 'May', count: 6 },
    { month: 'Jun', count: 3 },
  ],
};

const PROJECTS = [
  'Rice AWD Chiang Rai',
  'Solar Farm Ubon Ratchathani',
  'Biogas Nakhon Pathom',
  'Blue Carbon Phang Nga',
  'Biochar Chachoengsao',
  'Reforestation Kanchanaburi',
  'Wind Farm Nakhon Si Thammarat',
  'Methane Capture Rayong',
];

const REVIEWER_ORGS = ['Bureau Veritas', 'SGS Thailand', 'TUV Nord', 'DNV GL', "Lloyd's Register"];

export default function VVBWorkspaceView() {
  const { toast } = useToast();
  const [data, setData] = useState<VVBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterOrg, setFilterOrg] = useState<string>('ALL');
  const [reviewerComment, setReviewerComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [standardMode, setStandardMode] = useState<StandardMode>('TGO');
  const [detailTab, setDetailTab] = useState('overview');

  // Create form state
  const [newProject, setNewProject] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newType, setNewType] = useState<ReviewType>('VALIDATION');
  const [newReviewer, setNewReviewer] = useState('');
  const [newMethodology, setNewMethodology] = useState('T-VER');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newDeadline, setNewDeadline] = useState('');

  // Evidence action state
  const [evidenceActionLoading, setEvidenceActionLoading] = useState<string | null>(null);

  // Compliance checklist state
  const [complianceChecks, setComplianceChecks] = useState<Record<string, 'PASS' | 'FAIL' | 'N/A' | 'PENDING'>>({});

  const isTGO = standardMode === 'TGO';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dmrv/vvb');
      if (!res.ok) throw new Error('Failed to fetch VVB data');
      const json = await res.json();

      const reviews: Review[] = (json.reviews || []).map((r: Record<string, unknown>) => {
        let parsedFindings: Finding = { completeness: 0, accuracy: 0, consistency: 0 };
        let rawMethodology = '';
        let rawPriority = 'MEDIUM';
        let rawDeadline = '';
        try {
          const raw = typeof r.findings === 'string' ? JSON.parse(r.findings as string) : r.findings as Record<string, unknown>;
          parsedFindings = {
            completeness: Math.round(((raw.completeness as number) || 0) * 10) / 10,
            accuracy: Math.round(((raw.accuracy as number) || 0) * 10) / 10,
            consistency: Math.round(((raw.consistency as number) || 0) * 10) / 10,
            materialMisstatement: (raw.materialMisstatement as boolean) || false,
            nonConformities: (raw.nonConformities as string[]) || [],
          };
          rawMethodology = (raw.methodology as string) || '';
          rawPriority = (raw.priority as string) || 'MEDIUM';
          rawDeadline = (raw.deadline as string) || '';
        } catch { /* keep defaults */ }

        let parsedEvidence: EvidenceRef[] = [];
        try {
          const rawEv = typeof r.evidenceRefs === 'string' ? JSON.parse(r.evidenceRefs as string) : r.evidenceRefs;
          if (Array.isArray(rawEv)) {
            parsedEvidence = (rawEv as Record<string, unknown>[]).map((ev, idx) => ({
              id: String(ev.refId || ev.id || `EV-${idx + 1}`),
              name: String(ev.description || ev.name || 'Evidence Document'),
              type: String(ev.type || 'PDF'),
              status: (ev.status as EvidenceRef['status']) || 'PENDING',
              submittedAt: String(ev.submittedAt || r.createdAt || new Date().toISOString()),
            }));
          }
        } catch { /* keep defaults */ }

        const projectData = r.project as Record<string, unknown> | null;

        // Generate corrective actions and audit log from mock for API data
        const reviewId = r.id as string;
        const mockReview = MOCK_DATA.reviews.find(m => m.id === reviewId);

        return {
          id: reviewId,
          projectId: r.projectId as string,
          reviewerOrg: (r.reviewerOrg as string) || '',
          reviewerName: (r.reviewerName as string) || '',
          reviewType: (r.reviewType as ReviewType) || 'VALIDATION',
          status: (r.status as ReviewStatus) || 'PENDING',
          projectName: (projectData?.name as string) || (r.projectName as string) || '',
          projectProvince: (projectData?.province as string) || (r.projectProvince as string) || '',
          evidenceCount: parsedEvidence.length,
          evidenceRefs: parsedEvidence,
          findings: parsedFindings,
          recommendation: ((r.recommendation as string)?.toUpperCase()?.replace('REQUEST_MORE_INFO', 'REQUEST_INFO') || 'PENDING') as Recommendation,
          createdAt: (r.createdAt as string) || new Date().toISOString(),
          updatedAt: (r.updatedAt as string) || new Date().toISOString(),
          comments: (r.comments as string) || '',
          methodology: rawMethodology || (r.methodology as string) || 'T-VER',
          priority: rawPriority || (r.priority as string) || 'MEDIUM',
          deadline: rawDeadline || (r.deadline as string) || '',
          correctiveActions: mockReview?.correctiveActions || [],
          auditLog: mockReview?.auditLog || [
            { id: `${reviewId}-AL-1`, action: 'Review Created', user: 'System', timestamp: (r.createdAt as string) || new Date().toISOString(), details: 'Review created and assigned' },
          ],
        };
      });

      const summary = json.summary || MOCK_DATA.summary;
      const avgFindingsByType = computeAvgFindingsByType(reviews);
      const reviewsByMonth = json.reviewsByMonth || MOCK_DATA.reviewsByMonth || [];

      setData({ reviews, summary, avgFindingsByType, reviewsByMonth });
    } catch {
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function computeAvgFindingsByType(reviews: Review[]) {
    const groups: Record<string, { c: number[]; a: number[]; co: number[] }> = {};
    for (const r of reviews) {
      const key = r.reviewType === 'PERIODIC_VERIFICATION' ? 'Periodic' : r.reviewType.charAt(0) + r.reviewType.slice(1).toLowerCase();
      if (!groups[key]) groups[key] = { c: [], a: [], co: [] };
      groups[key].c.push(r.findings.completeness);
      groups[key].a.push(r.findings.accuracy);
      groups[key].co.push(r.findings.consistency);
    }
    return Object.entries(groups).map(([reviewType, vals]) => ({
      reviewType,
      completeness: Math.round(vals.c.reduce((a, b) => a + b, 0) / vals.c.length),
      accuracy: Math.round(vals.a.reduce((a, b) => a + b, 0) / vals.a.length),
      consistency: Math.round(vals.co.reduce((a, b) => a + b, 0) / vals.co.length),
    }));
  }

  const handleRefresh = async () => {
    await fetchData();
    toast({ title: 'Refreshed', description: 'VVB workspace data updated' });
  };

  const handleReviewClick = (review: Review) => {
    setSelectedReview(review);
    setReviewerComment(review.comments);
    setViewMode('detail');
    setDetailTab('overview');
    // Initialize compliance checks
    const initChecks: Record<string, 'PASS' | 'FAIL' | 'N/A' | 'PENDING'> = {};
    TVER_COMPLIANCE_ITEMS.forEach(item => {
      initChecks[item.id] = review.status === 'APPROVED' ? 'PASS' : review.status === 'REJECTED' ? 'FAIL' : 'PENDING';
    });
    setComplianceChecks(initChecks);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedReview(null);
  };

  const handleRecommendation = async (recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    if (!selectedReview) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dmrv/vvb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          reviewId: selectedReview.id,
          projectId: selectedReview.projectId,
          status: recommendation === 'APPROVE' ? 'APPROVED' : recommendation === 'REJECT' ? 'REJECTED' : 'REQUESTED_INFO',
          recommendation: recommendation.toLowerCase(),
          comments: reviewerComment,
        }),
      });
      if (res.ok) {
        toast({ title: 'Recommendation submitted', description: `Review ${recommendation.toLowerCase()}ed successfully` });
        setReviewerComment('');
        fetchData();
        handleBackToList();
      } else {
        toast({ title: 'Error', description: 'Failed to submit recommendation', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvidenceAction = (evId: string, action: 'VERIFIED' | 'REJECTED') => {
    setEvidenceActionLoading(evId);
    setTimeout(() => {
      if (selectedReview) {
        const updatedRefs = selectedReview.evidenceRefs.map((ev) =>
          ev.id === evId ? { ...ev, status: action as 'VERIFIED' | 'REJECTED' } : ev
        );
        setSelectedReview({ ...selectedReview, evidenceRefs: updatedRefs });
      }
      setEvidenceActionLoading(null);
      toast({ title: `Evidence ${action.toLowerCase()}`, description: `${evId} has been ${action.toLowerCase()}` });
    }, 500);
  };

  const handleCreateReview = async () => {
    if (!newProject || !newOrg || !newType || !newReviewer) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const findingsObj: Record<string, unknown> = {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        methodology: newMethodology,
        priority: newPriority,
      };
      if (newDeadline) findingsObj.deadline = newDeadline;

      const res = await fetch('/api/dmrv/vvb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: newProject,
          reviewerOrg: newOrg,
          reviewerName: newReviewer,
          reviewType: newType,
          status: 'PENDING',
          findings: JSON.stringify(findingsObj),
        }),
      });
      if (res.ok) {
        toast({ title: 'Review created', description: 'New VVB review has been created' });
        setCreateOpen(false);
        setNewProject('');
        setNewOrg('');
        setNewReviewer('');
        setNewType('VALIDATION');
        setNewMethodology('T-VER');
        setNewPriority('MEDIUM');
        setNewDeadline('');
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to create review', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReviews = React.useMemo(() => {
    if (!data) return [];
    let reviews = data.reviews;

    if (activeTab === 'pending') {
      reviews = reviews.filter((r) => r.status === 'PENDING');
    } else if (activeTab === 'my') {
      reviews = reviews.filter((r) => r.reviewerOrg === CURRENT_USER_ORG);
    }

    if (filterStatus !== 'ALL') {
      reviews = reviews.filter((r) => r.status === filterStatus);
    }
    if (filterType !== 'ALL') {
      reviews = reviews.filter((r) => r.reviewType === filterType);
    }
    if (filterOrg !== 'ALL') {
      reviews = reviews.filter((r) => r.reviewerOrg === filterOrg);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      reviews = reviews.filter(
        (r) =>
          r.projectName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.reviewerName.toLowerCase().includes(q) ||
          r.reviewerOrg.toLowerCase().includes(q)
      );
    }

    return reviews;
  }, [data, activeTab, filterStatus, filterType, filterOrg, searchQuery]);

  const getFindingsChartData = (findings: Finding) => [
    { subject: 'Completeness', value: findings.completeness, fullMark: 100 },
    { subject: 'Accuracy', value: findings.accuracy, fullMark: 100 },
    { subject: 'Consistency', value: findings.consistency, fullMark: 100 },
  ];

  const getFindingsBarData = (findings: Finding) => [
    { name: 'Completeness', score: findings.completeness },
    { name: 'Accuracy', score: findings.accuracy },
    { name: 'Consistency', score: findings.consistency },
  ];

  const scoreBarColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-emerald-500';
    if (score >= 60) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  const evidenceStatusColor = (status: string) => {
    if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700 hover:bg-red-100';
    return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  };

  const statusPieData = React.useMemo(() => {
    if (!data) return [];
    const s = data.summary.byStatus;
    return [
      { name: 'Pending', value: s.PENDING || 0 },
      { name: 'In Progress', value: s.IN_PROGRESS || 0 },
      { name: 'Approved', value: s.APPROVED || 0 },
      { name: 'Rejected', value: s.REJECTED || 0 },
      { name: 'Requested Info', value: s.REQUESTED_INFO || 0 },
    ].filter((d) => d.value > 0);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Failed to load VVB data.{' '}
            <Button variant="link" className="h-auto p-0 text-red-700 underline" onClick={handleRefresh}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || MOCK_DATA.summary;
  const avgFindings = data?.avgFindingsByType || MOCK_DATA.avgFindingsByType || [];
  const reviewsByMonth = data?.reviewsByMonth || MOCK_DATA.reviewsByMonth || [];

  // ──── FULL-PAGE DETAIL VIEW ────
  if (viewMode === 'detail' && selectedReview) {
    const review = selectedReview;
    const StatusIcon = statusIcons[review.status];
    const totalOpenCAs = (review.correctiveActions || []).filter(ca => ca.status !== 'RESOLVED').length;
    const verifiedEvidence = review.evidenceRefs.filter(ev => ev.status === 'VERIFIED').length;
    const totalEvidence = review.evidenceRefs.length;
    const compliancePassCount = Object.values(complianceChecks).filter(v => v === 'PASS').length;
    const complianceTotal = TVER_COMPLIANCE_ITEMS.length;

    return (
      <div className="space-y-6">
        {/* Back Navigation Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            {isTGO ? 'กลับไปรายการ' : 'Back to List'}
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-lg">{review.id}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* Dual Standard Toggle */}
            <div className="flex items-center rounded-lg border bg-slate-50 p-0.5">
              <Button
                size="sm"
                variant={isTGO ? 'default' : 'ghost'}
                className={`h-7 text-xs gap-1 ${isTGO ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={() => setStandardMode('TGO')}
              >
                🇹🇭 TGO/T-VER
              </Button>
              <Button
                size="sm"
                variant={!isTGO ? 'default' : 'ghost'}
                className={`h-7 text-xs gap-1 ${!isTGO ? 'bg-slate-700 hover:bg-slate-800' : ''}`}
                onClick={() => setStandardMode('INTERNATIONAL')}
              >
                🌐 International
              </Button>
            </div>
          </div>
        </div>

        {/* Title Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{review.projectName}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              {review.projectProvince} | {isTGO ? (THAI_TERMS[review.reviewType] || review.reviewType) : review.reviewType.replace('_', ' ')} Review
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${statusColors[review.status]}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {isTGO ? (THAI_TERMS[review.status] || review.status.replace('_', ' ')) : review.status.replace('_', ' ')}
            </Badge>
            <Badge className={`text-xs ${reviewTypeColors[review.reviewType]}`}>
              {isTGO ? (THAI_TERMS[review.reviewType] || review.reviewType) : review.reviewType.replace('_', ' ')}
            </Badge>
            <Badge className={`text-xs ${recommendationColors[review.recommendation]}`}>
              Rec: {review.recommendation.replace('_', ' ')}
            </Badge>
            {review.priority && (
              <Badge className={`text-xs ${priorityColors[review.priority] || ''}`}>
                <Flag className="h-2.5 w-2.5 mr-1" />
                {review.priority}
              </Badge>
            )}
            {review.methodology && (
              <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                {review.methodology}
              </Badge>
            )}
          </div>
        </div>

        {/* KPI Summary Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{isTGO ? 'ความสมบูรณ์' : 'Completeness'}</p>
              <p className={`text-xl font-bold ${review.findings.completeness >= 80 ? 'text-emerald-600' : review.findings.completeness >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {review.findings.completeness}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{isTGO ? 'ความถูกต้อง' : 'Accuracy'}</p>
              <p className={`text-xl font-bold ${review.findings.accuracy >= 80 ? 'text-emerald-600' : review.findings.accuracy >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {review.findings.accuracy}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{isTGO ? 'ความสอดคล้อง' : 'Consistency'}</p>
              <p className={`text-xl font-bold ${review.findings.consistency >= 80 ? 'text-emerald-600' : review.findings.consistency >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {review.findings.consistency}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{isTGO ? 'หลักฐาน' : 'Evidence'}</p>
              <p className="text-xl font-bold">{verifiedEvidence}/{totalEvidence}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{isTGO ? 'ข้อแก้ไข' : 'Corrective'}</p>
              <p className={`text-xl font-bold ${totalOpenCAs > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{totalOpenCAs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{isTGO ? 'ตรวจสอบได้' : 'Compliance'}</p>
              <p className="text-xl font-bold">{compliancePassCount}/{complianceTotal}</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-emerald-600" />
              {isTGO ? 'ขั้นตอนการตรวจสอบ' : 'Review Workflow Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-0 overflow-x-auto pb-2">
              {WORKFLOW_STAGES.map((stage, idx) => {
                const currentStage = getWorkflowStage(review.status);
                const isCompleted = idx < currentStage;
                const isCurrent = idx === currentStage;
                return (
                  <div key={stage.key} className="flex items-start min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isCompleted ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-amber-400 text-white ring-2 ring-amber-200' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] text-center leading-tight ${
                        isCurrent ? 'font-semibold text-amber-700' :
                        isCompleted ? 'text-emerald-600' :
                        'text-slate-400'
                      }`}>
                        {isTGO ? stage.labelTh : stage.label}
                      </span>
                    </div>
                    {idx < WORKFLOW_STAGES.length - 1 && (
                      <div className={`h-0.5 w-8 mt-4 ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detail Tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <Eye className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'ภาพรวม' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <FileText className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'หลักฐาน' : 'Evidence'} ({totalEvidence})
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <ListChecks className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'ตรวจสอบการปฏิบัติตาม' : 'Compliance'}
            </TabsTrigger>
            <TabsTrigger value="corrective" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <ClipboardList className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'ข้อแก้ไข' : 'Corrective Actions'} {totalOpenCAs > 0 && `(${totalOpenCAs})`}
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'ผลการประเมิน' : 'Findings'}
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <History className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'ประวัติ' : 'Audit Trail'}
            </TabsTrigger>
            <TabsTrigger value="recommendation" className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> {isTGO ? 'ข้อเสนอแนะ' : 'Recommendation'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Reviewer Info */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    {isTGO ? 'ข้อมูลผู้ตรวจสอบ' : 'Reviewer Information'}
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                        {review.reviewerOrg.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{review.reviewerOrg}</p>
                      <p className="text-xs text-muted-foreground">{review.reviewerName}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">{isTGO ? 'สร้างเมื่อ' : 'Created'}:</span><br />{formatDate(review.createdAt)}</div>
                    <div><span className="text-muted-foreground">{isTGO ? 'อัพเดทล่าสุด' : 'Updated'}:</span><br />{formatDate(review.updatedAt)}</div>
                    {review.deadline && (
                      <div className="col-span-2"><span className="text-muted-foreground">{isTGO ? 'กำหนดเส้นตาย' : 'Deadline'}:</span>{' '}
                        <span className="text-amber-600 font-medium">{formatDate(review.deadline)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Project Info */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {isTGO ? 'ข้อมูลโครงการ' : 'Project Information'}
                  </p>
                  <div>
                    <p className="text-sm font-semibold">{review.projectName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {review.projectProvince}
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">{isTGO ? 'รหัสโครงการ' : 'Project ID'}:</span><br /><span className="font-mono">{review.projectId || '-'}</span></div>
                    <div><span className="text-muted-foreground">{isTGO ? 'ระเบียบวิธี' : 'Methodology'}:</span><br />{review.methodology || '-'}</div>
                    <div><span className="text-muted-foreground">{isTGO ? 'รหัสตรวจสอบ' : 'Review ID'}:</span><br /><span className="font-mono">{review.id}</span></div>
                    <div><span className="text-muted-foreground">{isTGO ? 'ประเภท' : 'Type'}:</span><br />{isTGO ? (THAI_TERMS[review.reviewType] || review.reviewType) : review.reviewType.replace('_', ' ')}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Material Misstatement Alert */}
            {(review.findings.materialMisstatement || (review.findings.nonConformities && review.findings.nonConformities.length > 0)) && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    {isTGO ? 'ข้อบกพร่องและการไม่ปฏิบัติตาม' : 'Non-Conformity & Material Misstatement'}
                  </p>
                  {review.findings.materialMisstatement && (
                    <div className="flex items-center gap-2 p-2 rounded bg-red-100 text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold">Material Misstatement Detected</p>
                        <p className="text-[10px] text-red-600">
                          {isTGO
                            ? 'พบข้อความผิดพลาดสำคัญที่อาจส่งผลต่อการรับรองเครดิตคาร์บอน'
                            : 'A material misstatement that could affect carbon credit certification has been identified.'}
                        </p>
                      </div>
                    </div>
                  )}
                  {review.findings.nonConformities && review.findings.nonConformities.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-red-700">{isTGO ? 'ข้อไม่สอดคล้อง:' : 'Non-Conformities:'}</p>
                      {review.findings.nonConformities.map((nc, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-red-600">
                          <CircleDot className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>{nc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* VVB Organization Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  {isTGO ? 'ข้อมูลองค์กร VVB' : 'VVB Organization Profile'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const org = VVB_ORGS.find(o => o.name === review.reviewerOrg);
                  if (!org) return <p className="text-xs text-muted-foreground">Organization data not available</p>;
                  return (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              {org.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{org.name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> {org.country}</p>
                          </div>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-muted-foreground">Accreditation:</span>{' '}
                          <span className="font-medium">{org.accreditation}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-emerald-600">{org.activeReviews}</p>
                          <p className="text-[9px] text-muted-foreground">Active</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{org.completedReviews}</p>
                          <p className="text-[9px] text-muted-foreground">Completed</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{org.rating}%</p>
                          <p className="text-[9px] text-muted-foreground">Rating</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {org.specialties.map(s => (
                          <Badge key={s} variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    {isTGO ? 'หลักฐานอ้างอิง' : 'Evidence References'} ({totalEvidence})
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {verifiedEvidence} verified</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> {review.evidenceRefs.filter(ev => ev.status === 'PENDING').length} pending</span>
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {review.evidenceRefs.filter(ev => ev.status === 'REJECTED').length} rejected</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">ID</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Type</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Submitted</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.evidenceRefs.map((ev) => (
                        <tr key={ev.id} className="border-b last:border-0 hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-xs">{ev.id}</td>
                          <td className="p-3 text-xs font-medium">{ev.name}</td>
                          <td className="p-3"><Badge variant="outline" className="text-[9px] h-4">{ev.type}</Badge></td>
                          <td className="p-3">
                            <Badge variant="secondary" className={`text-[9px] h-4 ${evidenceStatusColor(ev.status)}`}>
                              {ev.status === 'VERIFIED' && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                              {ev.status === 'REJECTED' && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                              {ev.status === 'PENDING' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                              {ev.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{formatRelativeTime(ev.submittedAt)}</td>
                          <td className="p-3">
                            {ev.status === 'PENDING' ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm" variant="outline"
                                  className="h-6 text-[9px] gap-0.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2"
                                  disabled={evidenceActionLoading === ev.id}
                                  onClick={() => handleEvidenceAction(ev.id, 'VERIFIED')}
                                >
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Verify
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  className="h-6 text-[9px] gap-0.5 border-red-300 text-red-700 hover:bg-red-50 px-2"
                                  disabled={evidenceActionLoading === ev.id}
                                  onClick={() => handleEvidenceAction(ev.id, 'REJECTED')}
                                >
                                  <XCircle className="h-2.5 w-2.5" /> Reject
                                </Button>
                              </div>
                            ) : ev.status === 'VERIFIED' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                      {review.evidenceRefs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">No evidence references</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Checklist Tab */}
          <TabsContent value="compliance" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-emerald-600" />
                    {isTGO ? 'ตรวจสอบการปฏิบัติตาม T-VER' : 'T-VER Compliance Checklist'}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {compliancePassCount}/{complianceTotal} {isTGO ? 'ผ่าน' : 'passed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs w-16">ID</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs w-32">{isTGO ? 'หมวดหมู่' : 'Category'}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">{isTGO ? 'ข้อตรวจสอบ' : 'Check Item'}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs w-32">{isTGO ? 'สถานะ' : 'Status'}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs w-24">{isTGO ? 'ดำเนินการ' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TVER_COMPLIANCE_ITEMS.map((item) => {
                        const check = complianceChecks[item.id] || 'PENDING';
                        return (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-xs">{item.id}</td>
                            <td className="p-3 text-xs text-muted-foreground">{item.category}</td>
                            <td className="p-3 text-xs">
                              <p>{item.item}</p>
                              {isTGO && <p className="text-[10px] text-muted-foreground mt-0.5">{item.itemTh}</p>}
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary" className={`text-[9px] h-5 ${
                                check === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
                                check === 'FAIL' ? 'bg-red-100 text-red-700' :
                                check === 'N/A' ? 'bg-slate-100 text-slate-500' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {check === 'PASS' && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                                {check === 'FAIL' && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                                {check === 'N/A' && <CircleX className="h-2.5 w-2.5 mr-0.5" />}
                                {check === 'PENDING' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                                {check}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-0.5">
                                {(['PASS', 'FAIL', 'N/A'] as const).map(action => (
                                  <Button
                                    key={action}
                                    size="sm" variant="ghost"
                                    className={`h-5 text-[8px] px-1.5 ${
                                      check === action ? 'ring-1 ring-current' : ''
                                    } ${
                                      action === 'PASS' ? 'text-emerald-600 hover:bg-emerald-50' :
                                      action === 'FAIL' ? 'text-red-600 hover:bg-red-50' :
                                      'text-slate-500 hover:bg-slate-50'
                                    }`}
                                    onClick={() => setComplianceChecks(prev => ({ ...prev, [item.id]: action }))}
                                  >
                                    {action === 'PASS' ? '✓' : action === 'FAIL' ? '✗' : '—'}
                                  </Button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Corrective Actions Tab */}
          <TabsContent value="corrective" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-emerald-600" />
                  {isTGO ? 'แผนแก้ไขปรับปรุง' : 'Corrective Action Plan'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(review.correctiveActions || []).length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                    <p className="text-sm text-muted-foreground">{isTGO ? 'ไม่มีข้อแก้ไขที่จำเป็น' : 'No corrective actions required'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(review.correctiveActions || []).map((ca) => (
                      <div key={ca.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <span className="text-xs font-bold text-slate-500">{ca.id.split('-')[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{ca.description}</p>
                            <Badge variant="secondary" className={`text-[9px] h-4 shrink-0 ${correctiveActionColors[ca.status]}`}>
                              {ca.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {ca.assignee}</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due: {formatDate(ca.dueDate)}</span>
                            <span className="flex items-center gap-1 font-mono"><Hash className="h-3 w-3" /> {ca.id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="mt-4 space-y-4">
            {/* Findings Scores */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: 'Completeness', labelTh: 'ความสมบูรณ์', value: review.findings.completeness },
                { label: 'Accuracy', labelTh: 'ความถูกต้อง', value: review.findings.accuracy },
                { label: 'Consistency', labelTh: 'ความสอดคล้อง', value: review.findings.consistency },
              ].map(({ label, labelTh, value }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{isTGO ? labelTh : label}</p>
                    <p className={`text-3xl font-bold ${value >= 80 ? 'text-emerald-600' : value >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {value}%
                    </p>
                    <Progress value={value} className={`h-2 mt-2 ${scoreBarColor(value)}`} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {value >= 80 ? (isTGO ? 'ผ่านเกณฑ์' : 'Meets threshold') :
                       value >= 60 ? (isTGO ? 'ต้องปรับปรุง' : 'Needs improvement') :
                       (isTGO ? 'ไม่ผ่านเกณฑ์' : 'Below threshold')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-emerald-600" />
                    {isTGO ? 'แผนภาพเรดาร์' : 'Radar Assessment'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getFindingsChartData(review.findings)}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Score" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                    {isTGO ? 'คะแนนแยกตามหมวด' : 'Score Breakdown'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFindingsBarData(review.findings)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-600" />
                  {isTGO ? 'ประวัติการตรวจสอบ' : 'Audit Trail'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(review.auditLog || []).length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No audit log entries</div>
                ) : (
                  <div className="relative space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
                    {(review.auditLog || []).map((entry, idx) => (
                      <div key={entry.id} className="relative flex items-start gap-4 py-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full z-10 ${
                          idx === (review.auditLog || []).length - 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {idx === (review.auditLog || []).length - 1 ? <CircleDot className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{entry.action}</p>
                            <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-500">{entry.user}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(entry.timestamp)} ({formatRelativeTime(entry.timestamp)})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendation Tab */}
          <TabsContent value="recommendation" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  {isTGO ? 'ความคิดเห็นและข้อเสนอแนะ' : 'VVB Reviewer Comments & Recommendation'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.comments && (
                  <div className="p-3 rounded-lg bg-slate-50 border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{isTGO ? 'ความคิดเห็นเดิม' : 'Previous Comments'}</p>
                    <p className="text-sm">{review.comments}</p>
                  </div>
                )}
                <Textarea
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  placeholder={isTGO ? 'กรุณากรอกความคิดเห็น...' : 'Enter your review comments...'}
                  rows={5}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting}
                    onClick={() => handleRecommendation('APPROVE')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isTGO ? 'อนุมัติ' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    disabled={isSubmitting}
                    onClick={() => handleRecommendation('REJECT')}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {isTGO ? 'ไม่อนุมัติ' : 'Reject'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                    disabled={isSubmitting}
                    onClick={() => handleRecommendation('REQUEST_INFO')}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {isTGO ? 'ขอข้อมูลเพิ่มเติม' : 'Request Info'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ──── LIST VIEW ────
  return (
    <div className="space-y-6">
      {/* Header with Dual Standard Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">VVB Workspace</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isTGO ? 'องค์กรตรวจสอบและรับรอง — T-VER Standard' : 'Validation & Verification Body — International Standard'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center rounded-lg border bg-slate-50 p-0.5">
            <Button size="sm" variant={isTGO ? 'default' : 'ghost'} className={`h-7 text-xs gap-1 ${isTGO ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setStandardMode('TGO')}>
              🇹🇭 TGO/T-VER
            </Button>
            <Button size="sm" variant={!isTGO ? 'default' : 'ghost'} className={`h-7 text-xs gap-1 ${!isTGO ? 'bg-slate-700 hover:bg-slate-800' : ''}`} onClick={() => setStandardMode('INTERNATIONAL')}>
              🌐 International
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5" /> New Review
          </Button>
        </div>
      </div>

      {/* T-VER Methodology Reference Card */}
      <Card className={`border-none bg-gradient-to-r ${isTGO ? 'from-amber-500 via-amber-600 to-orange-500' : 'from-slate-600 via-slate-700 to-slate-800'} text-white`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{isTGO ? 'T-VER Methodology Reference' : 'International Standards Reference'}</h3>
                <p className="text-white/80 text-xs mt-1">
                  {isTGO ? 'กรมควบคุมมลพิษ — Thailand Greenhouse Gas Management Organization' : 'ISO & Verra Standards for carbon credit verification'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:items-end">
              {isTGO ? (
                <>
                  <Badge className="bg-white/20 text-white border-none text-[10px]">T-VER-P-CC-001</Badge>
                  <Badge className="bg-white/20 text-white border-none text-[10px]">กรมควบคุมมลพิษ Validation Requirements</Badge>
                  <Badge className="bg-white/20 text-white border-none text-[10px]">TGO Guidelines 2566 (2023)</Badge>
                </>
              ) : (
                <>
                  <Badge className="bg-white/20 text-white border-none text-[10px]">ISO 14064-3:2019</Badge>
                  <Badge className="bg-white/20 text-white border-none text-[10px]">Verra VCS VVB Requirements v4.2</Badge>
                  <Badge className="bg-white/20 text-white border-none text-[10px]">Gold Standard for the Global Goals</Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><ClipboardCheck className="h-5 w-5 text-slate-600" /></div>
              <div><p className="text-sm text-muted-foreground">{isTGO ? 'ทั้งหมด' : 'Total Reviews'}</p><p className="text-2xl font-bold">{summary.total}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-sm text-muted-foreground">{isTGO ? 'รอดำเนินการ' : 'Pending Review'}</p><p className="text-2xl font-bold">{summary.byStatus.PENDING || 0}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-sm text-muted-foreground">{isTGO ? 'อนุมัติ' : 'Approved'}</p><p className="text-2xl font-bold">{summary.byStatus.APPROVED || 0}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-sm text-muted-foreground">{isTGO ? 'ไม่อนุมัติ / ขอข้อมูล' : 'Rejected / Info Requested'}</p><p className="text-2xl font-bold">{(summary.byStatus.REJECTED || 0) + (summary.byStatus.REQUESTED_INFO || 0)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Analytics Dashboard */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" />{isTGO ? 'การกระจายสถานะ' : 'Status Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{statusPieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}</Pie><Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" />{isTGO ? 'คะแนนเฉลี่ยตามประเภท' : 'Avg. Findings by Type'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={avgFindings} barGap={2} barSize={12}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="reviewType" tick={{ fontSize: 9 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 9 }} /><Tooltip /><Bar dataKey="completeness" fill="#10b981" radius={[2, 2, 0, 0]} name="Complete" /><Bar dataKey="accuracy" fill="#34d399" radius={[2, 2, 0, 0]} name="Accuracy" /><Bar dataKey="consistency" fill="#6ee7b7" radius={[2, 2, 0, 0]} name="Consistency" /><Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} /></BarChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />{isTGO ? 'แนวโน้มการตรวจสอบ' : 'Review Performance Trend'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52"><ResponsiveContainer width="100%" height="100%"><LineChart data={reviewsByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} name="Reviews" /></LineChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
      </div>

      {/* VVB Organization Directory */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" />
            {isTGO ? 'องค์กร VVB ที่ขึ้นทะเบียน' : 'Accredited VVB Organizations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {VVB_ORGS.map(org => (
              <div key={org.name} className="p-3 rounded-lg border bg-white hover:border-emerald-200 hover:shadow-sm transition-all cursor-default">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                      {org.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{org.name}</p>
                    <p className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" />{org.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5">
                  <span>{org.activeReviews} active</span>
                  <span>•</span>
                  <span>{org.completedReviews} done</span>
                  <span>•</span>
                  <span className="font-medium text-emerald-600">{org.rating}%</span>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {org.specialties.map(s => (
                    <Badge key={s} variant="secondary" className="text-[8px] h-3.5 px-1 bg-slate-50 text-slate-500">{s}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={isTGO ? 'ค้นหาโครงการ, รหัส, ผู้ตรวจสอบ...' : 'Search project, review ID, reviewer, org...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">{isTGO ? 'รอดำเนินการ' : 'Pending'}</SelectItem>
            <SelectItem value="IN_PROGRESS">{isTGO ? 'กำลังดำเนินการ' : 'In Progress'}</SelectItem>
            <SelectItem value="APPROVED">{isTGO ? 'อนุมัติ' : 'Approved'}</SelectItem>
            <SelectItem value="REJECTED">{isTGO ? 'ไม่อนุมัติ' : 'Rejected'}</SelectItem>
            <SelectItem value="REQUESTED_INFO">{isTGO ? 'ขอข้อมูลเพิ่มเติม' : 'Requested Info'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue placeholder="Review Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="VALIDATION">{isTGO ? 'การตรวจสอบ' : 'Validation'}</SelectItem>
            <SelectItem value="VERIFICATION">{isTGO ? 'การรับรอง' : 'Verification'}</SelectItem>
            <SelectItem value="PERIODIC_VERIFICATION">{isTGO ? 'การยืนยันระยะ' : 'Periodic Verification'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Reviewer Org" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Orgs</SelectItem>
            {REVIEWER_ORGS.map((org) => (<SelectItem key={org} value={org}>{org}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">{isTGO ? 'ทั้งหมด' : 'All Reviews'}</TabsTrigger>
          <TabsTrigger value="pending">{isTGO ? 'รอดำเนินการ' : 'Pending'}</TabsTrigger>
          <TabsTrigger value="my">{isTGO ? `ของ ${CURRENT_USER_ORG}` : `My Reviews (${CURRENT_USER_ORG})`}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">{searchQuery ? 'No reviews match your search' : 'No reviews found matching your filters'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredReviews.map((review) => {
                const StatusIcon = statusIcons[review.status];
                return (
                  <Card key={review.id} className="cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all" onClick={() => handleReviewClick(review)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              {review.reviewerOrg.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{review.reviewerOrg}</p>
                            <p className="text-xs text-muted-foreground truncate">{review.reviewerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {review.priority && review.priority !== 'MEDIUM' && (
                            <Badge variant="secondary" className={`text-[9px] h-4 ${priorityColors[review.priority] || ''}`}>{review.priority}</Badge>
                          )}
                          <Badge variant="secondary" className={`text-[10px] h-5 ${statusColors[review.status]}`}>
                            <StatusIcon className="h-3 w-3 mr-0.5" />
                            {isTGO ? (THAI_TERMS[review.status] || review.status.replace('_', ' ')) : review.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <Badge variant="secondary" className={`text-[10px] h-5 ${reviewTypeColors[review.reviewType]}`}>
                          {isTGO ? (THAI_TERMS[review.reviewType] || review.reviewType) : review.reviewType.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] h-5 ${recommendationColors[review.recommendation]}`}>
                          {review.recommendation.replace('_', ' ')}
                        </Badge>
                        {review.methodology && (
                          <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600">{review.methodology}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mb-3 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{review.projectName}</span>
                        <span className="text-muted-foreground text-xs shrink-0">({review.projectProvince})</span>
                      </div>

                      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{review.evidenceCount} evidence</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(review.updatedAt)}</span>
                        {review.deadline && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(review.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        )}
                        {(review.correctiveActions || []).filter(ca => ca.status !== 'RESOLVED').length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600"><ClipboardList className="h-3 w-3" />{(review.correctiveActions || []).filter(ca => ca.status !== 'RESOLVED').length} CA</span>
                        )}
                      </div>

                      {/* Findings Progress Bars */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Completeness</span><span className="font-medium">{review.findings.completeness}%</span></div>
                        <Progress value={review.findings.completeness} className={`h-1.5 ${scoreBarColor(review.findings.completeness)}`} />
                        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Accuracy</span><span className="font-medium">{review.findings.accuracy}%</span></div>
                        <Progress value={review.findings.accuracy} className={`h-1.5 ${scoreBarColor(review.findings.accuracy)}`} />
                        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Consistency</span><span className="font-medium">{review.findings.consistency}%</span></div>
                        <Progress value={review.findings.consistency} className={`h-1.5 ${scoreBarColor(review.findings.consistency)}`} />
                      </div>

                      {review.findings.materialMisstatement && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" /><span className="font-medium">Material Misstatement</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end mt-3">
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          View Details <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Review Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              {isTGO ? 'สร้างการตรวจสอบใหม่' : 'Create New Review'}
            </DialogTitle>
            <DialogDescription>
              {isTGO ? 'กรอกข้อมูลเพื่อสร้างการตรวจสอบใหม่' : 'Enter details to create a new VVB review'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Project *</Label>
              <Select value={newProject} onValueChange={setNewProject}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{PROJECTS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isTGO ? 'องค์กรผู้ตรวจสอบ' : 'Reviewer Organization'} *</Label>
              <Select value={newOrg} onValueChange={setNewOrg}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>{REVIEWER_ORGS.map((org) => (<SelectItem key={org} value={org}>{org}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isTGO ? 'ชื่อผู้ตรวจสอบ' : 'Reviewer Name'} *</Label>
              <Input value={newReviewer} onChange={(e) => setNewReviewer(e.target.value)} placeholder="e.g. Dr. Somchai P." className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{isTGO ? 'ประเภท' : 'Review Type'} *</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as ReviewType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VALIDATION">{isTGO ? 'การตรวจสอบ' : 'Validation'}</SelectItem>
                    <SelectItem value="VERIFICATION">{isTGO ? 'การรับรอง' : 'Verification'}</SelectItem>
                    <SelectItem value="PERIODIC_VERIFICATION">{isTGO ? 'การยืนยันระยะ' : 'Periodic Verification'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Methodology</Label>
                <Select value={newMethodology} onValueChange={setNewMethodology}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T-VER">T-VER</SelectItem>
                    <SelectItem value="IPCC-2023">IPCC-2023</SelectItem>
                    <SelectItem value="Verra VCS">Verra VCS</SelectItem>
                    <SelectItem value="Gold Standard">Gold Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isTGO ? 'กำหนดเส้นตาย' : 'Review Deadline'}</Label>
                <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={handleCreateReview} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : <><Plus className="h-3.5 w-3.5" /> {isTGO ? 'สร้างการตรวจสอบ' : 'Create Review'}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
