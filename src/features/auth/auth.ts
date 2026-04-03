// NextAuth configuration with ManuMuStudio OAuth/OIDC provider
import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import { env } from '@/lib/env';

const nextAuth = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  providers: [
    {
      id: 'manumustudio',
      name: 'ManuMuStudio',
      type: 'oauth',
      // Must match the "iss" claim in JWTs signed by the auth server
      issuer: 'https://auth.manumustudio.com/',
      authorization: {
        url: 'https://auth.manumustudio.com/oauth/authorize',
        params: { scope: 'openid email profile' },
      },
      token: 'https://auth.manumustudio.com/oauth/token',
      userinfo: 'https://auth.manumustudio.com/oauth/userinfo',
      clientId: env.AUTH_CLIENT_ID,
      clientSecret: env.AUTH_CLIENT_SECRET,
      checks: ['pkce', 'state'],
      profile(profile: Record<string, unknown>) {
        return {
          id: profile['sub'] as string,
          name: (profile['name'] ?? profile['email'] ?? null) as string | null,
          email: (profile['email'] ?? null) as string | null,
          image: (profile['picture'] ?? null) as string | null,
        };
      },
    },
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, add external ID and user info to token
      if (profile?.sub) {
        token.externalId = profile.sub as string;
        token.email = (profile.email as string | undefined) ?? null;
        token.name = (profile.name as string | undefined) ?? null;
      }
      // Store OIDC id_token for federated logout
      if (account?.id_token) {
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Add external ID to session for use in app
      if (token.externalId) {
        session.user.externalId = token.externalId as string;
      }
      return session;
    },
  },
  debug: env.NODE_ENV === 'development',
});

/** Synthetic session for Playwright E2E when E2E_TEST_USER is set (never in production). */
const e2eBypassSession = (): Session => ({
  user: {
    externalId: 'e2e-test-external-id',
    email: 'e2e@test.local',
    name: 'E2E Test User',
    image: null,
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

/** Server/session helper; codebase only uses zero-arg `auth()` (not middleware wrapping). */
export async function auth(): Promise<Session | null> {
  if (process.env.E2E_TEST_USER === 'true' && process.env.NODE_ENV !== 'production') {
    return e2eBypassSession();
  }
  const getSession = nextAuth.auth as () => Promise<Session | null>;
  return getSession();
}

export const { handlers, signIn, signOut } = nextAuth;
