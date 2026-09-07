import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { Providers } from '@/components/Providers';
import { THEME_INIT_SCRIPT } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'Goh Betoch Bank | IT Asset Inventory',
  description: 'GBB IT Asset Inventory Management Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets the `dark` class on <html> before first paint, based on
            the saved preference (or OS setting) — avoids a flash of the
            wrong theme on load/refresh. See src/context/ThemeContext.tsx. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
