'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../utils/api-request';
import logo from '../assets/images/thunder-bay-logo.png';


export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6)       formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    else if (digits.length > 3)  formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    else if (digits.length > 0)  formatted = `(${digits}`;
    setPhoneNumber(formatted);
  };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUsername  = username.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName  = lastName.trim();
    const trimmedEmail     = email.trim();
    const trimmedPhone     = phoneNumber.replace(/\D/g, '');

    if (trimmedUsername.length < 4 || password.length < 8) {
      setError('Username must be 4+ characters, and password must be 8+ characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await apiRequest(`/api/register`, `POST`, {
        username: trimmedUsername,
        password,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
      });
      window.location.href = '/login';
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef9e6] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-10 w-full max-w-md">
        <img src={logo.src} alt="Thunder Bay Logo" className="mx-auto mb-8 w-60"/>
        <h1 className="text-2xl font-bold text-gray-800 mb-8">
          CREATE ACCOUNT
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="Jane"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="Doe"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="jane@doe.com"
              maxLength={254}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Phone Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="(585) 555-5555"
              maxLength={14}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="jane_doe"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="Create a password"
              maxLength={128}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 text-gray-500 outline-none transition bg-transparent"
              placeholder="Confirm password"
              maxLength={128}
              required
            />
          </div>

          {error && (
            <div className='text-red-600'>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#ffd966] text-gray-800 py-3 rounded-lg font-medium hover:bg-[#ffce3d] transition mt-4"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
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