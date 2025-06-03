import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import ConditionalEnzoChat from '@/components/shared/ConditionalEnzoChat';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <body className="min-h-screen bg-background text-foreground font-sans">
          <ThemeProvider
            defaultTheme="dark"
            storageKey="pixel-portal-theme"
          >
            {children}
            <Toaster position="top-right" richColors />
            <ConditionalEnzoChat />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
} 