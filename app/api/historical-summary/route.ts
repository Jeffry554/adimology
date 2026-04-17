ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalSummary } from '@/lib/stockbit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emiten = searchParams.get('emiten');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Number(searchParams.get('limit') || '60');

    if (!emiten || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required query params: emiten, startDate, endDate',
        },
        { status: 400 }
      );
    }

    const data = await fetchHistoricalSummary(
      emiten.toUpperCase(),
      startDate,
      endDate,
      limit
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        emiten: emiten.toUpperCase(),
        startDate,
        endDate,
        limit,
        count: Array.isArray(data) ? data.length : 0,
      },
    });
  } catch (error) {
    console.error('Historical Summary API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch historical summary',
      },
      { status: 500 }
    );
  }
}
