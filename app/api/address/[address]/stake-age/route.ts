import { type NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Stake age analysis feature is not currently available',
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error analyzing stake age:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze stake age',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Stake age analysis feature is not currently available',
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error in comprehensive stake age analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform comprehensive stake age analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
