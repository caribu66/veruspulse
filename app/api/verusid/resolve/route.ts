import { type NextRequest, NextResponse } from 'next/server';
import { resolveVerusID } from '@/lib/verusid-cache';

export async function POST(request: NextRequest) {
  try {
    const { verusId } = await request.json();

    if (!verusId || typeof verusId !== 'string') {
      return NextResponse.json(
        { error: 'VerusID is required and must be a string' },
        { status: 400 }
      );
    }

    const identity = await resolveVerusID(verusId);

    return NextResponse.json(identity);
  } catch (error: any) {
    console.error('Error resolving VerusID:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve VerusID' },
      { status: 500 }
    );
  }
}
