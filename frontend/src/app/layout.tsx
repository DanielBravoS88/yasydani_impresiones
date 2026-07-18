import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import StoreShell from '@/components/layout/StoreShell';

export const metadata: Metadata = {
  title: {
    default: 'Yas&Dani Impresiones | Personalizados con amor',
    template: '%s | Yas&Dani Impresiones',
  },
  description:
    'Agendas, cuadros, álbumes y regalos únicos personalizados. Creamos recuerdos para siempre. Envíos a todo Chile.',
  keywords: [
    'agendas personalizadas',
    'cuadros personalizados',
    'regalos Chile',
    'álbumes de fotos',
    'impresiones personalizadas',
  ],
  openGraph: {
    title:       'Yas&Dani Impresiones',
    description: 'Regalos personalizados, agendas, recuerdos y mucho amor 💖',
    locale:      'es_CL',
    type:        'website',
    siteName:    'Yas&Dani Impresiones',
  },
  twitter: {
    card:  'summary_large_image',
    title: 'Yas&Dani Impresiones',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-quicksand text-brand-text" style={{
        background: 'linear-gradient(135deg, #fff1fa, #dcfffb 45%, #fff8df)',
        fontFamily: "'Quicksand', sans-serif",
      }}>
        <AuthProvider>
          <StoreShell>{children}</StoreShell>
        </AuthProvider>
      </body>
    </html>
  );
}
