import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { signin } from '../services/api';
import { Input, Button, Card, Alert, Loading } from '../components/common';

export function LoginPage() {
  const navigate = useNavigate();
  const { signinSuccess } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors({});

    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setLoading(true);
    try {
      const data = await signin(email, password);
      signinSuccess(data.user, data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Phone List</h1>
        <p className="text-gray-600 text-center mb-6">Sign in to your account</p>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit} data-testid="login-form">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            error={errors.email}
            data-testid="login-email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            error={errors.password}
            data-testid="login-password"
          />

          <Button disabled={loading} className="w-full mb-4" data-testid="login-submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="border-t pt-4">
          <p className="text-center text-sm text-gray-600 mb-3">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <p className="text-center text-sm">
            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
