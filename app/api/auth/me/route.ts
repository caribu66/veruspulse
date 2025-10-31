// Get current user
import { type NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/simple-auth';

export async function GET(_request: NextRequest) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
