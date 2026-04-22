import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { signout } from '../services/api';

export function LogoutPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        await signout();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        logout();
        navigate('/login');
      }
    })();
  }, [navigate, logout]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you out...</p>
      </div>
    </div>
  );
}
