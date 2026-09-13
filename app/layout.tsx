import type { Metadata, Viewport } from 'next';
import { PwaInstall } from '@/components/pwa-install';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  verification: { google: 'VOyBefrAToEcRUsldRLrcJduMaRP263JfIHqm5ECDOA' },
  applicationName: 'El Padrino',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'El Padrino',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      'https://perfumes-el-padrino.vercel.app',
  ),
  title: 'Perfumes El Padrino by Jordy Tamayo | Babahoyo, Ecuador',
  description:
    'Perfumes originales en Babahoyo, Ecuador, by Jordy Tamayo. Descubre fragancias para mujer, hombre y unisex, compra por transferencia y recibe envíos nacionales.',
  authors: [{ name: 'Jordy Tamayo' }],
  creator: 'Jordy Tamayo',
  publisher: 'Perfumes El Padrino',
  category: 'shopping',
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'Perfumes El Padrino',
    description: 'Tu esencia. Tu legado.',
    type: 'website',
    siteName: 'Perfumes El Padrino',
    locale: 'es_EC',
    url: '/',
    images: [{ url: '/og.png', width: 1733, height: 907 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perfumes El Padrino',
    description: 'Tu esencia. Tu legado.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { themeColor: '#11100d' };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${cormorant.variable} antialiased`}>
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
