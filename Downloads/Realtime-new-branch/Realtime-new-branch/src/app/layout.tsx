import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import AuthWrapper from './components/AuthWrapper';
import ClientLayout from './components/ClientLayout';
import { Toaster } from "@/app/components/ui/toaster";

const inter = Inter({ subsets: ['latin'] });

// Define the metadata for the layout
export const metadata: Metadata = {
  title: 'ChatChamp.ai',
  description: 'AI-powered chat application',
};

// Define the RootLayout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthWrapper>
          <ClientLayout>{children}</ClientLayout>
        </AuthWrapper>
        <Toaster />
      </body>
    </html>
  );
}
