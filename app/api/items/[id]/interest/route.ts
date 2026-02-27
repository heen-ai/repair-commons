'use server';

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;
  
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { interested, notes, suggestedParts, questions } = body;

  try {
    // Check if user is a fixer (has fixer profile)
    const fixerCheck = await pool.query(
      'SELECT * FROM fixers WHERE user_id = $1',
      [user.id]
    );

    if (fixerCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'You are not registered as a fixer' }, { status: 403 });
    }

    if (interested === false) {
      // Remove interest
      await pool.query(
        'DELETE FROM fixer_interest WHERE item_id = $1 AND fixer_id = $2',
        [itemId, user.id]
      );
      return NextResponse.json({ success: true, interested: false });
    }

    // Check if already has interest
    const existingInterest = await pool.query(
      'SELECT * FROM fixer_interest WHERE item_id = $1 AND fixer_id = $2',
      [itemId, user.id]
    );

    if (existingInterest.rows.length > 0) {
      // Update existing interest
      await pool.query(
        `UPDATE fixer_interest 
         SET notes = COALESCE($3, notes), 
             suggested_parts = COALESCE($4, suggested_parts), 
             questions = COALESCE($5, questions)
         WHERE item_id = $1 AND fixer_id = $2`,
        [itemId, user.id, notes || null, suggestedParts || null, questions || null]
      );
    } else {
      // Create new interest
      await pool.query(
        `INSERT INTO fixer_interest (item_id, fixer_id, notes, suggested_parts, questions) 
         VALUES ($1, $2, $3, $4, $5)`,
        [itemId, user.id, notes || null, suggestedParts || null, questions || null]
      );
    }

    return NextResponse.json({ success: true, interested: true });
  } catch (error) {
    console.error('Error updating interest:', error);
    return NextResponse.json({ success: false, message: 'Failed to update interest' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;
  
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM fixer_interest WHERE item_id = $1 AND fixer_id = $2',
      [itemId, user.id]
    );

    if (result.rows.length > 0) {
      return NextResponse.json({ success: true, interested: true, interest: result.rows[0] });
    }

    return NextResponse.json({ success: true, interested: false });
  } catch (error) {
    console.error('Error fetching interest:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch interest' }, { status: 500 });
  }
}
