// GitHub OAuth - Sign In
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const clientId = process.env.GITHUB_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured. Add GITHUB_ID to .env.local' },
      { status: 500 }
    );
  }

  // Redirect to GitHub OAuth
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set(
    'redirect_uri',
    `${process.env.NEXTAUTH_URL || 'http://localhost:3004'}/api/auth/callback`
  );
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');

  return NextResponse.redirect(githubAuthUrl.toString());
}
