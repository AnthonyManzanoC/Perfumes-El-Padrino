import type { Metadata } from 'next';
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001',
  ),
  title: 'Perfumes El Padrino | Fragancias originales en Ecuador',
  description:
    'Descubre perfumes originales para dama y caballero. Asesoría personalizada y pedidos directos por WhatsApp.',
  openGraph: {
    title: 'Perfumes El Padrino',
    description: 'Tu esencia. Tu legado.',
    type: 'website',
    locale: 'es_EC',
    images: [{ url: '/og.png', width: 1733, height: 907 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perfumes El Padrino',
    description: 'Tu esencia. Tu legado.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${cormorant.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
