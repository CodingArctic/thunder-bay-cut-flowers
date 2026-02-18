'use client';

import { useState } from 'react';

type LoginProps = {
  onLogin: () => void;
};

export default function Login({ onLogin }:LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
     onLogin();
  };

  return (
    <div className="min-h-screen bg-[#fef9e6] relative overflow-hidden flex items-center justify-center px-4">
      {/* Decorative sunflower - left */}

      {/* Login Form */}
      <div className="bg-white rounded-lg shadow-lg p-10 w-full max-w-md relative z-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">WELCOME BACK</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Type in username"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Type in password"
              required
            />
          </div>

          <div className='flex gap-4'>
            <button
              type="submit"
              className="w-1/2 mr-2 bg-[#ffd966] text-gray-800 py-3 rounded-lg font-medium hover:bg-[#ffce3d] transition mt-8"
            >
              Log In
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = '/signup')}
              className="w-1/2 bg-[#ffd966] text-gray-800 py-3 rounded-lg font-medium hover:bg-[#ffce3d] transition mt-8"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
