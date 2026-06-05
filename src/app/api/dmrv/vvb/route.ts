import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';

// GET /api/dmrv/vvb — List all VVB reviews with project info and summary stats
export async function GET() {
  try {
    await ensureSeeded();

    const reviews = await db.vVBReview.findMany({
      include: {
        project: {
          select: { id: true, name: true, province: true, methodology: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary stats by status
    const byStatus: Record<string, number> = {};
    const byReviewType: Record<string, number> = {};
    for (const review of reviews) {
      byStatus[review.status] = (byStatus[review.status] || 0) + 1;
      byReviewType[review.reviewType] = (byReviewType[review.reviewType] || 0) + 1;
    }

    // Parse JSON strings and map to frontend format
    const mappedReviews = reviews.map((r) => {
      // Parse findings JSON
      let parsedFindings: Record<string, unknown> = {};
      try {
        parsedFindings = typeof r.findings === 'string' ? JSON.parse(r.findings) : r.findings;
      } catch {
        parsedFindings = {};
      }

      // Parse evidenceRefs JSON
      let parsedEvidence: unknown[] = [];
      try {
        const rawEv = typeof r.evidenceRefs === 'string' ? JSON.parse(r.evidenceRefs) : r.evidenceRefs;
        if (Array.isArray(rawEv)) {
          parsedEvidence = rawEv;
        }
      } catch {
        parsedEvidence = [];
      }

      return {
        id: r.id,
        projectId: r.projectId,
        reviewerOrg: r.reviewerOrg,
        reviewerName: r.reviewerName,
        reviewType: r.reviewType,
        status: r.status,
        recommendation: r.recommendation,
        comments: r.comments,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        // Parsed fields
        findings: parsedFindings,
        evidenceRefs: parsedEvidence,
        // Project relation data
        projectName: r.project?.name || '',
        projectProvince: r.project?.province || '',
        projectMethodology: r.project?.methodology || '',
        // Extract new fields from findings JSON
        methodology: (parsedFindings as Record<string, unknown>).methodology || r.project?.methodology || 'T-VER',
        priority: (parsedFindings as Record<string, unknown>).priority || 'MEDIUM',
        deadline: (parsedFindings as Record<string, unknown>).deadline || '',
        materialMisstatement: (parsedFindings as Record<string, unknown>).materialMisstatement || false,
        nonConformities: (parsedFindings as Record<string, unknown>).nonConformities || [],
      };
    });

    // Compute average findings by review type
    const typeGroups: Record<string, { completeness: number[]; accuracy: number[]; consistency: number[] }> = {};
    for (const review of mappedReviews) {
      const f = review.findings as Record<string, number>;
      const key = review.reviewType === 'PERIODIC_VERIFICATION'
        ? 'Periodic'
        : review.reviewType.charAt(0) + review.reviewType.slice(1).toLowerCase();
      if (!typeGroups[key]) typeGroups[key] = { completeness: [], accuracy: [], consistency: [] };
      if (typeof f.completeness === 'number') typeGroups[key].completeness.push(f.completeness);
      if (typeof f.accuracy === 'number') typeGroups[key].accuracy.push(f.accuracy);
      if (typeof f.consistency === 'number') typeGroups[key].consistency.push(f.consistency);
    }

    const avgFindingsByType = Object.entries(typeGroups).map(([reviewType, vals]) => ({
      reviewType,
      completeness: vals.completeness.length
        ? Math.round(vals.completeness.reduce((a, b) => a + b, 0) / vals.completeness.length)
        : 0,
      accuracy: vals.accuracy.length
        ? Math.round(vals.accuracy.reduce((a, b) => a + b, 0) / vals.accuracy.length)
        : 0,
      consistency: vals.consistency.length
        ? Math.round(vals.consistency.reduce((a, b) => a + b, 0) / vals.consistency.length)
        : 0,
    }));

    // Compute reviews by month (for trend chart)
    const monthCounts: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const review of reviews) {
      const d = new Date(review.createdAt);
      const key = monthNames[d.getMonth()] + ' ' + d.getFullYear();
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const reviewsByMonth = Object.entries(monthCounts)
      .sort(([a], [b]) => {
        const [am, ay] = a.split(' ');
        const [bm, by] = b.split(' ');
        const ai = monthNames.indexOf(am) + parseInt(ay) * 12;
        const bi = monthNames.indexOf(bm) + parseInt(by) * 12;
        return ai - bi;
      })
      .slice(-6)
      .map(([month, count]) => ({ month: month.split(' ')[0], count }));

    return NextResponse.json({
      reviews: mappedReviews,
      summary: {
        total: reviews.length,
        byStatus,
        byReviewType,
      },
      avgFindingsByType,
      reviewsByMonth,
    });
  } catch (error) {
    console.error('VVB GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch VVB reviews', details: String(error) }, { status: 500 });
  }
}

// POST /api/dmrv/vvb — Create or update a VVB review
export async function POST(request: NextRequest) {
  try {
    await ensureSeeded();

    const body = (await request.json()) as {
      action: 'create' | 'update';
      projectId: string;
      reviewerOrg?: string;
      reviewerName?: string;
      reviewType?: string;
      status?: string;
      recommendation?: string;
      comments?: string;
      evidenceRefs?: string;
      findings?: string;
      reviewId?: string;
    };

    const { action, projectId, reviewerOrg, reviewerName, reviewType, status, recommendation, comments, evidenceRefs, findings, reviewId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'create') {
      // Parse and merge new fields (methodology, priority, deadline) into findings JSON
      let findingsObj: Record<string, unknown> = {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        materialMisstatement: false,
        nonConformities: [],
      };
      if (findings) {
        try {
          const parsed = typeof findings === 'string' ? JSON.parse(findings) : findings;
          findingsObj = { ...findingsObj, ...parsed };
        } catch { /* keep defaults */ }
      }

      const review = await db.vVBReview.create({
        data: {
          projectId,
          reviewerOrg: reviewerOrg || '',
          reviewerName: reviewerName || '',
          reviewType: reviewType || 'VALIDATION',
          status: status || 'PENDING',
          recommendation: recommendation || '',
          comments: comments || '',
          evidenceRefs: evidenceRefs || '[]',
          findings: JSON.stringify(findingsObj),
          reviewedAt: ['APPROVED', 'REJECTED', 'REQUESTED_INFO'].includes(status || '')
            ? new Date()
            : null,
        },
        include: {
          project: { select: { id: true, name: true, province: true, methodology: true } },
        },
      });

      return NextResponse.json({ success: true, review }, { status: 201 });
    }

    if (action === 'update') {
      if (!reviewId) {
        return NextResponse.json({ error: 'reviewId is required for update' }, { status: 400 });
      }

      const existing = await db.vVBReview.findUnique({ where: { id: reviewId } });
      if (!existing) {
        return NextResponse.json({ error: 'VVB review not found' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (reviewerOrg !== undefined) updateData.reviewerOrg = reviewerOrg;
      if (reviewerName !== undefined) updateData.reviewerName = reviewerName;
      if (reviewType !== undefined) updateData.reviewType = reviewType;
      if (status !== undefined) {
        updateData.status = status;
        if (['APPROVED', 'REJECTED', 'REQUESTED_INFO'].includes(status)) {
          updateData.reviewedAt = new Date();
        }
      }
      if (recommendation !== undefined) updateData.recommendation = recommendation;
      if (comments !== undefined) updateData.comments = comments;
      if (evidenceRefs !== undefined) updateData.evidenceRefs = evidenceRefs;
      if (findings !== undefined) updateData.findings = findings;

      const review = await db.vVBReview.update({
        where: { id: reviewId },
        data: updateData,
        include: {
          project: { select: { id: true, name: true, province: true, methodology: true } },
        },
      });

      return NextResponse.json({ success: true, review });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create" or "update"' }, { status: 400 });
  } catch (error) {
    console.error('VVB POST error:', error);
    return NextResponse.json({ error: 'Failed to process VVB review', details: String(error) }, { status: 500 });
  }
}
