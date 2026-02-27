'use client';
import Login from "../components/Login";

export default function LoginPage() {
  const handleLogin = () => {
    // Redirect to dashboard after login
    window.location.href = '/';
  };

  return <Login onLogin={handleLogin} />;
}
