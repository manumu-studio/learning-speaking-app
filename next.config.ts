// Next.js configuration — routing, security headers, bundle analysis, and build settings
import type { NextConfig } from 'next';
import path from 'path';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ['swagger-ui-react'],
  serverExternalPackages: ['ffmpeg-static', 'pino', 'pino-pretty'],

  outputFileTracingIncludes: {
    '/api/internal/process/**': [
      './node_modules/ffmpeg-static/ffmpeg',
      './node_modules/ffmpeg-static/index.js',
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://*.upstash.io https://api.anthropic.com https://api.openai.com https://auth.manumustudio.com wss://*.stt.speech.microsoft.com https://*.stt.speech.microsoft.com https://*.cognitiveservices.azure.com https://*.ingest.sentry.io",
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  sourcemaps: { disable: true },
});
