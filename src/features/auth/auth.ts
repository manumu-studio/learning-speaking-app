// NextAuth configuration with ManuMuStudio OIDC provider
import NextAuth from 'next-auth';
import { env } from '@/lib/env';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: 'manumustudio',
      name: 'ManuMuStudio',
      type: 'oidc',
      issuer: 'https://auth.manumustudio.com',
      clientId: env.AUTH_CLIENT_ID,
      clientSecret: env.AUTH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
      checks: ['pkce', 'state'],
    },
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, profile }) {
      // On first sign-in, add external ID and user info to token
      if (profile?.sub) {
        token.externalId = profile.sub as string;
        token.email = profile.email as string | undefined;
        token.name = profile.name as string | undefined;
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
