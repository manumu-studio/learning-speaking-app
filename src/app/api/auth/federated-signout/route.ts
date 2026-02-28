// Federated sign-out route: clears local auth cookies and logs out auth server session
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { env } from '@/lib/env';

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

const AUTH_LOGOUT_URL = 'https://auth.manumustudio.com/oauth/logout';

export async function GET() {
  const cookieStore = await cookies();
  let idToken: string | undefined;

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const sessionCookie = cookieStore.get(cookieName);
    if (!sessionCookie?.value) {
      continue;
    }

    try {
      const decoded = await decode({
        token: sessionCookie.value,
        secret: env.NEXTAUTH_SECRET,
        salt: cookieName,
      });
      idToken = decoded?.idToken as string | undefined;
      break;
    } catch {
      // Try the other cookie name if decode fails
    }
  }

  const logoutUrl = new URL(AUTH_LOGOUT_URL);
  if (idToken) {
    logoutUrl.searchParams.set('id_token_hint', idToken);
  } else {
    logoutUrl.searchParams.set('client_id', env.AUTH_CLIENT_ID);
  }
  logoutUrl.searchParams.set('post_logout_redirect_uri', env.APP_URL);

  for (const cookieName of SESSION_COOKIE_NAMES) {
    cookieStore.delete(cookieName);
  }
  cookieStore.delete('authjs.callback-url');
  cookieStore.delete('__Secure-authjs.callback-url');
  cookieStore.delete('authjs.csrf-token');
  cookieStore.delete('__Secure-authjs.csrf-token');

  return NextResponse.redirect(logoutUrl.toString());
}
