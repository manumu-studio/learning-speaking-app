// Evidence register — displays all evidence for a session or day
'use client';

import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import type { EvidenceRegisterProps } from './EvidenceRegister.types';
import { EvidenceSections } from './EvidenceSections';

export function EvidenceRegister({
  bundle,
  title,
  subtitle,
  backHref,
}: EvidenceRegisterProps) {
  return (
    <Container>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">
          {title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </header>
      <EvidenceSections bundle={bundle} />
    </Container>
  );
}
