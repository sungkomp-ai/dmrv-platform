import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';
import { NextResponse } from 'next/server';

const CHART_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899'];

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    office: CHART_COLORS[0], factory: CHART_COLORS[1], warehouse: CHART_COLORS[2],
    renewable: CHART_COLORS[3], datacenter: CHART_COLORS[4],
  };
  return colors[category] || CHART_COLORS[0];
}

function formatCategory(category: string): string {
  const formats: Record<string, string> = {
    office: 'Office', factory: 'Factory', warehouse: 'Warehouse',
    renewable: 'Renewable', datacenter: 'Data Center',
  };
  return formats[category] || category;
}

export async function GET() {
  try {
    await ensureSeeded();
    const locations = await db.location.findMany();

    const categoryData = Object.entries(
      locations.reduce((acc, l) => { acc[l.category] = (acc[l.category] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, fill: getCategoryColor(name) }));

    const regionData = Object.entries(
      locations.reduce((acc, l) => {
        if (!acc[l.region]) acc[l.region] = { totalValue: 0, count: 0, revenue: 0 };
        acc[l.region].totalValue += l.value;
        acc[l.region].count++;
        acc[l.region].revenue += l.revenue;
        return acc;
      }, {} as Record<string, { totalValue: number; count: number; revenue: number }>)
    ).map(([region, data]) => ({
      region, avgPerformance: Math.round(data.totalValue / data.count),
      revenue: Math.round(data.revenue / 100000) / 10, locations: data.count,
    }));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const performanceTrend = months.map((month, i) => ({
      month, performance: Math.round(75 + Math.sin(i * 0.5) * 8 + i * 0.5), target: 85 + Math.round(i * 0.3),
    }));

    const revenueByCategory = Object.entries(
      locations.reduce((acc, l) => { acc[l.category] = (acc[l.category] || 0) + l.revenue; return acc; }, {} as Record<string, number>)
    ).map(([category, revenue]) => ({ category: formatCategory(category), revenue: Math.round(revenue / 100000) / 10 }));

    const employeeByRegion = Object.entries(
      locations.reduce((acc, l) => { acc[l.region] = (acc[l.region] || 0) + l.employees; return acc; }, {} as Record<string, number>)
    ).map(([region, employees]) => ({ region, employees }));

    return NextResponse.json({ categoryData, regionData, performanceTrend, revenueByCategory, employeeByRegion });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
