'use client';
import { Bell, LogOut, LayoutDashboard, Database, Settings as SettingsIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../utils/api-request';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleLogout = () => {
    try {
      apiRequest(`/api/login/logout`, `POST`);
      router.push('/login');
    } catch (error: any) {
      console.log(error);
    }
  };
  
  return (
    <div className="relative z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left side navigation */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${pathname === '/dashboard'
              ? 'bg-[#ffd966] text-gray-800'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}>
            <LayoutDashboard size={18} />
          </Link>
          <Link
            href="/data"
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${pathname === '/data'
              ? 'bg-[#ffd966] text-gray-800'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}>
            <Database size={18} />
          </Link>
          <Link
            href="/settings"
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${pathname === '/settings'
              ? 'bg-[#ffd966] text-gray-800'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}>
            <SettingsIcon size={18} />
          </Link>
        </div>


        <div className="flex items-center gap-3">
          {/* <button 
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Notifications"
          >
            <Bell size={20} className="text-gray-600" />
          </button> */}
          <button
            onClick={handleLogout}
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
