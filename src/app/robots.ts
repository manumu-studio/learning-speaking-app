// SEO configuration — prevent indexing of API and session routes
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/session/'],
      },
    ],
  };
}
