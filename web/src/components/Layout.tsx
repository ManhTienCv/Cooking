import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-16 min-h-0 bg-gradient-to-b from-blue-50/50 via-white/40 to-indigo-50/50">
        {children}
      </main>
      <Footer />
    </div>
  );
}
