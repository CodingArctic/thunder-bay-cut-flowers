'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../utils/api-request';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username.trim().length < 8 || password.trim().length < 8) {
      setError('Both username and password must be 8+ characters.');
      return;
    }
    try {
      await apiRequest(`/api/login`, `POST`, { username, password });
      router.push('/');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef9e6] relative overflow-hidden flex items-center justify-center px-4">
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
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="jane_doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="s3curePasswordWow!"
              required
            />
          </div>

          <div className='flex gap-4'>
            <button
              type="submit"
              className="w-full bg-[#ffd966] text-gray-800 py-3 rounded-lg font-medium hover:bg-[#ffce3d] transition mt-4"
            >
              Log In
            </button>
          </div>

          {error && (
            <div className='text-red-600'>
              {error}
            </div>
          )}
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need an account?{' '}
            <Link
              href="/register"
              className="text-[#d4a017] font-medium hover:underline"
            >
              Click here!
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
