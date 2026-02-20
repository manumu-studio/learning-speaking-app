// Explanation page — Server component that validates QR token and renders personalized experience
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { validateToken } from '@/config/launch-guests';
import ExplanationContent from './ExplanationContent';

export const metadata: Metadata = {
  title: 'LSA — Your Invitation',
  description: 'An exclusive preview of LSA by ManuMu Studio.',
  robots: { index: false, follow: false },
};

interface ExplanationPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ExplanationPage({ searchParams }: ExplanationPageProps) {
  const params = await searchParams;
  const token = params.token;

  // Validate token server-side
  if (!token) {
    redirect('/launch');
  }

  const guest = validateToken(token);

  if (!guest) {
    redirect('/launch');
  }

  return <ExplanationContent guestName={guest.name} />;
}
