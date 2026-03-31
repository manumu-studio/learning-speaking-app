// Root layout — wraps the entire application with global styles and theme provider
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';

export const metadata: Metadata = {
  title: 'Learning Speaking App',
  description: 'Practice speaking English and get AI-powered pattern feedback',
  icons: {
    icon: '/assets/logo-black.webp',
    apple: '/assets/logo-black.webp',
  },
  openGraph: {
    title: 'Learning Speaking App',
    description: 'Practice speaking English and get AI-powered pattern feedback',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
