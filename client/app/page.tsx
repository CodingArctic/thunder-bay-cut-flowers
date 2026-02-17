'use client';
import { useState } from 'react';
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { Data } from "./components/Data";
import { Settings } from "./components/Settings";

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard');

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
      
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'data' && <Data />}
        {currentPage === 'settings' && <Settings />}
      </div>
    </div>
  );
}
