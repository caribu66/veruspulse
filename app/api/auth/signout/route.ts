// Sign Out
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('github_user');
  cookieStore.delete('github_token');

  return NextResponse.redirect(new URL('/', request.url));
}

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('github_user');
  cookieStore.delete('github_token');

  return NextResponse.json({ success: true });
}
