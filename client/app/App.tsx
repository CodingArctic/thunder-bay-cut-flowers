import { useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Data } from './components/Data';
import { Settings } from './components/Settings';
//import { LogOut, Bell } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

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
      
      {/* Top Navigation Bar */}
      <div className="relative z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          {/* Left side navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-6 py-2 rounded transition ${
                currentPage === 'dashboard' 
                  ? 'bg-[#ffd966] text-gray-800' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('data')}
              className={`px-6 py-2 rounded transition ${
                currentPage === 'data' 
                  ? 'bg-[#ffd966] text-gray-800' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Data
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`px-6 py-2 rounded transition ${
                currentPage === 'settings' 
                  ? 'bg-[#ffd966] text-gray-800' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full transition">
              {/* <Bell className="w-5 h-5 text-gray-600" /> */}
            </button>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
              title="Log out"
            >
              {/* <LogOut className="w-5 h-5 text-gray-600" /> */}
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'data' && <Data />}
        {currentPage === 'settings' && <Settings />}
      </div>

      {/* Decorative sunflowers */}
      <div className="absolute bottom-8 right-8 pointer-events-none">
        <svg width="120" height="180" viewBox="0 0 120 180" fill="none">
          {/* Stem and leaves */}
          <rect x="55" y="110" width="10" height="70" fill="#2d7a2e" rx="5"/>
          <ellipse cx="40" cy="140" rx="20" ry="15" fill="#2d7a2e"/>
          <ellipse cx="80" cy="155" rx="20" ry="15" fill="#2d7a2e"/>
          {/* Sunflower */}
          <ellipse cx="60" cy="60" rx="50" ry="50" fill="#4a4a4a"/>
          <ellipse cx="60" cy="15" rx="12" ry="20" fill="#ffd966"/>
          <ellipse cx="60" cy="105" rx="12" ry="20" fill="#ffd966"/>
          <ellipse cx="15" cy="60" rx="20" ry="12" fill="#ffd966"/>
          <ellipse cx="105" cy="60" rx="20" ry="12" fill="#ffd966"/>
          <ellipse cx="25" cy="25" rx="15" ry="17" fill="#ffd966" transform="rotate(-45 25 25)"/>
          <ellipse cx="95" cy="25" rx="15" ry="17" fill="#ffd966" transform="rotate(45 95 25)"/>
          <ellipse cx="25" cy="95" rx="15" ry="17" fill="#ffd966" transform="rotate(45 25 95)"/>
          <ellipse cx="95" cy="95" rx="15" ry="17" fill="#ffd966" transform="rotate(-45 95 95)"/>
        </svg>
      </div>
    </div>
    
  );
}
