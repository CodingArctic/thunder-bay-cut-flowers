'use client';
import { Navbar } from "./Navbar";

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f0eb] relative overflow-hidden">
      {/* Grid background pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `
          linear-gradient(to right, #ffc9c9 1px, transparent 1px),
          linear-gradient(to bottom, #ffc9c9 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />
      
      <Navbar />
      
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {children}
      </div>
    </div>
  );
}
