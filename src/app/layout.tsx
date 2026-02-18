// Root layout — wraps the entire application with global styles
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Learning Speaking App',
  description: 'Practice speaking and get AI-powered feedback',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
