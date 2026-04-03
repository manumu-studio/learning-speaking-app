// API documentation page — Swagger UI for OpenAPI spec (development only)
'use client';

import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(async () => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  if (process.env.NODE_ENV === 'production') {
    return <p>API docs are only available in development.</p>;
  }

  return <SwaggerUI url="/api/docs/spec" />;
}
