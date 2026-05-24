import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await ensureSeeded();
    const locations = await db.location.findMany();

    const totalLocations = locations.length;
    const activeLocations = locations.filter(l => l.status === 'active').length;
    const totalEmployees = locations.reduce((sum, l) => sum + l.employees, 0);
    const totalRevenue = locations.reduce((sum, l) => sum + l.revenue, 0);
    const avgPerformance = totalLocations > 0
      ? Math.round(locations.reduce((sum, l) => sum + l.value, 0) / totalLocations)
      : 0;

    const byCategory = locations.reduce((acc, l) => {
      if (!acc[l.category]) acc[l.category] = { count: 0, employees: 0, revenue: 0, avgValue: 0, totalValue: 0 };
      acc[l.category].count++;
      acc[l.category].employees += l.employees;
      acc[l.category].revenue += l.revenue;
      acc[l.category].totalValue += l.value;
      acc[l.category].avgValue = Math.round(acc[l.category].totalValue / acc[l.category].count);
      return acc;
    }, {} as Record<string, { count: number; employees: number; revenue: number; avgValue: number; totalValue: number }>);

    const byRegion = locations.reduce((acc, l) => {
      if (!acc[l.region]) acc[l.region] = { count: 0, employees: 0, revenue: 0, locations: 0 };
      acc[l.region].count++;
      acc[l.region].employees += l.employees;
      acc[l.region].revenue += l.revenue;
      acc[l.region].locations++;
      return acc;
    }, {} as Record<string, { count: number; employees: number; revenue: number; locations: number }>);

    const byStatus = locations.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const performanceBuckets = {
      excellent: locations.filter(l => l.value >= 90).length,
      good: locations.filter(l => l.value >= 70 && l.value < 90).length,
      fair: locations.filter(l => l.value >= 50 && l.value < 70).length,
      poor: locations.filter(l => l.value < 50).length,
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrend = months.map((month, i) => ({
      month,
      revenue: Math.round(totalRevenue * (0.7 + 0.1 * i + 0.2 * Math.sin(i * 0.5))),
      target: Math.round(totalRevenue * (0.8 + i * 0.015)),
    }));

    return NextResponse.json({
      overview: { totalLocations, activeLocations, totalEmployees, totalRevenue, avgPerformance, inactiveLocations: totalLocations - activeLocations },
      byCategory,
      byRegion,
      byStatus,
      performanceBuckets,
      revenueTrend,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
