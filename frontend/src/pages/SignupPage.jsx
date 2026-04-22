import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { signup } from '../services/api';
import { Input, Button, Card, Alert } from '../components/common';

export function SignupPage() {
  const navigate = useNavigate();
  const { signupSuccess } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validatePassword(pwd) {
    const errors = [];
    if (pwd.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('uppercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('number');
    if (!/[!@#$%^&*]/.test(pwd)) errors.push('special character (!@#$%^&*)');
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors({});

    const newErrors = {};

    if (!displayName) newErrors.displayName = 'Display name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      newErrors.password = `Password must contain ${pwdErrors.join(', ')}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const data = await signup(email, password, displayName);
      signupSuccess(data.user, data.access_token);
      navigate('/phones');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Phone List</h1>
        <p className="text-gray-600 text-center mb-6">Create a new account</p>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit} data-testid="signup-form">
          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={setDisplayName}
            placeholder="John Doe"
            error={errors.displayName}
            data-testid="signup-display-name"
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            error={errors.email}
            data-testid="signup-email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            error={errors.password}
            data-testid="signup-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
            error={errors.confirmPassword}
            data-testid="signup-confirm-password"
          />

          <p className="text-xs text-gray-600 mb-4">
            Password must contain: at least 8 characters, uppercase, number, and special character (!@#$%^&*)
          </p>

          <Button disabled={loading} className="w-full mb-4" data-testid="signup-submit">
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="border-t pt-4 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
