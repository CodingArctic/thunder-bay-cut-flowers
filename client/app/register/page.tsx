'use client';

import Register from '../components/Register';

export default function RegisterPage() {
  const handleRegister = () => {
    // Redirect after successful registration
    window.location.href = '/';
  };

  return <Register onRegister={handleRegister} />;
}
