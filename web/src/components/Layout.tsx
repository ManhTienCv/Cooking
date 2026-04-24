import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navbar />
      <main className="flex-grow pt-16 min-h-0 bg-gradient-to-b from-blue-50/50 via-white/40 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900">
        {children}
      </main>
      <Footer />
    </div>
  );
}
