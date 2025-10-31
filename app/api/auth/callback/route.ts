// GitHub OAuth - Callback Handler
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  const searchParams = _request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', _request.url));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_ID,
          client_secret: process.env.GITHUB_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL('/?error=token_failed', _request.url)
      );
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const userData = await userResponse.json();

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set(
      'github_user',
      JSON.stringify({
        id: userData.id,
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }
    );

    cookieStore.set('github_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Redirect to home
    return NextResponse.redirect(new URL('/', _request.url));
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', _request.url));
  }
}
