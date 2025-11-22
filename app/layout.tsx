import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'C1 AI Agent - Generative UI',
  description:
    'Conversational AI agent with C1 Generative UI and multi-provider support',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
