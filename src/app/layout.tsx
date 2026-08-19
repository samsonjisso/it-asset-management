import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goh Betoch Bank IT Asset Inventory',
  description: 'GBB IT Asset Inventory Management System'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{__html:`(()=>{try{const m=localStorage.getItem('gbb_theme')||'system';const d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch{}})()`}} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
