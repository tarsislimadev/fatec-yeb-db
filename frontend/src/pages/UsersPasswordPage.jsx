import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import { Input, Button, Card, Alert } from '../components/common';
import { Header } from '../components/Header';

export function UsersPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header items={[['Yeb', '/'], ['Forgot Password', '/forgot-password']]} />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-2">Reset Password</h1>
          <p className="text-gray-600 text-center mb-6">Enter your email to receive a password reset link</p>

          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          {success && (
            <Alert
              type="success"
              message="Password reset email sent! Check your inbox."
              onClose={() => setSuccess(false)}
            />
          )}

          {!success ? (
            <form onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />

              <Button disabled={loading} className="w-full mb-4">
                {loading ? 'Sending...' : 'Send Reset Email'}
              </Button>
            </form>
          ) : (
            <Button onClick={() => navigate('/sessions/new')} className="w-full">
              Back to Login
            </Button>
          )}

          <div className="border-t pt-4 text-center text-sm">
            <p className="text-gray-600">
              Remember your password?{' '}
              <Link to="/sessions/new" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
