'use client';
import { Bell, LogOut, LayoutDashboard, Database, Settings as SettingsIcon } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  return (
    <div className="relative z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left side navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${
              currentPage === 'dashboard' 
                ? 'bg-[#ffd966] text-gray-800' 
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}>
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={() => onNavigate('data')}
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${
              currentPage === 'data' 
                ? 'bg-[#ffd966] text-gray-800' 
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}>
            <Database size={18} />
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${
              currentPage === 'settings' 
                ? 'bg-[#ffd966] text-gray-800' 
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}>
            <SettingsIcon size={18} />
          </button>
        </div>

       
        <div className="flex items-center gap-3">
          {/* <button 
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Notifications"
          >
            <Bell size={20} className="text-gray-600" />
          </button> */}
          <button 
            onClick={() => window.location.href = '/login'}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Log out"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
