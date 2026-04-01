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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-md focus:shadow-lg dark:focus:bg-zinc-900 dark:focus:text-white"
        >
          Skip to main content
        </a>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
