'use client';

import Signup from '../components/Signup';

export default function SignupPage() {
  const handleSignup = () => {
    // Redirect after successful signup
    window.location.href = '/';
  };

  return <Signup onSignup={handleSignup} />;
}
