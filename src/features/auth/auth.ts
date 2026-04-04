// NextAuth configuration with ManuMuStudio OAuth/OIDC provider
import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { env } from '@/lib/env';

// Zod schema for OIDC profile shape — replaces unsafe `as string` casts
const OidcProfileSchema = z.object({
  sub: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  picture: z.string().nullish(),
});

const nextAuth = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  providers: [
    {
      id: 'manumustudio',
      name: 'ManuMuStudio',
      type: 'oauth',
      // Must match the "iss" claim in JWTs signed by the auth server
      issuer: `${env.AUTH_ISSUER_URL}/`,
      authorization: {
        url: `${env.AUTH_ISSUER_URL}/oauth/authorize`,
        params: { scope: 'openid email profile' },
      },
      token: `${env.AUTH_ISSUER_URL}/oauth/token`,
      userinfo: `${env.AUTH_ISSUER_URL}/oauth/userinfo`,
      clientId: env.AUTH_CLIENT_ID,
      clientSecret: env.AUTH_CLIENT_SECRET,
      checks: ['pkce', 'state'],
      profile(profile: Record<string, unknown>) {
        const parsed = OidcProfileSchema.parse(profile);
        return {
          id: parsed.sub,
          name: parsed.name ?? parsed.email ?? null,
          email: parsed.email ?? null,
          image: parsed.picture ?? null,
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
        const parsed = OidcProfileSchema.parse(profile);
        token.externalId = parsed.sub;
        token.email = parsed.email ?? null;
        token.name = parsed.name ?? null;
      }
      // Store OIDC id_token for federated logout
      if (account?.id_token) {
        token.idToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Add external ID to session for use in app
      if (typeof token.externalId === 'string') {
        session.user.externalId = token.externalId;
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
  // NextAuth v5 beta types don't expose zero-arg auth() — cast is the documented workaround
  const getSession = nextAuth.auth as () => Promise<Session | null>;
  return getSession();
}

export const { handlers, signIn, signOut } = nextAuth;
