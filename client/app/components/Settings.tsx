'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api-request';

interface UserData {
  user_id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

export function Settings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<UserData>('/api/user/me', 'GET');
        setUserData(data);
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load account information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
          <span className="text-xl">⚙️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">SETTINGS</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
            ACCOUNT INFO
          </h2>
          
          {loading ? (
            <div className="mt-6 text-gray-600">Loading account information...</div>
          ) : error ? (
            <div className="mt-6 text-red-600">{error}</div>
          ) : userData ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Full Name</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">
                  {userData.first_name} {userData.last_name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Username</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">{userData.username}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Email</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">{userData.email}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Phone Number</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">
                  {userData.phone_number || 'Not provided'}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Notifications and Data & Device Management */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              NOTIFICATIONS
            </h2>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Watering Needed</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 3 ? 'bg-yellow-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Severe Drought</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 4 ? 'bg-red-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Health Decrease</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Flower Decease</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 5 ? 'bg-purple-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data & Device Management */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              DATA & DEVICE MANAGEMENT
            </h2>
            
            <div className="mt-6 space-y-3">
              <button className="w-full text-left text-gray-700 py-2 border-b border-gray-300 hover:bg-gray-50 transition">
                Linked Devices
              </button>
              <button className="w-full text-left text-gray-700 py-2 border-b border-gray-300 hover:bg-gray-50 transition">
                Privacy Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
