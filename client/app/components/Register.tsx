'use client';

import { useState } from 'react';
import Link from 'next/link';

type RegisterProps = {
  onRegister: () => void;
};

export default function Register({ onRegister }: RegisterProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    onRegister();
  };

  return (
    <div className="min-h-screen bg-[#fef9e6] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">
          CREATE ACCOUNT
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
            <label className="block text-sm text-gray-600 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Enter first name"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Enter last name"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Enter phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Choose a username"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Create a password"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border-b-2 border-gray-300 focus:border-gray-600 outline-none transition bg-transparent"
              placeholder="Confirm password"
              required
            />
          </div>

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