import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check auth
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
  }

  const { id: eventId } = await params;

  try {
    // Get event details
    const eventResult = await pool.query(
      `SELECT e.*, v.name as venue_name, v.address as venue_address, v.city as venue_city
       FROM events e
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE e.id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const event = eventResult.rows[0];

    // Get items with their outcomes
    const itemsResult = await pool.query(
      `SELECT i.*, r.user_id, r.position as registration_position
       FROM items i
       JOIN registrations r ON i.registration_id = r.id
       WHERE r.event_id = $1`,
      [eventId]
    );

    const items = itemsResult.rows;

    // Calculate stats
    const totalItems = items.length;
    const completedItems = items.filter(i => i.status === 'completed').length;
    const inProgressItems = items.filter(i => i.status === 'in-progress').length;
    const registeredItems = items.filter(i => i.status === 'registered').length;

    // Outcome breakdown
    const outcomeBreakdown = {
      fixed: items.filter(i => i.outcome === 'fixed').length,
      partially_fixed: items.filter(i => i.outcome === 'partially_fixed').length,
      not_repairable: items.filter(i => i.outcome === 'not_repairable').length,
      needs_parts: items.filter(i => i.outcome === 'needs_parts').length,
      not_attempted: items.filter(i => !i.outcome || i.outcome === 'not_attempted').length,
    };

    // Success rate (fixed + partially_fixed / completed items)
    const repairableItems = outcomeBreakdown.fixed + outcomeBreakdown.partially_fixed;
    const successRate = completedItems > 0 
      ? Math.round((repairableItems / completedItems) * 100) 
      : 0;

    // Volunteer hours estimate (assume avg 30 min per item, 2 volunteers per item)
    const volunteerHours = Math.round((totalItems * 0.5 * 2) * 10) / 10;

    // Get registrations summary
    const registrationsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'checked_in' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'checked_out' THEN 1 END) as checked_out
       FROM registrations
       WHERE event_id = $1 AND status != 'cancelled'`,
      [eventId]
    );

    const registrations = registrationsResult.rows[0];

    // Get volunteer count (fixers who RSVVP'd yes)
    const fixersResult = await pool.query(
      `SELECT COUNT(*) as fixer_count
       FROM fixer_event_rsvps
       WHERE event_id = $1 AND response = 'yes'`,
      [eventId]
    );

    // Material breakdown (from items table)
    const materialTotals = items.reduce((acc, item) => {
      if (item.weight_kg) {
        const electronic = (item.weight_kg * (item.pct_electronic || 0)) / 100;
        const metal = (item.weight_kg * (item.pct_metal || 0)) / 100;
        const plastic = (item.weight_kg * (item.pct_plastic || 0)) / 100;
        const textile = (item.weight_kg * (item.pct_textile || 0)) / 100;
        const other = (item.weight_kg * (item.pct_other || 0)) / 100;
        
        acc.electronic += electronic;
        acc.metal += metal;
        acc.plastic += plastic;
        acc.textile += textile;
        acc.other += other;
        acc.total += item.weight_kg;
      }
      return acc;
    }, { electronic: 0, metal: 0, plastic: 0, textile: 0, other: 0, total: 0 });

    // Round totals
    Object.keys(materialTotals).forEach(key => {
      materialTotals[key] = Math.round(materialTotals[key] * 100) / 100;
    });

    const report = {
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        venue_city: event.venue_city,
      },
      summary: {
        totalItems,
        completedItems,
        inProgressItems,
        registeredItems,
        totalRegistrations: parseInt(registrations.total),
        checkedIn: parseInt(registrations.checked_in),
        checkedOut: parseInt(registrations.checked_out),
        volunteerCount: parseInt(fixersResult.rows[0].fixer_count) || 0,
      },
      outcomes: outcomeBreakdown,
      successRate,
      volunteerHours,
      materials: materialTotals,
    };

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate report' }, { status: 500 });
  }
}
